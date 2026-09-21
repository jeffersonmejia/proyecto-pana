<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;
use Throwable;

final class AdminUserRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function all(): array
    {
        $statement = $this->connection->query(
            'SELECT u.id, u.email, u.is_active, GROUP_CONCAT(r.code ORDER BY r.code) AS role_codes '
            . 'FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id '
            . 'LEFT JOIN roles r ON r.id = ur.role_id GROUP BY u.id ORDER BY u.email'
        );
        return array_map(static function (array $row): array {
            $row['roles'] = $row['role_codes'] ? explode(',', $row['role_codes']) : [];
            unset($row['role_codes']);
            $row['is_active'] = (bool) $row['is_active'];
            return $row;
        }, $statement->fetchAll());
    }

    public function create(string $email, string $passwordHash, array $roles): int
    {
        return $this->transaction(function () use ($email, $passwordHash, $roles): int {
            $statement = $this->connection->prepare(
                'INSERT INTO users (email, password_hash) VALUES (:email, :password)'
            );
            $statement->execute(['email' => $email, 'password' => $passwordHash]);
            $id = (int) $this->connection->lastInsertId();
            $this->replaceRoles($id, $roles);
            return $id;
        });
    }

    public function update(int $id, string $email, ?string $passwordHash, bool $active, array $roles): void
    {
        $this->transaction(function () use ($id, $email, $passwordHash, $active, $roles): void {
            $sql = 'UPDATE users SET email = :email, is_active = :active';
            if ($passwordHash !== null) $sql .= ', password_hash = :password';
            $sql .= ' WHERE id = :id';
            $params = ['id' => $id, 'email' => $email, 'active' => (int) $active];
            if ($passwordHash !== null) $params['password'] = $passwordHash;
            $statement = $this->connection->prepare($sql);
            $statement->execute($params);
            if ($statement->rowCount() === 0 && !$this->exists($id)) {
                throw new RuntimeException('user_not_found');
            }
            if ($passwordHash !== null || !$active) {
                $revoke = $this->connection->prepare(
                    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = :id'
                );
                $revoke->execute(['id' => $id]);
            }
            $this->replaceRoles($id, $roles);
        });
    }

    public function delete(int $id): void
    {
        $statement = $this->connection->prepare('DELETE FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) throw new RuntimeException('user_not_found');
    }

    private function replaceRoles(int $userId, array $codes): void
    {
        $delete = $this->connection->prepare('DELETE FROM user_roles WHERE user_id = :id');
        $delete->execute(['id' => $userId]);
        foreach (array_unique($codes) as $code) {
            $find = $this->connection->prepare('SELECT id FROM roles WHERE code = :code');
            $find->execute(['code' => $code]);
            $roleId = $find->fetchColumn();
            if ($roleId === false) throw new RuntimeException('role_not_found');
            $insert = $this->connection->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
            $insert->execute([$userId, (int) $roleId]);
        }
    }

    private function exists(int $id): bool
    {
        $statement = $this->connection->prepare('SELECT 1 FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->fetchColumn() !== false;
    }

    private function transaction(callable $work): mixed
    {
        $this->connection->beginTransaction();
        try {
            $result = $work();
            $this->connection->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($this->connection->inTransaction()) $this->connection->rollBack();
            throw $exception;
        }
    }
}
