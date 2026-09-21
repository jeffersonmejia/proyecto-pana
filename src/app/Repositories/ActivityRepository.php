<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;
use Throwable;

final class ActivityRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function participants(string $query): array
    {
        $sql = "SELECT p.id,p.first_name,p.last_name FROM people p JOIN participants t ON t.person_id=p.id WHERE p.status='active'";
        $params = [];
        if ($query !== '') { $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)'; $params = ['%' . $query . '%', '%' . $query . '%']; }
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
        if ($filters['participant_id']) { $where[] = 'ap.participant_id=?'; $params[] = $filters['participant_id']; }
        if ($filters['from']) { $where[] = 'a.start_at>=?'; $params[] = $filters['from']; }
        if ($filters['to']) { $where[] = 'a.start_at<DATE_ADD(?, INTERVAL 1 DAY)'; $params[] = $filters['to']; }
        if ($filters['status'] !== 'all') { $where[] = 'a.status=?'; $params[] = $filters['status']; }
        $sql = $this->selectSql() . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' GROUP BY a.id ORDER BY a.start_at DESC LIMIT 500';
        $query = $this->connection->prepare($sql);
        $query->execute($params);
        return array_map([$this, 'mapActivity'], $query->fetchAll());
    }

    public function find(int $id): ?array
    {
        $query = $this->connection->prepare($this->selectSql() . ' WHERE a.id=? GROUP BY a.id');
        $query->execute([$id]);
        $activity = $query->fetch();
        return $activity ? $this->mapActivity($activity) : null;
    }

    public function create(array $data, int $actor): int
    {
        return $this->transaction(function () use ($data, $actor): int {
            $query = $this->connection->prepare('INSERT INTO activities '
                . '(title,description,responsible,start_at,end_at,status,created_by) VALUES (?,?,?,?,?,?,?)');
            $query->execute([$data['title'], $data['description'] ?: null, $data['responsible'],
                $data['start_at'], $data['end_at'], $data['status'], $actor]);
            $id = (int) $this->connection->lastInsertId();
            $this->syncParticipants($id, $data['participant_ids']);
            $this->addLog($id, null, $actor, 'created', 'Actividad creada.');
            return $id;
        });
    }

    public function update(int $id, array $data, int $actor): void
    {
        $this->transaction(function () use ($id, $data, $actor): void {
            if (!$this->find($id)) throw new RuntimeException('activity_not_found');
            $query = $this->connection->prepare('UPDATE activities SET title=?,description=?,responsible=?,start_at=?,end_at=?,status=? WHERE id=?');
            $query->execute([$data['title'], $data['description'] ?: null, $data['responsible'], $data['start_at'], $data['end_at'], $data['status'], $id]);
            $this->syncParticipants($id, $data['participant_ids']);
            $this->addLog($id, null, $actor, 'updated', 'Actividad y asignaciones actualizadas.');
        });
    }

    public function logs(int $id): array
    {
        $query = $this->connection->prepare('SELECT l.id,l.event_type,l.details,l.created_at,u.email actor_email,'
            . 'p.first_name,p.last_name FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_user_id '
            . 'LEFT JOIN people p ON p.id=l.participant_id WHERE l.activity_id=? ORDER BY l.id DESC');
        $query->execute([$id]);
        return $query->fetchAll();
    }

    public function addObservation(int $activity, ?int $participant, int $actor, string $details): void
    {
        $this->addLog($activity, $participant, $actor, 'observation', $details);
    }

    public function assigned(int $activity, int $participant): bool
    {
        $query = $this->connection->prepare('SELECT 1 FROM activity_participants WHERE activity_id=? AND participant_id=?');
        $query->execute([$activity, $participant]);
        return (bool) $query->fetchColumn();
    }

    private function selectSql(): string
    {
        return "SELECT a.*,GROUP_CONCAT(DISTINCT CONCAT(p.first_name,' ',p.last_name) ORDER BY p.last_name SEPARATOR ', ') participant_names, "
            . 'GROUP_CONCAT(DISTINCT ap.participant_id) participant_ids_csv '
            . 'FROM activities a LEFT JOIN activity_participants ap ON ap.activity_id=a.id '
            . 'LEFT JOIN people p ON p.id=ap.participant_id';
    }

    private function mapActivity(array $activity): array
    {
        $raw = $activity['participant_ids_csv'] ?? '';
        $activity['participant_ids'] = $raw === '' ? [] : array_map('intval', explode(',', $raw));
        unset($activity['participant_ids_csv']);
        return $activity;
    }

    private function syncParticipants(int $id, array $participants): void
    {
        $query = $this->connection->prepare('DELETE FROM activity_participants WHERE activity_id=?');
        $query->execute([$id]);
        $insert = $this->connection->prepare('INSERT INTO activity_participants (activity_id,participant_id) VALUES (?,?)');
        foreach ($participants as $participant) $insert->execute([$id, $participant]);
    }

    private function addLog(int $activity, ?int $participant, int $actor, string $type, string $details): void
    {
        $query = $this->connection->prepare('INSERT INTO activity_logs '
            . '(activity_id,participant_id,actor_user_id,event_type,details) VALUES (?,?,?,?,?)');
        $query->execute([$activity, $participant, $actor, $type, $details]);
    }

    private function transaction(callable $callback): mixed
    {
        $this->connection->beginTransaction();
        try { $result = $callback(); $this->connection->commit(); return $result; }
        catch (Throwable $error) { if ($this->connection->inTransaction()) $this->connection->rollBack(); throw $error; }
    }
}
