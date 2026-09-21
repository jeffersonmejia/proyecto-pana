<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\AdminRoleRepository;
use PDOException;
use RuntimeException;

final class AdminRoleService
{
    public function __construct(private AdminRoleRepository $roles)
    {
    }

    public function all(): array { return $this->roles->all(); }
    public function permissions(): array { return $this->roles->permissions(); }

    public function save(array $input): array
    {
        $id = isset($input['id']) ? filter_var($input['id'], FILTER_VALIDATE_INT) : null;
        $code = $input['code'] ?? null;
        $name = $input['name'] ?? null;
        $permissions = $input['permissions'] ?? [];
        if (($id !== null && ($id === false || $id < 1))
            || !is_string($code) || !preg_match('/^[a-z0-9_-]{1,80}$/', $code)
            || !is_string($name) || trim($name) === '' || strlen($name) > 120
            || !is_array($permissions) || count($permissions) > 100) {
            throw new ApiException(422, 'invalid_role');
        }
        foreach ($permissions as $permission) {
            if (!is_string($permission) || !preg_match('/^[a-z0-9._:-]{1,120}$/', $permission)) {
                throw new ApiException(422, 'invalid_permissions');
            }
        }
        try {
            return ['id' => $this->roles->save($id === null ? null : (int) $id,
                $code, trim($name), array_values(array_unique($permissions)))];
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'role_code_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'permission_not_found') throw new ApiException(422, 'permission_not_found');
            if ($error->getMessage() === 'role_not_found') throw new ApiException(404, 'role_not_found');
            throw $error;
        }
    }

    public function delete(int $id): void
    {
        try {
            $this->roles->delete($id);
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'role_in_use') throw new ApiException(409, 'role_in_use');
            if ($error->getMessage() === 'role_not_found') throw new ApiException(404, 'role_not_found');
            throw $error;
        }
    }
}
