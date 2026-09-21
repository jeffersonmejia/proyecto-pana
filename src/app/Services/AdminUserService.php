<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\AdminUserRepository;
use PDOException;
use RuntimeException;

final class AdminUserService
{
    public function __construct(private AdminUserRepository $users, private PasswordService $passwords)
    {
    }

    public function all(): array
    {
        return $this->users->all();
    }

    public function create(array $input): array
    {
        $email = $this->email($input['email'] ?? null);
        $password = $this->password($input['password'] ?? null);
        $roles = $this->roles($input['roles'] ?? []);
        try {
            $id = $this->users->create($email, $this->passwords->hash($password), $roles);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'role_not_found') throw new ApiException(422, 'role_not_found');
            throw $error;
        }
        return ['id' => $id];
    }

    public function update(array $input, int $actorId): void
    {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        $email = $this->email($input['email'] ?? null);
        $active = $input['is_active'] ?? null;
        if ($id === false || $id < 1 || !is_bool($active)) throw new ApiException(422, 'invalid_input');
        if ((int) $id === $actorId && !$active) throw new ApiException(409, 'cannot_disable_self');
        $roles = $this->roles($input['roles'] ?? []);
        $hash = isset($input['password']) && $input['password'] !== ''
            ? $this->passwords->hash($this->password($input['password'])) : null;
        try {
            $this->users->update((int) $id, $email, $hash, $active, $roles);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'role_not_found') throw new ApiException(422, 'role_not_found');
            if ($error->getMessage() === 'user_not_found') throw new ApiException(404, 'user_not_found');
            throw $error;
        }
    }

    public function delete(int $id, int $actorId): void
    {
        if ($id === $actorId) throw new ApiException(409, 'cannot_delete_self');
        try {
            $this->users->delete($id);
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'user_not_found') throw new ApiException(404, 'user_not_found');
            throw $error;
        }
    }

    private function email(mixed $value): string
    {
        if (!is_string($value)) throw new ApiException(422, 'invalid_email');
        $email = strtolower(trim($value));
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(422, 'invalid_email');
        }
        return $email;
    }

    private function password(mixed $value): string
    {
        if (!is_string($value) || strlen($value) < 12 || strlen($value) > 4096) {
            throw new ApiException(422, 'password_must_be_12_chars');
        }
        return $value;
    }

    private function roles(mixed $value): array
    {
        if (!is_array($value) || count($value) > 50) throw new ApiException(422, 'invalid_roles');
        foreach ($value as $role) {
            if (!is_string($role) || !preg_match('/^[a-z0-9_-]{1,80}$/', $role)) {
                throw new ApiException(422, 'invalid_roles');
            }
        }
        return array_values(array_unique($value));
    }
}
