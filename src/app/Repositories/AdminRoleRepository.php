<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;
use Throwable;

final class AdminRoleRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function all(): array
    {
        $roles = $this->connection->query('SELECT id, code, name FROM roles ORDER BY name')->fetchAll();
        foreach ($roles as &$role) {
            $query = $this->connection->prepare(
                'SELECT p.code FROM permissions p INNER JOIN role_permissions rp '
                . 'ON rp.permission_id = p.id WHERE rp.role_id = :id ORDER BY p.code'
            );
            $query->execute(['id' => $role['id']]);
            $role['permissions'] = array_column($query->fetchAll(), 'code');
            $role['id'] = (int) $role['id'];
        }
        return $roles;
    }

    public function permissions(): array
    {
        return $this->connection->query('SELECT code, name FROM permissions ORDER BY code')->fetchAll();
    }

    public function save(?int $id, string $code, string $name, array $permissions): int
    {
        return $this->transaction(function () use ($id, $code, $name, $permissions): int {
            if ($id === null) {
                $query = $this->connection->prepare('INSERT INTO roles (code, name) VALUES (:code, :name)');
            } else {
                $query = $this->connection->prepare('UPDATE roles SET code = :code, name = :name WHERE id = :id');
            }
            $params = ['code' => $code, 'name' => $name];
            if ($id !== null) $params['id'] = $id;
            $query->execute($params);
            $roleId = $id ?? (int) $this->connection->lastInsertId();
            if ($id !== null && !$this->exists($roleId)) throw new RuntimeException('role_not_found');
            $this->replacePermissions($roleId, $permissions);
            return $roleId;
        });
    }

    public function delete(int $id): void
    {
        $count = $this->connection->prepare('SELECT COUNT(*) FROM user_roles WHERE role_id = :id');
        $count->execute(['id' => $id]);
        if ((int) $count->fetchColumn() > 0) throw new RuntimeException('role_in_use');
        $delete = $this->connection->prepare('DELETE FROM roles WHERE id = :id');
        $delete->execute(['id' => $id]);
        if ($delete->rowCount() === 0) throw new RuntimeException('role_not_found');
    }

    private function replacePermissions(int $roleId, array $codes): void
    {
        $delete = $this->connection->prepare('DELETE FROM role_permissions WHERE role_id = :id');
        $delete->execute(['id' => $roleId]);
        foreach (array_unique($codes) as $code) {
            $find = $this->connection->prepare('SELECT id FROM permissions WHERE code = :code');
            $find->execute(['code' => $code]);
            $permissionId = $find->fetchColumn();
            if ($permissionId === false) throw new RuntimeException('permission_not_found');
            $insert = $this->connection->prepare(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
            );
            $insert->execute([$roleId, (int) $permissionId]);
        }
    }

    private function exists(int $id): bool
    {
        $query = $this->connection->prepare('SELECT 1 FROM roles WHERE id = :id');
        $query->execute(['id' => $id]);
        return $query->fetchColumn() !== false;
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
