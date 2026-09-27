<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class AdminRoleRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function all(int $page = 1): array
    {
        $result = Pagination::fetch($this->connection,
            'SELECT id,code,name,description,is_active FROM roles ORDER BY name',
            'SELECT COUNT(*) FROM roles', [], $page);
        $roles = $result['items'];
        foreach ($roles as &$role) {
            $query = $this->connection->prepare(
                'SELECT p.code FROM permissions p INNER JOIN role_permissions rp '
                . 'ON rp.permission_id = p.id WHERE rp.role_id = :id ORDER BY p.code'
            );
            $query->execute(['id' => $role['id']]);
            $role['permissions'] = array_column($query->fetchAll(), 'code');
            $role['id'] = (int) $role['id'];
            $role['is_active'] = (bool) $role['is_active'];
        }
        $result['items'] = $roles;
        return $result;
    }

    public function permissions(): array
    {
        return $this->connection->query('SELECT code, name FROM permissions ORDER BY code')->fetchAll();
    }

    public function activeOptions(): array
    {
        $options = $this->connection->query(
            'SELECT id,code,name,is_active FROM roles WHERE is_active=1 ORDER BY name'
        )->fetchAll();
        foreach ($options as &$role) {
            $role['id'] = (int) $role['id'];
            $role['is_active'] = (bool) $role['is_active'];
        }
        unset($role);
        return $options;
    }

    public function save(?int $id, string $code, string $name, ?string $description,
        bool $active, array $permissions): int
    {
        return $this->transaction(function () use ($id, $code, $name, $description, $active, $permissions): int {
            if ($id !== null && !$active) {
                $assigned = $this->connection->prepare('SELECT COUNT(*) FROM users WHERE role_id=?');
                $assigned->execute([$id]);
                if ((int) $assigned->fetchColumn() > 0) throw new RuntimeException('role_in_use');
            }
            if ($id === null) {
                $query = $this->connection->prepare(
                    'INSERT INTO roles (code,name,description,is_active) VALUES (:code,:name,:description,:active)'
                );
            } else {
                $query = $this->connection->prepare(
                    'UPDATE roles SET code=:code,name=:name,description=:description,is_active=:active WHERE id=:id'
                );
            }
            $params = ['code' => $code, 'name' => $name, 'description' => $description,
                'active' => (int) $active];
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
        $count = $this->connection->prepare('SELECT COUNT(*) FROM users WHERE role_id = :id');
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
