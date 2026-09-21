<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Throwable;

final class RefreshTokenRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function create(int $userId, string $tokenHash, string $familyId, string $expiresAt): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO refresh_tokens (token_hash, family_id, user_id, expires_at) '
            . 'VALUES (:hash, :family, :user_id, :expires)'
        );
        $statement->execute([
            'hash' => $tokenHash, 'family' => $familyId,
            'user_id' => $userId, 'expires' => $expiresAt,
        ]);
    }

    public function rotate(string $oldHash, string $newHash, string $expiresAt): ?array
    {
        $this->connection->beginTransaction();
        try {
            $select = $this->connection->prepare(
                'SELECT family_id, user_id, expires_at, revoked_at FROM refresh_tokens '
                . 'WHERE token_hash = :hash FOR UPDATE'
            );
            $select->execute(['hash' => $oldHash]);
            $token = $select->fetch();
            if ($token === false || strtotime((string) $token['expires_at'] . ' UTC') <= time()) {
                $this->connection->commit();
                return null;
            }

            if ($token['revoked_at'] !== null) {
                $this->revokeFamily((string) $token['family_id']);
                $this->connection->commit();
                return null;
            }

            $update = $this->connection->prepare(
                'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(), replaced_by_hash = :replacement '
                . 'WHERE token_hash = :hash'
            );
            $update->execute(['replacement' => $newHash, 'hash' => $oldHash]);
            $this->create((int) $token['user_id'], $newHash, (string) $token['family_id'], $expiresAt);
            $this->connection->commit();
            return ['user_id' => (int) $token['user_id'], 'family_id' => $token['family_id']];
        } catch (Throwable $exception) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            throw $exception;
        }
    }

    public function revokeFamilyForToken(string $tokenHash): void
    {
        $statement = $this->connection->prepare(
            'SELECT family_id FROM refresh_tokens WHERE token_hash = :hash LIMIT 1'
        );
        $statement->execute(['hash' => $tokenHash]);
        $familyId = $statement->fetchColumn();
        if ($familyId !== false) {
            $this->revokeFamily((string) $familyId);
        }
    }

    public function isFamilyActive(int $userId, string $familyId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1 FROM refresh_tokens WHERE user_id = :user_id AND family_id = :family '
            . 'AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1'
        );
        $statement->execute(['user_id' => $userId, 'family' => $familyId]);
        return $statement->fetchColumn() !== false;
    }

    private function revokeFamily(string $familyId): void
    {
        $statement = $this->connection->prepare(
            'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) '
            . 'WHERE family_id = :family'
        );
        $statement->execute(['family' => $familyId]);
    }
}
