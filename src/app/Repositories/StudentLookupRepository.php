<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class StudentLookupRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function search(string $query, ?int $tutorId = null): array
    {
        $term = '%' . $query . '%';
        $assigned = $tutorId ? ' OR p.id IN (SELECT student_person_id FROM tutor_student_assignments WHERE tutor_user_id=?)' : '';
        $statement = $this->connection->prepare(
            'SELECT p.id,p.ci,p.first_name,p.last_name FROM people p '
            . 'JOIN participants pa ON pa.person_id=p.id AND pa.is_active=1 '
            . 'JOIN users u ON (u.id=p.user_id OR u.ci=p.ci) AND u.is_active=1 '
            . 'JOIN roles r ON r.id=u.role_id AND r.code=\'student\' AND r.is_active=1 '
            . 'JOIN students s ON s.user_id=u.id AND s.is_active=1 '
            . "WHERE ((?<>'' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.ci LIKE ?)){$assigned}) "
            . 'ORDER BY p.last_name,p.first_name LIMIT 50'
        );
        $statement->execute($tutorId ? [$query, $term, $term, $term, $tutorId] : [$query, $term, $term, $term]);
        return $statement->fetchAll();
    }
}
