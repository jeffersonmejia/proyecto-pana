<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class BeneficiaryLookupRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function search(string $query, ?int $linkedPersonId = null): array
    {
        $statement = $this->connection->prepare(
            'SELECT p.id,p.ci,p.first_name,p.last_name,p.email FROM people p '
            . 'JOIN beneficiaries b ON b.person_id=p.id WHERE b.is_active=1 '
            . 'AND (p.user_id IS NULL OR p.id=:linked) '
            . 'AND (p.ci LIKE :ci OR p.first_name LIKE :first OR p.last_name LIKE :last OR p.email LIKE :email) '
            . 'ORDER BY p.last_name,p.first_name LIMIT 5'
        );
        $term = '%' . $query . '%';
        $statement->execute(['linked' => $linkedPersonId ?? 0, 'ci' => $term, 'first' => $term,
            'last' => $term, 'email' => $term]);
        return $statement->fetchAll();
    }
}
