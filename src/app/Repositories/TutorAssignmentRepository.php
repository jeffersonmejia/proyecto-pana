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

    public function personIds(int $tutorId): array
    {
        $query = $this->connection->prepare('SELECT student_person_id FROM tutor_student_assignments WHERE tutor_user_id=? ORDER BY student_person_id');
        $query->execute([$tutorId]);
        return array_map('intval', array_column($query->fetchAll(), 'student_person_id'));
    }

    public function replace(int $tutorId, array $personIds): void
    {
        $personIds = array_values(array_unique(array_map('intval', $personIds)));
        if ($personIds) $this->assertStudents($personIds);
        $this->connection->prepare('DELETE FROM tutor_student_assignments WHERE tutor_user_id=?')->execute([$tutorId]);
        $insert = $this->connection->prepare('INSERT INTO tutor_student_assignments (tutor_user_id,student_person_id) VALUES (?,?)');
        foreach ($personIds as $personId) $insert->execute([$tutorId, $personId]);
    }

    private function assertStudents(array $ids): void
    {
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $query = $this->connection->prepare('SELECT COUNT(DISTINCT p.id) FROM people p '
            . 'JOIN participants pa ON pa.person_id=p.id AND pa.is_active=1 '
            . 'JOIN users u ON (u.id=p.user_id OR u.ci=p.ci) AND u.is_active=1 JOIN roles r ON r.id=u.role_id '
            . "AND r.code='student' AND r.is_active=1 JOIN students s ON s.user_id=u.id AND s.is_active=1 WHERE p.id IN ({$marks})");
        $query->execute($ids);
        if ((int) $query->fetchColumn() !== count($ids)) throw new RuntimeException('invalid_tutor_students');
    }
}
