<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class DocumentRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function entities(string $type, string $query): array
    {
        $queries = [
            'person' => 'SELECT id,CONCAT(first_name," ",last_name) label FROM people WHERE status="active"',
            'activity' => 'SELECT id,title label FROM activities WHERE 1=1',
            'evaluation' => 'SELECT e.id,CONCAT(p.first_name," ",p.last_name," · ",e.evaluated_on) label '
                . 'FROM evaluation_records e JOIN people p ON p.id=e.person_id WHERE 1=1',
        ];
        $sql = $queries[$type]; $params = [];
        if ($query !== '') {
            $column = ['person' => "CONCAT(first_name,' ',last_name)", 'activity' => 'title',
                'evaluation' => "CONCAT(p.first_name,' ',p.last_name)"][$type];
            $sql .= " AND {$column} LIKE ?";
            $params[] = '%' . $query . '%';
        }
        $statement = $this->connection->prepare($sql . ' ORDER BY label LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function entityExists(string $type, int $id): bool
    {
        $table = ['person' => 'people', 'activity' => 'activities', 'evaluation' => 'evaluation_records'][$type];
        $query = $this->connection->prepare("SELECT 1 FROM {$table} WHERE id=?");
        $query->execute([$id]);
        return (bool) $query->fetchColumn();
    }

    public function all(string $type, ?int $entityId): array
    {
        $sql = 'SELECT d.id,d.entity_type,d.entity_id,d.original_name,d.mime_type,d.file_size,d.created_at,u.email uploader '
            . 'FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by WHERE d.entity_type=?';
        $params = [$type];
        if ($entityId) { $sql .= ' AND d.entity_id=?'; $params[] = $entityId; }
        $query = $this->connection->prepare($sql . ' ORDER BY d.created_at DESC LIMIT 500');
        $query->execute($params);
        return $query->fetchAll();
    }

    public function create(array $data, int $actor): int
    {
        $query = $this->connection->prepare('INSERT INTO documents '
            . '(entity_type,entity_id,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (?,?,?,?,?,?,?)');
        $query->execute([$data['entity_type'], $data['entity_id'], $data['original_name'], $data['stored_name'],
            $data['mime_type'], $data['file_size'], $actor]);
        return (int) $this->connection->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $query = $this->connection->prepare('SELECT * FROM documents WHERE id=?');
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function delete(int $id): void
    {
        $query = $this->connection->prepare('DELETE FROM documents WHERE id=?');
        $query->execute([$id]);
    }
}
