<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Throwable;

final class LoginAttemptRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function isBlocked(string $identityHash, string $ipHash): bool
    {
        $statement = $this->connection->prepare(
            'SELECT blocked_until > UTC_TIMESTAMP() FROM login_attempts '
            . 'WHERE identifier_hash = :identity AND ip_hash = :ip LIMIT 1'
        );
        $statement->execute(['identity' => $identityHash, 'ip' => $ipHash]);
        return (bool) $statement->fetchColumn();
    }

    public function recordFailure(string $identityHash, string $ipHash, int $maximum, int $windowMinutes): bool
    {
        $this->connection->beginTransaction();
        try {
            $insert = $this->connection->prepare(
                'INSERT IGNORE INTO login_attempts (identifier_hash, ip_hash, window_started_at) '
                . 'VALUES (:identity, :ip, UTC_TIMESTAMP())'
            );
            $insert->execute(['identity' => $identityHash, 'ip' => $ipHash]);
            $select = $this->connection->prepare(
                'SELECT attempt_count, window_started_at FROM login_attempts '
                . 'WHERE identifier_hash = :identity AND ip_hash = :ip FOR UPDATE'
            );
            $select->execute(['identity' => $identityHash, 'ip' => $ipHash]);
            $row = $select->fetch();
            $started = strtotime((string) $row['window_started_at'] . ' UTC');
            $expired = $started <= time() - ($windowMinutes * 60);
            $count = $expired ? 1 : ((int) $row['attempt_count'] + 1);
            $windowStart = $expired ? gmdate('Y-m-d H:i:s') : $row['window_started_at'];
            $blockedUntil = $count >= $maximum
                ? gmdate('Y-m-d H:i:s', time() + ($windowMinutes * 60))
                : null;
            $update = $this->connection->prepare(
                'UPDATE login_attempts SET attempt_count = :count, window_started_at = :started, '
                . 'blocked_until = :blocked WHERE identifier_hash = :identity AND ip_hash = :ip'
            );
            $update->execute([
                'count' => $count, 'started' => $windowStart, 'blocked' => $blockedUntil,
                'identity' => $identityHash, 'ip' => $ipHash,
            ]);
            $this->connection->commit();
            return $blockedUntil !== null;
        } catch (Throwable $exception) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            throw $exception;
        }
    }

    public function clear(string $identityHash, string $ipHash): void
    {
        $statement = $this->connection->prepare(
            'DELETE FROM login_attempts WHERE identifier_hash = :identity AND ip_hash = :ip'
        );
        $statement->execute(['identity' => $identityHash, 'ip' => $ipHash]);
    }
}
