<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;

final class DocumentRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function entities(string $type, string $query, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::document($type, $type === 'person' ? 'p.id' : ($type === 'activity' ? 'a.id' : 'e.id'), $actor);
        $queries = [
            'person' => 'SELECT p.id,CONCAT(p.first_name," ",p.last_name) label FROM people p WHERE p.status="active" AND ' . $scope['sql'],
            'activity' => 'SELECT a.id,a.title label FROM activities a WHERE 1=1 AND ' . $scope['sql'],
            'evaluation' => 'SELECT e.id,CONCAT(p.first_name," ",p.last_name," · ",e.evaluated_on) label '
                . 'FROM evaluation_records e JOIN people p ON p.id=e.person_id WHERE ' . $scope['sql'],
        ];
        $sql = $queries[$type]; $params = [];
        if ($query !== '') {
            $column = ['person' => "CONCAT(p.first_name,' ',p.last_name)", 'activity' => 'a.title',
                'evaluation' => "CONCAT(p.first_name,' ',p.last_name)"][$type];
            $sql .= " AND {$column} LIKE ?";
            $params[] = '%' . $query . '%';
        }
        $statement = $this->connection->prepare($sql . ' ORDER BY label LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function entityExists(string $type, int $id, array $actor = []): bool
    {
        $tables = ['person' => ['people p', 'p.id', \App\Support\AccessScope::document('person', 'p.id', $actor)['sql']],
            'activity' => ['activities a', 'a.id', \App\Support\AccessScope::document('activity', 'a.id', $actor)['sql']],
            'evaluation' => ['evaluation_records e', 'e.id', \App\Support\AccessScope::evaluation('e.person_id', $actor)['sql']]];
        [$table, $idColumn, $scope] = $tables[$type];
        $query = $this->connection->prepare("SELECT 1 FROM {$table} WHERE {$idColumn}=? AND {$scope}");
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    public function all(string $type, ?int $entityId, int $page, array $actor = []): array
    {
        $scope = \App\Support\AccessScope::document($type, 'd.entity_id', $actor);
        $sql = 'SELECT d.id,d.entity_type,d.entity_id,d.original_name,d.mime_type,d.file_size,d.created_at,u.email uploader '
            . 'FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by WHERE d.entity_type=? AND ' . $scope['sql'];
        $params = [$type];
        if ($entityId) { $sql .= ' AND d.entity_id=?'; $params[] = $entityId; }
        return Pagination::fetch($this->connection, $sql . ' ORDER BY d.created_at DESC',
            'SELECT COUNT(*) FROM documents d WHERE d.entity_type=? AND ' . $scope['sql'] . ($entityId ? ' AND d.entity_id=?' : ''), $params, $page);
    }

    public function create(array $data, int $actor): int
    {
        $query = $this->connection->prepare('INSERT INTO documents '
            . '(entity_type,entity_id,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (?,?,?,?,?,?,?)');
        $query->execute([$data['entity_type'], $data['entity_id'], $data['original_name'], $data['stored_name'],
            $data['mime_type'], $data['file_size'], $actor]);
        return (int) $this->connection->lastInsertId();
    }

    public function find(int $id, array $actor = []): ?array
    {
        $person = \App\Support\AccessScope::document('person', 'd.entity_id', $actor)['sql'];
        $activity = \App\Support\AccessScope::document('activity', 'd.entity_id', $actor)['sql'];
        $evaluation = \App\Support\AccessScope::document('evaluation', 'd.entity_id', $actor)['sql'];
        $query = $this->connection->prepare('SELECT d.* FROM documents d WHERE d.id=? AND '
            . "((d.entity_type='person' AND {$person}) OR (d.entity_type='activity' AND {$activity}) "
            . "OR (d.entity_type='evaluation' AND {$evaluation}))");
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function delete(int $id): void
    {
        $query = $this->connection->prepare('DELETE FROM documents WHERE id=?');
        $query->execute([$id]);
    }
}
