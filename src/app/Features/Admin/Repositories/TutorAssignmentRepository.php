<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;

final class TutorAssignmentRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function personIds(int $tecnicoId): array
    {
        $query = $this->connection->prepare('SELECT student_person_id FROM tecnico_student_assignments WHERE tecnico_user_id=? ORDER BY student_person_id');
        $query->execute([$tecnicoId]);
        return array_map('intval', array_column($query->fetchAll(), 'student_person_id'));
    }

    public function replace(int $tecnicoId, array $personIds): void
    {
        $personIds = array_values(array_unique(array_map('intval', $personIds)));
        if ($personIds) $this->assertStudents($personIds);
        $this->connection->prepare('DELETE FROM tecnico_student_assignments WHERE tecnico_user_id=?')->execute([$tecnicoId]);
        $insert = $this->connection->prepare('INSERT INTO tecnico_student_assignments (tecnico_user_id,student_person_id) VALUES (?,?)');
        foreach ($personIds as $personId) $insert->execute([$tecnicoId, $personId]);
    }

    private function assertStudents(array $ids): void
    {
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $query = $this->connection->prepare('SELECT COUNT(DISTINCT p.id) FROM people p '
            . 'JOIN participants pa ON pa.person_id=p.id AND pa.is_active=1 '
            . 'JOIN users u ON (u.id=p.user_id OR u.ci=p.ci) AND u.is_active=1 JOIN roles r ON r.id=u.role_id '
            . "AND r.code='student' AND r.is_active=1 JOIN students s ON s.user_id=u.id AND s.is_active=1 WHERE p.id IN ({$marks})");
        $query->execute($ids);
        if ((int) $query->fetchColumn() !== count($ids)) throw new RuntimeException('invalid_tecnico_students');
    }
}
