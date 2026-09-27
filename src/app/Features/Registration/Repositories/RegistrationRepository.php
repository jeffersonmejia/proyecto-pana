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
            $roleCode = $registration['role'];
            $roleQuery = $this->connection->prepare('SELECT id FROM roles WHERE code=? AND is_active=1');
            $roleQuery->execute([$roleCode]);
            $role = $roleQuery->fetchColumn();
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
            if ($roleCode === 'student') $this->saveStudent($userId, $registration);
            else $this->connection->prepare('INSERT INTO beneficiaries (person_id,is_active) VALUES (?,1)')->execute([$personId]);
            $this->saveRegistration($userId, $personId, $registration);
            $this->saveWelcomeNotification($userId, $user['first_name'], $roleCode);
            $this->connection->commit();
        } catch (Throwable $error) {
            if ($this->connection->inTransaction()) $this->connection->rollBack();
            throw $error;
        }
    }

    public function duplicateIdentity(string $ci, string $email, string $phone = ''): ?string
    {
        foreach (['users', 'people'] as $table) {
            $query = $this->connection->prepare("SELECT ci,email,phone FROM {$table} WHERE ci=? OR email=? OR (phone IS NOT NULL AND phone=?) LIMIT 1");
            $query->execute([$ci, $email, $phone]);
            $existing = $query->fetch(PDO::FETCH_ASSOC);
            if (!$existing) continue;
            $ciMatch = (string)$existing['ci'] === $ci;
            $emailMatch = strtolower((string)$existing['email']) === strtolower($email);
            $phoneMatch = $phone !== '' && (string)$existing['phone'] === $phone;
            if ($ciMatch && $emailMatch) return 'registration_duplicate_ci_email';
            if ($ciMatch) return 'registration_duplicate_ci';
            if ($emailMatch) return 'registration_duplicate_email';
            if ($phoneMatch) return 'registration_duplicate_phone';
        }
        return null;
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

    private function saveRegistration(int $userId, int $personId, array $data): void
    {
        $query = $this->connection->prepare(
            'INSERT INTO beneficiary_registrations (user_id,person_id,course,birth_date,birth_province,birth_city,gender,self_identification,has_disability,disability_type,address,sector,latitude,longitude,institution,career,education,level,motivation,skills,volunteer_experience,volunteer_details,available_days,available_schedules,terms_accepted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,1)'
        );
        $query->execute([$userId, $personId, $data['course'], $data['birth_date'], $data['birth_province'], $data['birth_city'], $data['gender'], $data['self_identification'], $data['has_disability'], $data['disability_type'], $data['address'], $data['sector'], $data['latitude'], $data['longitude'], $data['institution'], $data['career'], $data['education'], $data['level'], $data['motivation'], $data['skills'], $data['volunteer'], $data['volunteer_details'], json_encode($data['days']), json_encode($data['schedules'])]);
    }

    private function saveStudent(int $userId, array $data): void
    {
        $this->connection->prepare('INSERT INTO universities (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)')->execute([$data['institution']]);
        $universityId = (int) $this->connection->lastInsertId();
        $this->connection->prepare('INSERT INTO careers (university_id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)')->execute([$universityId, $data['career']]);
        $careerId = (int) $this->connection->lastInsertId();
        $query = $this->connection->prepare('INSERT INTO students (user_id,university_id,career_id,process_type,hours_required,start_date,is_active) VALUES (?,?,?,?,0,CURRENT_DATE,1)');
        $query->execute([$userId, $universityId, $careerId, 'Estudiante']);
    }

    private function saveWelcomeNotification(int $userId, string $name, string $role): void
    {
        $message = $role === 'student'
            ? "Hola {$name}. Ahora podrás consultar cursos, actividades y oportunidades de participación."
            : "Hola {$name}. Ahora podrás consultar cursos y actividades disponibles del Proyecto PANA.";
        $query = $this->connection->prepare(
            'INSERT INTO notifications (user_id,type,title,message,action_url) VALUES (?,?,?,?,?)'
        );
        $query->execute([$userId, 'welcome', '¡Felicidades! Bienvenido al Proyecto PANA', $message, '/notificaciones']);
    }

}
