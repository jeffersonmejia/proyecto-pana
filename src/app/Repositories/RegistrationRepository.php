<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Throwable;

final class RegistrationRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function create(array $user, array $registration, string $passwordHash): void
    {
        $this->connection->beginTransaction();
        try {
            $role = $this->connection->query("SELECT id FROM roles WHERE code='beneficiary' AND is_active=1")->fetchColumn();
            if ($role === false) throw new \RuntimeException('role_not_found');
            $userQuery = $this->connection->prepare(
                'INSERT INTO users (ci,first_name,last_name,email,phone,password_hash,role_id,is_active) VALUES (?,?,?,?,?,?,?,1)'
            );
            $userQuery->execute([$user['ci'], $user['first_name'], $user['last_name'], $user['email'], $user['phone'], $passwordHash, $role]);
            $userId = (int) $this->connection->lastInsertId();
            $this->connection->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$userId, $role]);
            $personQuery = $this->connection->prepare(
                "INSERT INTO people (user_id,ci,first_name,last_name,email,phone,status) VALUES (?,?,?,?,?,?, 'active')"
            );
            $personQuery->execute([$userId, $user['ci'], $user['first_name'], $user['last_name'], $user['email'], $user['phone']]);
            $personId = (int) $this->connection->lastInsertId();
            $this->connection->prepare('INSERT INTO beneficiaries (person_id,is_active) VALUES (?,1)')->execute([$personId]);
            $this->saveRegistration($userId, $personId, $registration);
            $this->enrollCourse($personId, $registration['course']);
            $this->connection->commit();
        } catch (Throwable $error) {
            if ($this->connection->inTransaction()) $this->connection->rollBack();
            throw $error;
        }
    }

    public function publicCourses(): array
    {
        $query = $this->connection->query(
            "SELECT c.id,c.name,c.description,c.start_date,c.end_date,c.max_participants,
                    COUNT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_count
             FROM courses c
             LEFT JOIN course_participants cp ON cp.course_id=c.id
             WHERE c.status='active' AND CURDATE() BETWEEN c.start_date AND c.end_date
             GROUP BY c.id
             ORDER BY c.start_date,c.name"
        );
        $today = new \DateTimeImmutable('today');
        return array_map(function (array $course) use ($today): array {
            $count = (int) $course['participant_count'];
            $capacity = (int) $course['max_participants'];
            $slots = $capacity === 0 ? null : max(0, $capacity - $count);
            return [
                'id' => (int) $course['id'], 'name' => $course['name'], 'description' => $course['description'],
                'start_date' => $course['start_date'], 'end_date' => $course['end_date'],
                'max_participants' => $capacity, 'participant_count' => $count,
                'available_slots' => $slots, 'is_available' => $capacity === 0 || $count < $capacity,
                'availability_label' => $capacity === 0 ? 'Cupos disponibles' : ($slots . ' cupos disponibles'),
            ];
        }, $query->fetchAll());
    }

    public function courseIsEligible(string $course): bool
    {
        $query = $this->connection->prepare(
            "SELECT c.max_participants,COUNT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_count
             FROM courses c LEFT JOIN course_participants cp ON cp.course_id=c.id
             WHERE c.name=? AND c.status='active' AND CURDATE() BETWEEN c.start_date AND c.end_date
             GROUP BY c.id"
        );
        $query->execute([$course]); $row = $query->fetch();
        return is_array($row) && ((int) $row['max_participants'] === 0 || (int) $row['participant_count'] < (int) $row['max_participants']);
    }

    private function saveRegistration(int $userId, int $personId, array $data): void
    {
        $query = $this->connection->prepare(
            'INSERT INTO beneficiary_registrations (user_id,person_id,course,birth_date,gender,address,institution,career,level,motivation,skills,volunteer_experience,volunteer_details,available_days,available_schedules,terms_accepted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)'
        );
        $query->execute([$userId, $personId, $data['course'], $data['birth_date'], $data['gender'], $data['address'], $data['institution'], $data['career'], $data['level'], $data['motivation'], $data['skills'], $data['volunteer'], $data['volunteer_details'], json_encode($data['days']), json_encode($data['schedules'])]);
    }

    private function enrollCourse(int $personId, string $course): void
    {
        $query = $this->connection->prepare("INSERT INTO course_participants (course_id,person_id,status) SELECT id,?,'active' FROM courses WHERE name=? AND status='active' ON DUPLICATE KEY UPDATE status='active',enrolled_at=CURRENT_TIMESTAMP");
        $query->execute([$personId, $course]);
    }
}
