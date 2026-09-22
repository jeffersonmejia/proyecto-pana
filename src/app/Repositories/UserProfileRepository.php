<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class UserProfileRepository
{
    private TutorAssignmentRepository $assignments;

    public function __construct(private PDO $connection)
    {
        $this->assignments = new TutorAssignmentRepository($connection);
    }

    public function get(int $userId, string $role): array
    {
        $queries = [
            'coordinator' => 'SELECT position,institutional_phone,is_active FROM coordinators WHERE user_id=?',
            'tutor' => 'SELECT institution,position,is_active FROM tutors WHERE user_id=?',
            'volunteer' => 'SELECT birth_date,address,entry_date,is_active FROM volunteers WHERE user_id=?',
            'beneficiary' => 'SELECT b.birth_date,b.address,b.observations,b.is_active FROM beneficiaries b '
                . 'JOIN people p ON p.id=b.person_id WHERE p.user_id=?',
        ];
        if ($role === 'student') {
            $query = $this->connection->prepare(
                'SELECT u.name university,c.name career,s.process_type,s.hours_required,s.hours_completed,'
                . 's.start_date,s.end_date,s.is_active FROM students s JOIN universities u ON u.id=s.university_id '
                . 'JOIN careers c ON c.id=s.career_id WHERE s.user_id=?'
            );
        } elseif (isset($queries[$role])) {
            $query = $this->connection->prepare($queries[$role]);
        } else {
            return [];
        }
        $query->execute([$userId]);
        $profile = $query->fetch() ?: [];
        if ($role === 'tutor') $profile['student_person_ids'] = $this->assignments->personIds($userId);
        if (isset($profile['is_active'])) $profile['is_active'] = (bool) $profile['is_active'];
        return $profile;
    }

    public function save(int $userId, string $role, array $profile): void
    {
        foreach (['coordinators', 'tutors', 'students', 'volunteers'] as $table) {
            if ($table !== $this->table($role)) {
                $this->connection->prepare("UPDATE {$table} SET is_active=0 WHERE user_id=?")->execute([$userId]);
            }
        }
        if ($role !== 'beneficiary') {
            $this->connection->prepare(
                'UPDATE beneficiaries b JOIN people p ON p.id=b.person_id SET b.is_active=0 WHERE p.user_id=?'
            )->execute([$userId]);
        }
        switch ($role) {
            case 'coordinator': $this->upsert('coordinators', $userId, $profile,
                'position,institutional_phone', 'position=VALUES(position),institutional_phone=VALUES(institutional_phone)', $profile['is_active']); break;
            case 'tutor': $this->upsert('tutors', $userId, $profile,
                'institution,position', 'institution=VALUES(institution),position=VALUES(position)', $profile['is_active']); break;
            case 'student': $this->saveStudent($userId, $profile); break;
            case 'volunteer': $this->upsert('volunteers', $userId, $profile,
                'birth_date,address,entry_date', 'birth_date=VALUES(birth_date),address=VALUES(address),entry_date=VALUES(entry_date)', $profile['is_active']); break;
            case 'beneficiary': $this->saveBeneficiary($userId, $profile); break;
        }
        $this->assignments->replace($userId, $role === 'tutor' ? $profile['student_person_ids'] : []);
    }

    private function upsert(string $table, int $id, array $data, string $columns, string $updates,
        bool $active): void
    {
        $fields = explode(',', $columns);
        $marks = implode(',', array_fill(0, count($fields) + 2, '?'));
        $statement = $this->connection->prepare(
            "INSERT INTO {$table} (user_id,{$columns},is_active) VALUES ({$marks}) "
            . "ON DUPLICATE KEY UPDATE {$updates},is_active=VALUES(is_active)"
        );
        $statement->execute([$id, ...array_map(static fn(string $key) => $data[$key], $fields), (int) $active]);
    }

    private function saveStudent(int $id, array $data): void
    {
        $university = $this->reference('universities', null, $data['university']);
        $career = $this->reference('careers', $university, $data['career']);
        $statement = $this->connection->prepare(
            'INSERT INTO students (user_id,university_id,career_id,process_type,hours_required,'
            . 'hours_completed,start_date,end_date,is_active) VALUES (?,?,?,?,?,?,?,?,?) '
            . 'ON DUPLICATE KEY UPDATE university_id=VALUES(university_id),career_id=VALUES(career_id),'
            . 'process_type=VALUES(process_type),hours_required=VALUES(hours_required),'
            . 'hours_completed=VALUES(hours_completed),start_date=VALUES(start_date),end_date=VALUES(end_date),'
            . 'is_active=VALUES(is_active)'
        );
        $statement->execute([$id, $university, $career, $data['process_type'], $data['hours_required'],
            $data['hours_completed'], $data['start_date'], $data['end_date'], (int) $data['is_active']]);
    }

    private function reference(string $table, ?int $parent, string $name): int
    {
        $sql = $table === 'universities'
            ? 'INSERT INTO universities (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)'
            : 'INSERT INTO careers (university_id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)';
        $this->connection->prepare($sql)->execute($table === 'universities' ? [$name] : [$parent, $name]);
        return (int) $this->connection->lastInsertId();
    }

    private function saveBeneficiary(int $id, array $profile): void
    {
        $find = $this->connection->prepare('SELECT id FROM people WHERE user_id=?');
        $find->execute([$id]);
        $personId = $find->fetchColumn();
        if ($personId === false) return;
        $statement = $this->connection->prepare(
            'INSERT INTO beneficiaries (person_id,birth_date,address,observations,is_active) VALUES (?,?,?,?,?) '
            . 'ON DUPLICATE KEY UPDATE birth_date=VALUES(birth_date),address=VALUES(address),'
            . 'observations=VALUES(observations),is_active=VALUES(is_active)'
        );
        $statement->execute([(int) $personId, $profile['birth_date'], $profile['address'],
            $profile['observations'], (int) $profile['is_active']]);
    }

    private function table(string $role): ?string
    {
        return ['coordinator' => 'coordinators', 'tutor' => 'tutors',
            'student' => 'students', 'volunteer' => 'volunteers'][$role] ?? null;
    }
}
