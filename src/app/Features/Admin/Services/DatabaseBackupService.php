<?php
declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class DatabaseBackupService
{
    public function __construct(private PDO $connection)
    {
    }

    /** @return array{stream: resource, size: int} */
    public function create(): array
    {
        $stream = fopen('php://temp/maxmemory:5242880', 'w+b');
        if ($stream === false) throw new RuntimeException('backup_stream_unavailable');
        try {
            fwrite($stream, "-- PANA database backup\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");
            $this->connection->beginTransaction();
            $objects = $this->connection->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM);
            $tables = array_filter($objects, static fn (array $object): bool => $object[1] === 'BASE TABLE');
            foreach ($tables as $table) $this->writeTableStructure($stream, (string) $table[0]);
            foreach ($tables as $table) $this->writeTableData($stream, (string) $table[0]);
            foreach ($objects as $object) if ($object[1] === 'VIEW') $this->writeView($stream, (string) $object[0]);
            $this->connection->commit();
            fwrite($stream, "SET FOREIGN_KEY_CHECKS=1;\n");
            $signature = hash_init('sha256', HASH_HMAC, (string) env_value('JWT_SECRET', ''));
            rewind($stream);
            hash_update_stream($signature, $stream);
            fwrite($stream, '-- PANA-SIGNATURE:' . hash_final($signature) . "\n");
            rewind($stream);
            $size = fstat($stream)['size'] ?? 0;
            return ['stream' => $stream, 'size' => (int) $size];
        } catch (\Throwable $error) {
            if ($this->connection->inTransaction()) $this->connection->rollBack();
            fclose($stream);
            throw $error;
        }
    }

    private function writeTableStructure($stream, string $table): void
    {
        $identifier = '`' . str_replace('`', '``', $table) . '`';
        $definition = $this->connection->query("SHOW CREATE TABLE {$identifier}")->fetch(PDO::FETCH_NUM);
        fwrite($stream, "-- Table: {$table}\nDROP TABLE IF EXISTS {$identifier};\n" . $definition[1] . ";\n");
    }

    private function writeTableData($stream, string $table): void
    {
        $identifier = '`' . str_replace('`', '``', $table) . '`';
        $columns = $this->connection->query("SHOW COLUMNS FROM {$identifier}")->fetchAll();
        $names = array_map(static fn (array $column): string => '`' . str_replace('`', '``', $column['Field']) . '`', $columns);
        $rows = $this->connection->query("SELECT * FROM {$identifier}");
        while (($row = $rows->fetch(PDO::FETCH_NUM)) !== false) {
            $values = [];
            foreach ($row as $index => $value) {
                if ($value === null) $values[] = 'NULL';
                elseif (preg_match('/(binary|blob)/i', $columns[$index]['Type'])) $values[] = '0x' . bin2hex((string) $value);
                else $values[] = $this->connection->quote((string) $value);
            }
            fwrite($stream, "INSERT INTO {$identifier} (" . implode(',', $names) . ') VALUES (' . implode(',', $values) . ");\n");
        }
        fwrite($stream, "\n");
    }

    private function writeView($stream, string $view): void
    {
        $identifier = '`' . str_replace('`', '``', $view) . '`';
        $definition = $this->connection->query("SHOW CREATE VIEW {$identifier}")->fetch(PDO::FETCH_NUM);
        $sql = preg_replace('/DEFINER=`[^`]+`@`[^`]+`\s*/i', '', (string) $definition[1]);
        fwrite($stream, "-- View: {$view}\nDROP VIEW IF EXISTS {$identifier};\n{$sql};\n\n");
    }
}
