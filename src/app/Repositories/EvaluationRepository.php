<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class EvaluationRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function people(string $type, string $query, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::person('p.id', $actor);
        $table = $type === 'participant' ? 'participants' : 'beneficiaries';
        $sql = "SELECT p.id,p.first_name,p.last_name FROM people p JOIN {$table} x ON x.person_id=p.id WHERE p.status='active' AND x.is_active=1 AND {$scope['sql']}";
        $params = [];
        if ($query !== '') { $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)'; $params = ['%' . $query . '%', '%' . $query . '%']; }
        $statement = $this->connection->prepare($sql . ' ORDER BY p.last_name,p.first_name LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function hasRole(int $id, string $type): bool
    {
        $table = $type === 'participant' ? 'participants' : 'beneficiaries';
        $query = $this->connection->prepare("SELECT 1 FROM {$table} WHERE person_id=? AND is_active=1");
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    public function criteria(bool $activeOnly = false): array
    {
        $rows = $this->connection->query('SELECT id,name,description,is_active FROM evaluation_criteria '
            . ($activeOnly ? 'WHERE is_active=1 ' : '') . 'ORDER BY name')->fetchAll();
        return array_map(static function (array $row): array {
            $row['id'] = (int) $row['id'];
            $row['is_active'] = (bool) $row['is_active'];
            return $row;
        }, $rows);
    }

    public function createCriterion(array $data): int
    {
        $query = $this->connection->prepare('INSERT INTO evaluation_criteria (name,description) VALUES (?,?)');
        $query->execute([$data['name'], $data['description'] ?: null]);
        return (int) $this->connection->lastInsertId();
    }

    public function updateCriterion(int $id, array $data, bool $active): void
    {
        $query = $this->connection->prepare('UPDATE evaluation_criteria SET name=?,description=?,is_active=? WHERE id=?');
        $query->execute([$data['name'], $data['description'] ?: null, (int) $active, $id]);
        if ($query->rowCount() === 0 && !$this->criterionExists($id)) throw new RuntimeException('criterion_not_found');
    }

    public function all(array $filters): array
    {
        $where = ['e.evaluation_type=?']; $params = [$filters['type']];
        $scope = \App\Support\AccessScope::person('e.person_id', $filters['_scope'] ?? []);
        $where[] = $scope['sql'];
        $role = ($filters['_scope']['roles'][0] ?? '');
        if ($role === 'beneficiary') $where[] = "e.evaluation_type='satisfaction'";
        if (in_array($role, ['student', 'tutor'], true)) $where[] = "e.evaluation_type='participant'";
        if ($filters['person_id']) { $where[] = 'e.person_id=?'; $params[] = $filters['person_id']; }
        if ($filters['from']) { $where[] = 'e.evaluated_on>=?'; $params[] = $filters['from']; }
        if ($filters['to']) { $where[] = 'e.evaluated_on<=?'; $params[] = $filters['to']; }
        $condition = ' WHERE ' . implode(' AND ', $where);
        $result = Pagination::fetch($this->connection,
            $this->selectSql() . $condition . ' GROUP BY e.id ORDER BY e.evaluated_on DESC',
            'SELECT COUNT(*) FROM evaluation_records e' . $condition, $params,
            Pagination::page($filters['page'] ?? 1));
        $result['items'] = array_map([$this, 'mapRecord'], $result['items']);
        return $result;
    }

    public function find(int $id, array $actor = []): ?array
    {
        $scope = \App\Support\AccessScope::person('e.person_id', $actor);
        $type = ($actor['roles'][0] ?? '') === 'beneficiary' ? " AND e.evaluation_type='satisfaction'" : '';
        if (in_array($actor['roles'][0] ?? '', ['student', 'tutor'], true)) $type = " AND e.evaluation_type='participant'";
        $query = $this->connection->prepare($this->selectSql() . " WHERE e.id=? AND {$scope['sql']}{$type} GROUP BY e.id");
        $query->execute([$id]); $row = $query->fetch();
        if (!$row) return null;
        $record = $this->mapRecord($row);
        $answers = $this->connection->prepare('SELECT a.criterion_id,a.score,a.note,c.name criterion_name '
            . 'FROM evaluation_answers a JOIN evaluation_criteria c ON c.id=a.criterion_id WHERE a.evaluation_id=? ORDER BY c.name');
        $answers->execute([$id]); $record['answers'] = $answers->fetchAll();
        $record['answers'] = array_map(static function (array $answer): array {
            $answer['criterion_id'] = (int) $answer['criterion_id'];
            $answer['score'] = (int) $answer['score'];
            return $answer;
        }, $record['answers']);
        return $record;
    }

    public function create(array $data, int $actor): int
    {
        return $this->transaction(function () use ($data, $actor): int {
            $query = $this->connection->prepare('INSERT INTO evaluation_records '
                . '(evaluation_type,person_id,evaluated_on,satisfaction_score,observations,created_by) VALUES (?,?,?,?,?,?)');
            $query->execute([$data['type'], $data['person_id'], $data['evaluated_on'], $data['satisfaction_score'], $data['observations'] ?: null, $actor]);
            $id = (int) $this->connection->lastInsertId(); $this->syncAnswers($id, $data['answers']); return $id;
        });
    }

    public function update(int $id, array $data, array $actor): void
    {
        $this->transaction(function () use ($id, $data, $actor): void {
            $old = $this->find($id, $actor);
            if (!$old) throw new RuntimeException('evaluation_not_found');
            $query = $this->connection->prepare('UPDATE evaluation_records SET person_id=?,evaluated_on=?,satisfaction_score=?,observations=? WHERE id=?');
            $query->execute([$data['person_id'], $data['evaluated_on'], $data['satisfaction_score'], $data['observations'] ?: null, $id]);
            $this->syncAnswers($id, $data['answers']);
        });
    }

    private function selectSql(): string
    {
        return 'SELECT e.*,p.first_name,p.last_name,CASE WHEN e.evaluation_type="satisfaction" THEN e.satisfaction_score '
            . 'ELSE ROUND(AVG(a.score),2) END average_score,COUNT(a.criterion_id) criterion_count '
            . 'FROM evaluation_records e JOIN people p ON p.id=e.person_id '
            . 'LEFT JOIN evaluation_answers a ON a.evaluation_id=e.id';
    }

    private function mapRecord(array $record): array
    {
        $record['average_score'] = $record['average_score'] === null ? null : (float) $record['average_score'];
        $record['criterion_count'] = (int) $record['criterion_count'];
        $record['id'] = (int) $record['id'];
        return $record;
    }

    private function syncAnswers(int $id, array $answers): void
    {
        $delete = $this->connection->prepare('DELETE FROM evaluation_answers WHERE evaluation_id=?'); $delete->execute([$id]);
        $insert = $this->connection->prepare('INSERT INTO evaluation_answers (evaluation_id,criterion_id,score,note) VALUES (?,?,?,?)');
        foreach ($answers as $answer) $insert->execute([$id, $answer['criterion_id'], $answer['score'], $answer['note'] ?? null]);
    }

    public function personInScope(int $id, array $actor): bool
    {
        $scope = \App\Support\AccessScope::person('p.id', $actor);
        $query = $this->connection->prepare('SELECT 1 FROM people p WHERE p.id=? AND ' . $scope['sql']);
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    private function criterionExists(int $id): bool
    {
        $query = $this->connection->prepare('SELECT 1 FROM evaluation_criteria WHERE id=?'); $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    private function transaction(callable $work): mixed
    {
        $this->connection->beginTransaction();
        try { $result = $work(); $this->connection->commit(); return $result; }
        catch (Throwable $error) { if ($this->connection->inTransaction()) $this->connection->rollBack(); throw $error; }
    }
}
