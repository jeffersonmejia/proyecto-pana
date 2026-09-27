<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class UserRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function findForLogin(string $email): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT id,ci,first_name,last_name,phone,email,password_hash,is_active '
            . 'FROM users WHERE email = :email LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        return $user === false ? null : $user;
    }

    public function findActiveById(int $id): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT u.id,u.ci,u.first_name,u.last_name,u.phone,u.email,u.is_active,u.last_login_at, '
            . '(SELECT br.gender FROM beneficiary_registrations br WHERE br.user_id=u.id ORDER BY br.id DESC LIMIT 1) gender '
            . 'FROM users u WHERE u.id = :id AND u.is_active = 1 LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();
        return $user === false ? null : $user;
    }

    public function recordLogin(int $id): void
    {
        $statement = $this->connection->prepare('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?');
        $statement->execute([$id]);
    }

    public function phoneExists(string $phone, int $exceptId): bool
    {
        $statement = $this->connection->prepare('SELECT 1 FROM users u LEFT JOIN people p ON p.user_id=u.id '
            . 'WHERE COALESCE(u.phone,p.phone)=? AND u.id<>? LIMIT 1');
        $statement->execute([$phone, $exceptId]);
        return $statement->fetchColumn() !== false;
    }

    public function profile(int $id): ?array
    {
        $query = $this->connection->prepare('SELECT u.id,u.ci,u.first_name,u.last_name,u.phone,u.email, '
            . 'COALESCE(b.birth_date,br.birth_date) birth_date,COALESCE(b.address,br.address) address,b.observations, '
            . 'br.birth_province,br.birth_city,br.gender,br.self_identification,br.has_disability,br.disability_type,br.sector,br.education '
            . 'FROM users u LEFT JOIN people p ON p.user_id=u.id LEFT JOIN beneficiaries b ON b.person_id=p.id AND b.is_active=1 '
            . 'LEFT JOIN beneficiary_registrations br ON br.person_id=p.id WHERE u.id=? AND u.is_active=1 LIMIT 1');
        $query->execute([$id]);
        $row = $query->fetch();
        return $row === false ? null : $row;
    }

    public function updateProfile(int $id, array $profile, bool $beneficiary): void
    {
        $this->connection->beginTransaction();
        try {
            $this->connection->prepare('UPDATE users SET first_name=?,last_name=?,phone=?,email=? WHERE id=?')
                ->execute([$profile['first_name'],$profile['last_name'],$profile['phone'],$profile['email'],$id]);
            $this->connection->prepare('UPDATE people SET first_name=?,last_name=?,phone=?,email=? WHERE user_id=?')
                ->execute([$profile['first_name'],$profile['last_name'],$profile['phone'],$profile['email'],$id]);
            $person = $this->connection->prepare('SELECT id FROM people WHERE user_id=? LIMIT 1');
            $person->execute([$id]); $personId = $person->fetchColumn();
            if ($personId !== false) {
                if ($beneficiary) {
                    $this->connection->prepare('INSERT INTO beneficiaries (person_id,birth_date,address,observations,is_active) VALUES (?,?,?,?,1) ON DUPLICATE KEY UPDATE birth_date=VALUES(birth_date),address=VALUES(address),observations=VALUES(observations)')
                        ->execute([$personId,$profile['birth_date'],$profile['address'],$profile['observations']]);
                }
                $this->connection->prepare('UPDATE beneficiary_registrations SET birth_date=?,birth_province=?,birth_city=?,gender=?,self_identification=?,has_disability=?,disability_type=?,address=?,sector=?,education=? WHERE person_id=? ORDER BY id DESC LIMIT 1')
                    ->execute([$profile['birth_date'],$profile['birth_province'],$profile['birth_city'],$profile['gender'],$profile['self_identification'],$profile['has_disability'],$profile['disability_type'],$profile['address'],$profile['sector'],$profile['education'],$personId]);
            }
            $this->connection->commit();
        } catch (\Throwable $error) { if ($this->connection->inTransaction()) $this->connection->rollBack(); throw $error; }
    }
}
