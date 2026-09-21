<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;
use Throwable;

final class PeopleRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function all(array $filters): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $table = $filters['type'] === 'participant' ? 'participants' : 'beneficiaries';
            $where[] = "EXISTS (SELECT 1 FROM {$table} t WHERE t.person_id = p.id)";
        }
        if (!empty($filters['q'])) {
            $where[] = '(p.first_name LIKE :q_first OR p.last_name LIKE :q_last OR p.email LIKE :q_email OR p.phone LIKE :q_phone)';
            $term = '%' . $filters['q'] . '%';
            $params += ['q_first' => $term, 'q_last' => $term, 'q_email' => $term, 'q_phone' => $term];
        }
        if (!empty($filters['id'])) {
            $where[] = 'p.id = :id';
            $params['id'] = $filters['id'];
        }
        $sql = 'SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.status, p.created_at, '
            . "GROUP_CONCAT(DISTINCT CASE WHEN pa.person_id IS NOT NULL THEN 'participant' END) AS participant, "
            . "GROUP_CONCAT(DISTINCT CASE WHEN b.person_id IS NOT NULL THEN 'beneficiary' END) AS beneficiary "
            . 'FROM people p LEFT JOIN participants pa ON pa.person_id = p.id '
            . 'LEFT JOIN beneficiaries b ON b.person_id = p.id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY p.id ORDER BY p.last_name, p.first_name';
        $query = $this->connection->prepare($sql);
        $query->execute($params);
        return array_map([$this, 'mapPerson'], $query->fetchAll());
    }

    public function find(int $id): ?array
    {
        return $this->all(['id' => $id])[0] ?? null;
    }

    public function create(array $person, int $actorId): int
    {
        return $this->transaction(function () use ($person, $actorId): int {
            $query = $this->connection->prepare(
                'INSERT INTO people (first_name,last_name,email,phone,status) VALUES (?,?,?,?,?)'
            );
            $query->execute([$person['first_name'], $person['last_name'], $person['email'], $person['phone'], $person['status']]);
            $id = (int) $this->connection->lastInsertId();
            $this->syncTypes($id, $person['types']);
            $this->addHistory($id, $actorId, 'created', 'Registro creado.');
            return $id;
        });
    }

    public function update(int $id, array $person, int $actorId): void
    {
        $this->transaction(function () use ($id, $person, $actorId): void {
            $current = $this->find($id);
            if ($current === null) throw new RuntimeException('person_not_found');
            $query = $this->connection->prepare(
                'UPDATE people SET first_name=?,last_name=?,email=?,phone=?,status=? WHERE id=?'
            );
            $query->execute([$person['first_name'], $person['last_name'], $person['email'], $person['phone'], $person['status'], $id]);
            $this->syncTypes($id, $person['types']);
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

    private function syncTypes(int $id, array $types): void
    {
        foreach (['participants' => 'participant', 'beneficiaries' => 'beneficiary'] as $table => $type) {
            $delete = $this->connection->prepare("DELETE FROM {$table} WHERE person_id=?");
            $delete->execute([$id]);
            if (in_array($type, $types, true)) {
                $insert = $this->connection->prepare("INSERT INTO {$table} (person_id) VALUES (?)");
                $insert->execute([$id]);
            }
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
