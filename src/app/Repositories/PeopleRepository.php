<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class PeopleRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function all(array $filters): array
    {
        $where = ['(EXISTS (SELECT 1 FROM participants px WHERE px.person_id=p.id) '
            . 'OR EXISTS (SELECT 1 FROM beneficiaries bx WHERE bx.person_id=p.id))'];
        $params = [];
        $scope = \App\Support\AccessScope::person('p.id', $filters['_scope'] ?? []);
        $where[] = $scope['sql'];
        $params += $scope['params'];
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $table = $filters['type'] === 'participant' ? 'participants' : 'beneficiaries';
            $where[] = "EXISTS (SELECT 1 FROM {$table} t WHERE t.person_id=p.id AND t.is_active=1)";
        }
        if (!empty($filters['q'])) {
            $where[] = '(p.first_name LIKE :q_first OR p.last_name LIKE :q_last OR p.email LIKE :q_email OR p.phone LIKE :q_phone OR p.ci LIKE :q_ci)';
            $term = '%' . $filters['q'] . '%';
            $params += ['q_first' => $term, 'q_last' => $term, 'q_email' => $term, 'q_phone' => $term, 'q_ci' => $term];
        }
        if (!empty($filters['id'])) {
            $where[] = 'p.id = :id';
            $params['id'] = $filters['id'];
        }
        $sql = 'SELECT p.id,p.ci,p.first_name,p.last_name,p.email,p.phone,p.status,p.created_at,p.user_id, '
            . 'b.birth_date,b.address,b.observations, '
            . "GROUP_CONCAT(DISTINCT CASE WHEN pa.is_active=1 THEN 'participant' END) AS participant, "
            . "GROUP_CONCAT(DISTINCT CASE WHEN b.is_active=1 THEN 'beneficiary' END) AS beneficiary "
            . 'FROM people p LEFT JOIN participants pa ON pa.person_id = p.id '
            . 'LEFT JOIN beneficiaries b ON b.person_id = p.id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY p.id ORDER BY p.last_name, p.first_name';
        $countSql = 'SELECT COUNT(*) FROM people p' . ($where ? ' WHERE ' . implode(' AND ', $where) : '');
        $result = Pagination::fetch($this->connection, $sql, $countSql, $params,
            Pagination::page($filters['page'] ?? 1));
        $result['items'] = array_map([$this, 'mapPerson'], $result['items']);
        return $result;
    }

    public function find(int $id, array $actor = []): ?array
    {
        return $this->all(['id' => $id, '_scope' => $actor])['items'][0] ?? null;
    }

    public function create(array $person, int $actorId): int
    {
        return $this->transaction(function () use ($person, $actorId): int {
            $query = $this->connection->prepare(
                'INSERT INTO people (ci,first_name,last_name,email,phone,status) VALUES (?,?,?,?,?,?)'
            );
            $query->execute([$person['ci'], $person['first_name'], $person['last_name'],
                $person['email'], $person['phone'], $person['status']]);
            $id = (int) $this->connection->lastInsertId();
            $this->syncAccount($id, $person);
            $this->syncTypes($id, $person);
            $this->addHistory($id, $actorId, 'created', 'Registro creado.');
            return $id;
        });
    }

    public function update(int $id, array $person, int $actorId): void
    {
        $this->transaction(function () use ($id, $person, $actorId): void {
            $current = $this->find($id, ['roles' => ['admin']]);
            if ($current === null) throw new RuntimeException('person_not_found');
            if ($current['user_id'] !== null && ($person['ci'] === null || $person['email'] === null)) {
                throw new RuntimeException('linked_account_identity_required');
            }
            $query = $this->connection->prepare(
                'UPDATE people SET ci=?,first_name=?,last_name=?,email=?,phone=?,status=? WHERE id=?'
            );
            $query->execute([$person['ci'], $person['first_name'], $person['last_name'],
                $person['email'], $person['phone'], $person['status'], $id]);
            $this->syncAccount($id, $person);
            $this->syncTypes($id, $person);
            $event = $current['status'] === $person['status'] ? 'updated' : 'status_changed';
            $this->addHistory($id, $actorId, $event, 'Registro actualizado.');
        });
    }

    public function delete(int $id): void
    {
        $query = $this->connection->prepare('DELETE FROM people WHERE id=?');
        $query->execute([$id]);
        if ($query->rowCount() === 0) throw new RuntimeException('person_not_found');
    }

    private function syncAccount(int $id, array $person): void
    {
        $this->connection->prepare('UPDATE users u JOIN people p ON p.user_id=u.id '
            . 'OR (p.user_id IS NULL AND p.ci=u.ci) '
            . 'SET p.user_id=u.id,u.ci=p.ci,u.first_name=p.first_name,u.last_name=p.last_name,u.email=p.email,u.phone=p.phone '
            . 'WHERE p.id=?')->execute([$id]);
    }

    private function syncTypes(int $id, array $person): void
    {
        $participant = in_array('participant', $person['types'], true);
        $this->connection->prepare('INSERT INTO participants (person_id,is_active) VALUES (?,?) '
            . 'ON DUPLICATE KEY UPDATE is_active=VALUES(is_active)')->execute([$id, (int) $participant]);
        $beneficiary = in_array('beneficiary', $person['types'], true);
        if ($beneficiary) {
            $this->connection->prepare('INSERT INTO beneficiaries '
                . '(person_id,birth_date,address,observations,is_active) VALUES (?,?,?,?,1) '
                . 'ON DUPLICATE KEY UPDATE birth_date=VALUES(birth_date),address=VALUES(address),'
                . 'observations=VALUES(observations),is_active=1')->execute([$id, $person['birth_date'],
                    $person['address'], $person['observations']]);
        } else {
            $this->connection->prepare('UPDATE beneficiaries SET is_active=0 WHERE person_id=?')->execute([$id]);
        }
    }

    private function addHistory(int $id, int $actor, string $event, string $details): void
    {
        $query = $this->connection->prepare(
            'INSERT INTO person_history (person_id,actor_user_id,event_type,details) VALUES (?,?,?,?)'
        );
        $query->execute([$id, $actor, $event, $details]);
    }

    private function mapPerson(array $row): array
    {
        $row['types'] = array_values(array_filter([
            $row['participant'] ? 'participant' : null,
            $row['beneficiary'] ? 'beneficiary' : null,
        ]));
        $row['has_account'] = $row['user_id'] !== null;
        unset($row['user_id']);
        unset($row['participant'], $row['beneficiary']);
        return $row;
    }

    private function transaction(callable $work): mixed
    {
        $this->connection->beginTransaction();
        try {
            $result = $work();
            $this->connection->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->connection->inTransaction()) $this->connection->rollBack();
            throw $error;
        }
    }
}
