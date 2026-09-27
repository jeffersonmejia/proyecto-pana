<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class ActivityRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function participants(string $query, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::person('p.id', $actor);
        $sql = "SELECT p.id,p.first_name,p.last_name FROM people p JOIN participants t ON t.person_id=p.id WHERE p.status='active' AND t.is_active=1 AND {$scope['sql']}";
        $params = [];
        if ($query !== '') { $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)'; $params = ['%' . $query . '%', '%' . $query . '%']; }
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
        $actor = $filters['_scope'] ?? [];
        $where[] = \App\Support\AccessScope::activity('a.id', $actor)['sql'];
        if ($filters['participant_id']) { $where[] = 'ap.participant_id=?'; $params[] = $filters['participant_id']; }
        if ($filters['from']) { $where[] = 'a.start_at>=?'; $params[] = $filters['from']; }
        if ($filters['to']) { $where[] = 'a.start_at<DATE_ADD(?, INTERVAL 1 DAY)'; $params[] = $filters['to']; }
        if ($filters['status'] !== 'all') { $where[] = 'a.status=?'; $params[] = $filters['status']; }
        $condition = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $page = Pagination::page($filters['page'] ?? 1);
        $result = Pagination::fetch($this->connection,
            $this->selectSql($actor) . $condition . ' GROUP BY a.id ORDER BY a.start_at DESC',
            'SELECT COUNT(DISTINCT a.id) FROM activities a LEFT JOIN activity_participants ap ON ap.activity_id=a.id AND '
                . \App\Support\AccessScope::person('ap.participant_id', $actor)['sql'] . $condition,
            $params, $page);
        $result['items'] = array_map([$this, 'mapActivity'], $result['items']);
        return $result;
    }

    public function find(int $id, array $actor = []): ?array
    {
        $scope = \App\Support\AccessScope::activity('a.id', $actor);
        $query = $this->connection->prepare($this->selectSql($actor) . " WHERE a.id=? AND {$scope['sql']} GROUP BY a.id");
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

    public function update(int $id, array $data, int $actor, array $scopeActor = []): void
    {
        $this->transaction(function () use ($id, $data, $actor, $scopeActor): void {
            if (!$this->find($id, $scopeActor)) throw new RuntimeException('activity_not_found');
            if (!$this->allParticipantsInScope($id, $scopeActor)) throw new RuntimeException('activity_has_out_of_scope_participants');
            $query = $this->connection->prepare('UPDATE activities SET title=?,description=?,responsible=?,start_at=?,end_at=?,status=? WHERE id=?');
            $query->execute([$data['title'], $data['description'] ?: null, $data['responsible'], $data['start_at'], $data['end_at'], $data['status'], $id]);
            $this->syncParticipants($id, $data['participant_ids']);
            $this->addLog($id, null, $actor, 'updated', 'Actividad y asignaciones actualizadas.');
        });
    }

    public function logs(int $id, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::person('l.participant_id', $actor);
        $query = $this->connection->prepare('SELECT l.id,l.event_type,l.details,l.created_at,u.email actor_email,'
            . 'p.first_name,p.last_name FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_user_id '
            . 'LEFT JOIN people p ON p.id=l.participant_id WHERE l.activity_id=? AND (l.participant_id IS NULL OR '
            . $scope['sql'] . ') ORDER BY l.id DESC');
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

    public function allParticipantsInScope(int $activity, array $actor): bool
    {
        $scope = \App\Support\AccessScope::person('ap.participant_id', $actor);
        $query = $this->connection->prepare('SELECT COUNT(*) total, SUM(CASE WHEN ' . $scope['sql']
            . ' THEN 1 ELSE 0 END) allowed FROM activity_participants ap WHERE ap.activity_id=?');
        $query->execute([$activity]);
        $counts = $query->fetch();
        return (int) $counts['total'] === (int) $counts['allowed'];
    }

    private function selectSql(array $actor): string
    {
        $scope = \App\Support\AccessScope::person('ap.participant_id', $actor);
        return "SELECT a.*,GROUP_CONCAT(DISTINCT CONCAT(p.first_name,' ',p.last_name) ORDER BY p.last_name SEPARATOR ', ') participant_names, "
            . 'GROUP_CONCAT(DISTINCT ap.participant_id) participant_ids_csv '
            . 'FROM activities a LEFT JOIN activity_participants ap ON ap.activity_id=a.id AND ' . $scope['sql'] . ' '
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
