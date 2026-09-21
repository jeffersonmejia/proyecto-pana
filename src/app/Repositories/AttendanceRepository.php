<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;
use Throwable;

final class AttendanceRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function participants(string $query): array
    {
        $sql = 'SELECT p.id,p.first_name,p.last_name FROM people p JOIN participants t ON t.person_id=p.id '
            . "WHERE p.status='active'";
        $params = [];
        if ($query !== '') {
            $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)';
            $params = ['%' . $query . '%', '%' . $query . '%'];
        }
        $statement = $this->connection->prepare($sql . ' ORDER BY p.last_name,p.first_name LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function isParticipant(int $id): bool
    {
        $query = $this->connection->prepare('SELECT 1 FROM participants WHERE person_id=?');
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    public function all(array $filters): array
    {
        $where = [];
        $params = [];
        foreach (['participant_id' => 'a.participant_id =', 'from' => 'a.attendance_date >=', 'to' => 'a.attendance_date <='] as $key => $column) {
            if (empty($filters[$key])) continue;
            $where[] = $column . ' ?';
            $params[] = $filters[$key];
        }
        if ($filters['status'] !== 'all') { $where[] = 'a.status = ?'; $params[] = $filters['status']; }
        $sql = $this->selectSql() . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY a.attendance_date DESC,p.last_name,p.first_name LIMIT 500';
        $statement = $this->connection->prepare($sql);
        $statement->execute($params);
        return array_map([$this, 'mapRecord'], $statement->fetchAll());
    }

    public function find(int $id): ?array
    {
        $statement = $this->connection->prepare($this->selectSql() . ' WHERE a.id=?');
        $statement->execute([$id]);
        $row = $statement->fetch();
        return $row ? $this->mapRecord($row) : null;
    }

    public function create(array $data, int $actor): int
    {
        return $this->transaction(function () use ($data, $actor): int {
            $statement = $this->connection->prepare('INSERT INTO attendance_records '
                . '(participant_id,attendance_date,status,check_in,check_out,note,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?)');
            $statement->execute([$data['participant_id'], $data['attendance_date'], $data['status'], $data['check_in'],
                $data['check_out'], $data['note'] ?: null, $actor, $actor]);
            $id = (int) $this->connection->lastInsertId();
            $this->log($id, $actor, 'created', null, $data, null);
            return $id;
        });
    }

    public function update(int $id, array $data, int $actor): void
    {
        $this->transaction(function () use ($id, $data, $actor): void {
            $old = $this->find($id);
            if (!$old) throw new RuntimeException('attendance_not_found');
            $statement = $this->connection->prepare('UPDATE attendance_records SET participant_id=?,attendance_date=?,status=?,'
                . 'check_in=?,check_out=?,note=?,updated_by=? WHERE id=?');
            $statement->execute([$data['participant_id'], $data['attendance_date'], $data['status'], $data['check_in'],
                $data['check_out'], $data['note'] ?: null, $actor, $id]);
            $this->log($id, $actor, 'corrected', $old, $data, $data['correction_reason']);
        });
    }

    public function history(int $id): array
    {
        $query = $this->connection->prepare('SELECT h.*,u.email actor_email FROM attendance_history h '
            . 'LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.attendance_id=? ORDER BY h.id DESC');
        $query->execute([$id]);
        return $query->fetchAll();
    }

    private function selectSql(): string
    {
        return 'SELECT a.*,p.first_name,p.last_name,TIMESTAMPDIFF(MINUTE,a.check_in,a.check_out) total_minutes '
            . 'FROM attendance_records a JOIN participants t ON t.person_id=a.participant_id '
            . 'JOIN people p ON p.id=a.participant_id';
    }

    private function mapRecord(array $row): array
    {
        $row['total_minutes'] = $row['total_minutes'] === null ? null : (int) $row['total_minutes'];
        $row['hours'] = $row['total_minutes'] === null ? null : round($row['total_minutes'] / 60, 2);
        return $row;
    }

    private function log(int $id, int $actor, string $event, ?array $old, array $new, ?string $reason): void
    {
        $query = $this->connection->prepare('INSERT INTO attendance_history '
            . '(attendance_id,actor_user_id,event_type,old_values,new_values,correction_reason) VALUES (?,?,?,?,?,?)');
        $query->execute([$id, $actor, $event, $old ? json_encode($old) : null, json_encode($new), $reason]);
    }

    private function transaction(callable $callback): mixed
    {
        $this->connection->beginTransaction();
        try { $result = $callback(); $this->connection->commit(); return $result; }
        catch (Throwable $error) { if ($this->connection->inTransaction()) $this->connection->rollBack(); throw $error; }
    }
}
