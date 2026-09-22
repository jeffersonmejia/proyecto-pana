<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class PermissionRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function forUser(int $userId): array
    {
        $roles = $this->connection->prepare(
            'SELECT r.code FROM roles r INNER JOIN users u ON u.role_id=r.id '
            . 'WHERE u.id=:id AND r.is_active=1'
        );
        $roles->execute(['id' => $userId]);

        $permissions = $this->connection->prepare(
            'SELECT DISTINCT p.code FROM permissions p '
            . 'INNER JOIN role_permissions rp ON rp.permission_id = p.id '
            . 'INNER JOIN roles r ON r.id=rp.role_id '
            . 'INNER JOIN users u ON u.role_id=r.id WHERE u.id=:id AND r.is_active=1'
        );
        $permissions->execute(['id' => $userId]);

        return [
            'roles' => array_column($roles->fetchAll(), 'code'),
            'permissions' => array_column($permissions->fetchAll(), 'code'),
        ];
    }

    public function userHasPermission(int $userId, string $permission): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1 FROM users u '
            . 'INNER JOIN role_permissions rp ON rp.role_id = u.role_id '
            . 'INNER JOIN permissions p ON p.id = rp.permission_id '
            . 'INNER JOIN roles r ON r.id = u.role_id '
            . 'WHERE u.id = :user_id AND p.code = :permission '
            . 'AND u.is_active = 1 AND r.is_active=1 LIMIT 1'
        );
        $statement->execute(['user_id' => $userId, 'permission' => $permission]);
        return $statement->fetchColumn() !== false;
    }
}
