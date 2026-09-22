<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\AdminUserRepository;
use App\Repositories\BeneficiaryLookupRepository;
use App\Validators\UserProfileInputValidator;
use PDOException;
use RuntimeException;

final class AdminUserService
{
    public function __construct(private AdminUserRepository $users, private PasswordService $passwords,
        private UserProfileInputValidator $profiles, private BeneficiaryLookupRepository $beneficiaries)
    {
    }

    public function all(mixed $requestedPage = 1): array
    {
        return $this->users->all(\App\Support\Pagination::page($requestedPage));
    }

    public function create(array $input): array
    {
        $user = $this->identity($input);
        $password = $this->password($input['password'] ?? null);
        $roles = $this->roles($input['roles'] ?? []);
        $profile = $this->profiles->validate($roles[0], $input['profile'] ?? []);
        $personId = $this->beneficiaryPersonId($roles[0], $input['person_id'] ?? null);
        try {
            $id = $this->users->create($user, $this->passwords->hash($password), $roles, $profile, $personId);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_or_ci_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'role_not_found') throw new ApiException(422, 'role_not_found_or_inactive');
            if ($error->getMessage() === 'beneficiary_person_not_linkable') throw new ApiException(409, 'beneficiary_person_not_linkable');
            if ($error->getMessage() === 'invalid_tutor_students') throw new ApiException(422, 'invalid_tutor_students');
            throw $error;
        }
        return ['id' => $id];
    }

    public function update(array $input, int $actorId): void
    {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        $user = $this->identity($input);
        $active = $input['is_active'] ?? null;
        if ($id === false || $id < 1 || !is_bool($active)) throw new ApiException(422, 'invalid_input');
        if ((int) $id === $actorId && !$active) throw new ApiException(409, 'cannot_disable_self');
        $roles = $this->roles($input['roles'] ?? []);
        $profile = $this->profiles->validate($roles[0], $input['profile'] ?? []);
        $personId = $this->beneficiaryPersonId($roles[0], $input['person_id'] ?? null);
        $hash = isset($input['password']) && $input['password'] !== ''
            ? $this->passwords->hash($this->password($input['password'])) : null;
        try {
        $this->users->update((int) $id, $user, $hash, $active, $roles, $profile, $personId);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_or_ci_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'role_not_found') throw new ApiException(422, 'role_not_found_or_inactive');
            if ($error->getMessage() === 'user_not_found') throw new ApiException(404, 'user_not_found');
            if ($error->getMessage() === 'beneficiary_person_not_linkable') throw new ApiException(409, 'beneficiary_person_not_linkable');
            if ($error->getMessage() === 'invalid_tutor_students') throw new ApiException(422, 'invalid_tutor_students');
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

    private function identity(array $input): array
    {
        $ci = $input['ci'] ?? null;
        $first = $input['first_name'] ?? null;
        $last = $input['last_name'] ?? null;
        $phone = $input['phone'] ?? '';
        if (!is_string($ci) || !preg_match('/^[A-Za-z0-9-]{5,20}$/', trim($ci))) {
            throw new ApiException(422, 'invalid_ci');
        }
        foreach (['first_name' => $first, 'last_name' => $last] as $field => $value) {
            if (!is_string($value) || trim($value) === '' || strlen($value) > 100) {
                throw new ApiException(422, 'invalid_' . $field);
            }
        }
        if (!is_string($phone) || strlen($phone) > 40
            || ($phone !== '' && !preg_match('/^[+0-9() .-]+$/', $phone))) {
            throw new ApiException(422, 'invalid_phone');
        }
        return ['ci' => trim($ci), 'first_name' => trim($first), 'last_name' => trim($last),
            'email' => $this->email($input['email'] ?? null), 'phone' => trim($phone) ?: null];
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
        if (!is_array($value) || count($value) !== 1) throw new ApiException(422, 'one_role_required');
        foreach ($value as $role) {
            if (!is_string($role) || !preg_match('/^[a-z0-9_-]{1,80}$/', $role)) {
                throw new ApiException(422, 'invalid_roles');
            }
        }
        return array_values(array_unique($value));
    }

    public function beneficiaryPeople(mixed $query, mixed $personId): array
    {
        if (!is_string($query) || strlen(trim($query)) < 2 || strlen($query) > 100) {
            throw new ApiException(422, 'beneficiary_search_too_short');
        }
        $id = $personId === null || $personId === '' ? null : filter_var($personId, FILTER_VALIDATE_INT);
        if ($id === false || ($id !== null && $id < 1)) throw new ApiException(422, 'invalid_person_id');
        return $this->beneficiaries->search(trim($query), $id === null ? null : (int) $id);
    }

    private function beneficiaryPersonId(string $role, mixed $value): ?int
    {
        if ($role !== 'beneficiary') return null;
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(422, 'beneficiary_person_required');
        return (int) $id;
    }
}
