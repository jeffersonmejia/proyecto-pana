<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class AttendanceRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function participants(string $query, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::person('p.id', $actor);
        $sql = 'SELECT p.id,p.first_name,p.last_name FROM people p JOIN participants t ON t.person_id=p.id '
            . "WHERE p.status='active' AND t.is_active=1 AND {$scope['sql']}";
        $params = [];
        if ($query !== '') {
            $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)';
            $params = ['%' . $query . '%', '%' . $query . '%'];
        }
        $statement = $this->connection->prepare($sql . ' ORDER BY p.last_name,p.first_name LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function isParticipant(int $id, array $actor = []): bool
    {
        $scope = \App\Support\AccessScope::person('p.id', $actor);
        $query = $this->connection->prepare('SELECT 1 FROM participants t JOIN people p ON p.id=t.person_id '
            . "WHERE t.person_id=? AND t.is_active=1 AND {$scope['sql']}");
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    public function all(array $filters): array
    {
        $where = [];
        $params = [];
        $scope = \App\Support\AccessScope::person('a.participant_id', $filters['_scope'] ?? []);
        $where[] = $scope['sql'];
        foreach (['participant_id' => 'a.participant_id =', 'from' => 'a.attendance_date >=', 'to' => 'a.attendance_date <='] as $key => $column) {
            if (empty($filters[$key])) continue;
            $where[] = $column . ' ?';
            $params[] = $filters[$key];
        }
        if ($filters['status'] !== 'all') { $where[] = 'a.status = ?'; $params[] = $filters['status']; }
        $condition = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $page = Pagination::page($filters['page'] ?? 1);
        $result = Pagination::fetch($this->connection,
            $this->selectSql() . $condition . ' ORDER BY a.attendance_date DESC,p.last_name,p.first_name',
            'SELECT COUNT(*) FROM attendance_records a' . $condition, $params, $page);
        $result['items'] = array_map([$this, 'mapRecord'], $result['items']);
        return $result;
    }

    public function find(int $id, array $actor = []): ?array
    {
        $scope = \App\Support\AccessScope::person('a.participant_id', $actor);
        $statement = $this->connection->prepare($this->selectSql() . " WHERE a.id=? AND {$scope['sql']}");
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

    public function update(int $id, array $data, int $actor, array $scopeActor = []): void
    {
        $this->transaction(function () use ($id, $data, $actor, $scopeActor): void {
            $old = $this->find($id, $scopeActor);
            if (!$old) throw new RuntimeException('attendance_not_found');
            $statement = $this->connection->prepare('UPDATE attendance_records SET participant_id=?,attendance_date=?,status=?,'
                . 'check_in=?,check_out=?,note=?,updated_by=? WHERE id=?');
            $statement->execute([$data['participant_id'], $data['attendance_date'], $data['status'], $data['check_in'],
                $data['check_out'], $data['note'] ?: null, $actor, $id]);
            $this->log($id, $actor, 'corrected', $old, $data, $data['correction_reason']);
        });
    }

    public function checkOut(int $participant,string $date,string $time,int $actor): void
    {
        $this->transaction(function() use($participant,$date,$time,$actor): void {
            $query=$this->connection->prepare('SELECT * FROM attendance_records WHERE participant_id=? AND attendance_date=? FOR UPDATE');
            $query->execute([$participant,$date]); $old=$query->fetch();
            if(!$old) throw new RuntimeException('attendance_entry_required');
            if($old['check_out']!==null) throw new RuntimeException('attendance_exit_exists');
            if($old['check_in']===null) throw new RuntimeException('attendance_entry_required');
            if($time<=$old['check_in']) throw new RuntimeException('invalid_attendance_range');
            $statement=$this->connection->prepare('UPDATE attendance_records SET check_out=?,updated_by=? WHERE id=? AND check_out IS NULL');
            $statement->execute([$time,$actor,$old['id']]); $new=$old; $new['check_out']=$time; $new['updated_by']=$actor;
            $this->log((int)$old['id'],$actor,'check_out',$old,$new,null);
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
