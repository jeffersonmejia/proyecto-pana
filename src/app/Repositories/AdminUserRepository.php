<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use App\Support\Pagination;
use RuntimeException;
use Throwable;

final class AdminUserRepository
{
    private UserProfileRepository $profiles;

    public function __construct(private PDO $connection)
    {
        $this->profiles = new UserProfileRepository($connection);
    }

    public function all(int $page = 1): array
    {
        $result = Pagination::fetch($this->connection,
            'SELECT u.id,u.ci,u.first_name,u.last_name,u.phone,u.email,u.is_active,u.last_login_at,'
            . 'r.code role_code,p.id person_id FROM users u INNER JOIN roles r ON r.id=u.role_id '
            . 'LEFT JOIN people p ON p.user_id=u.id ORDER BY u.email',
            'SELECT COUNT(*) FROM users', [], $page);
        $result['items'] = array_map(static function (array $row): array {
            $row['roles'] = [$row['role_code']];
            unset($row['role_code']);
            $row['is_active'] = (bool) $row['is_active'];
            return $row;
        }, $result['items']);
        foreach ($result['items'] as &$user) {
            $user['profile'] = $this->profiles->get((int) $user['id'], $user['roles'][0] ?? '');
        }
        unset($user);
        return $result;
    }

    public function create(array $user, string $passwordHash, array $roles, array $profile, ?int $personId): int
    {
        return $this->transaction(function () use ($user, $passwordHash, $roles, $profile, $personId): int {
            $roleId = $this->roleId($roles[0]);
            $statement = $this->connection->prepare(
                'INSERT INTO users (ci,first_name,last_name,email,phone,password_hash,role_id) '
                . 'VALUES (:ci,:first_name,:last_name,:email,:phone,:password,:role_id)'
            );
            $statement->execute($user + ['password' => $passwordHash, 'role_id' => $roleId]);
            $id = (int) $this->connection->lastInsertId();
            $this->syncLegacyRole($id, $roleId);
            $this->syncPerson($id, $user, $roles[0] === 'beneficiary', $personId);
            $this->profiles->save($id, $roles[0], $profile);
            return $id;
        });
    }

    public function update(int $id, array $user, ?string $passwordHash, bool $active,
        array $roles, array $profile, ?int $personId): void
    {
        $this->transaction(function () use ($id, $user, $passwordHash, $active, $roles, $profile, $personId): void {
            $roleId = $this->roleId($roles[0]);
            $oldIdentity = $this->connection->prepare('SELECT ci FROM users WHERE id=? FOR UPDATE');
            $oldIdentity->execute([$id]);
            $previousCi = $oldIdentity->fetchColumn();
            $sql = 'UPDATE users SET ci=:ci,first_name=:first_name,last_name=:last_name,'
                . 'email=:email,phone=:phone,is_active=:active,role_id=:role_id';
            if ($passwordHash !== null) $sql .= ', password_hash = :password';
            $sql .= ' WHERE id = :id';
            $params = $user + ['id' => $id, 'active' => (int) $active, 'role_id' => $roleId];
            if ($passwordHash !== null) $params['password'] = $passwordHash;
            $statement = $this->connection->prepare($sql);
            $statement->execute($params);
            if ($statement->rowCount() === 0 && !$this->exists($id)) {
                throw new RuntimeException('user_not_found');
            }
            $this->syncLegacyRole($id, $roleId);
            if ($passwordHash !== null || !$active) {
                $revoke = $this->connection->prepare(
                    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = :id'
                );
                $revoke->execute(['id' => $id]);
            }
            $this->syncPerson($id, $user, $roles[0] === 'beneficiary', $personId,
                $previousCi === false ? null : (string) $previousCi);
            $this->profiles->save($id, $roles[0], $profile);
        });
    }

    private function syncPerson(int $id, array $user, bool $beneficiary, ?int $personId,
        ?string $previousCi = null): void
    {
        if ($beneficiary) {
            if ($personId === null) throw new RuntimeException('beneficiary_person_required');
            $find = $this->connection->prepare(
                'SELECT p.id FROM people p JOIN beneficiaries b ON b.person_id=p.id '
                . 'WHERE p.id=? AND (p.user_id IS NULL OR p.user_id=?) FOR UPDATE'
            );
            $find->execute([$personId, $id]);
            if ($find->fetchColumn() === false) throw new RuntimeException('beneficiary_person_not_linkable');
            $this->connection->prepare('UPDATE beneficiaries b JOIN people p ON p.id=b.person_id '
                . 'SET b.is_active=0 WHERE p.user_id=? AND p.id<>?')->execute([$id, $personId]);
            $this->connection->prepare('UPDATE people SET user_id=NULL WHERE user_id=? AND id<>?')
                ->execute([$id, $personId]);
            $link = $this->connection->prepare(
                'UPDATE people SET user_id=?,ci=?,first_name=?,last_name=?,email=?,phone=? WHERE id=?'
            );
            $link->execute([$id, $user['ci'], $user['first_name'], $user['last_name'], $user['email'],
                $user['phone'], $personId]);
            return;
        }
        $statement = $this->connection->prepare(
            'UPDATE people SET user_id=?,ci=?,first_name=?,last_name=?,email=?,phone=? '
            . 'WHERE user_id=? OR (user_id IS NULL AND (ci=? OR ci=?))'
        );
        $statement->execute([$id, $user['ci'], $user['first_name'], $user['last_name'],
            $user['email'], $user['phone'], $id, $user['ci'], $previousCi]);
    }

    public function delete(int $id): void
    {
        $statement = $this->connection->prepare('DELETE FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) throw new RuntimeException('user_not_found');
    }

    private function roleId(string $code): int
    {
        $find = $this->connection->prepare('SELECT id FROM roles WHERE code=? AND is_active=1');
        $find->execute([$code]);
        $id = $find->fetchColumn();
        if ($id === false) throw new RuntimeException('role_not_found');
        return (int) $id;
    }

    private function syncLegacyRole(int $userId, int $roleId): void
    {
        $this->connection->prepare('DELETE FROM user_roles WHERE user_id=?')->execute([$userId]);
        $this->connection->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')
            ->execute([$userId, $roleId]);
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
