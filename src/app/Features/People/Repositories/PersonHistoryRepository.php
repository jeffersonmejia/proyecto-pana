<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class PersonHistoryRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function forPerson(int $personId): array
    {
        $query = $this->connection->prepare(
            'SELECT h.id,h.event_type,h.details,h.created_at,u.email AS actor_email '
            . 'FROM person_history h LEFT JOIN users u ON u.id=h.actor_user_id '
            . 'WHERE h.person_id=? ORDER BY h.created_at DESC,h.id DESC'
        );
        $query->execute([$personId]);
        return $query->fetchAll();
    }

    public function addNote(int $personId, int $actorId, string $note): void
    {
        $query = $this->connection->prepare(
            "INSERT INTO person_history (person_id,actor_user_id,event_type,details) VALUES (?,?, 'note', ?)"
        );
        $query->execute([$personId, $actorId, $note]);
    }
}
