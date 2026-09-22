<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use PDO;
use RuntimeException;
use Throwable;

final class DatabaseRestoreService
{
    public function __construct(private PDO $connection, private DatabaseBackupService $backup, private BackupSqlParser $parser)
    {
    }

    public function restore(string $path): void
    {
        $stream = fopen($path, 'rb');
        if ($stream === false) throw new ApiException(422, 'invalid_backup_file');
        try { $this->restoreStream($stream); } finally { fclose($stream); }
    }

    public function restoreStream($stream): void
    {
        $this->validateStream($stream);
        $rollback = $this->backup->create();
        try { $this->replace($stream, true); }
        catch (Throwable $error) {
            try { $this->replace($rollback['stream'], false); }
            catch (Throwable $rollbackError) { throw new RuntimeException('backup_restore_rollback_failed', 0, $rollbackError); }
            throw $error;
        } finally { fclose($rollback['stream']); }
    }

    public function validateStream($stream): void
    {
        $this->verify($stream);
        $this->parser->process($stream, static function (string $sql): void {});
        rewind($stream);
    }

    private function verify($stream): void
    {
        rewind($stream);
        if (fgets($stream) !== "-- PANA database backup\n") throw new ApiException(422, 'invalid_backup_file');
        $size = (int) (fstat($stream)['size'] ?? 0);
        $tailSize = min(128, $size); fseek($stream, -$tailSize, SEEK_END); $tail = fread($stream, $tailSize);
        if (!preg_match('/-- PANA-SIGNATURE:([a-f0-9]{64})\r?\n?$/i', $tail, $match, PREG_OFFSET_CAPTURE)) { rewind($stream); return; }
        $signedLength = $size - $tailSize + $match[0][1];
        $context = hash_init('sha256', HASH_HMAC, (string) env_value('JWT_SECRET', ''));
        rewind($stream); hash_update_stream($context, $stream, $signedLength);
        if (!hash_equals($match[1][0], hash_final($context))) throw new ApiException(422, 'invalid_backup_signature');
        rewind($stream);
    }

    private function replace($stream, bool $revokeSessions): void
    {
        $this->connection->exec('SET FOREIGN_KEY_CHECKS=0');
        $objects = $this->connection->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM);
        foreach ($objects as $object) if ($object[1] === 'VIEW') $this->drop('VIEW', (string) $object[0]);
        foreach ($objects as $object) if ($object[1] === 'BASE TABLE') $this->drop('TABLE', (string) $object[0]);
        $this->parser->process($stream, fn (string $sql): int|false => $this->connection->exec($sql));
        if ($revokeSessions) $this->connection->exec('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at, UTC_TIMESTAMP())');
    }

    private function drop(string $type, string $name): void
    {
        $identifier = '`' . str_replace('`', '``', $name) . '`';
        $this->connection->exec("DROP {$type} IF EXISTS {$identifier}");
    }
}
