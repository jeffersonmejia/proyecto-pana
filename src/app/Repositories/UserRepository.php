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
            'SELECT id, email, password_hash, is_active FROM users WHERE email = :email LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        return $user === false ? null : $user;
    }

    public function findActiveById(int $id): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT id, email, is_active FROM users WHERE id = :id AND is_active = 1 LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();
        return $user === false ? null : $user;
    }
}
