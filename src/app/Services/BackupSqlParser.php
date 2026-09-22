<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;

final class BackupSqlParser
{
    public function process($stream, callable $consume): void
    {
        rewind($stream);
        $sql = ''; $quote = null; $escaped = false; $lineComment = false; $blockComment = false;
        while (($char = fgetc($stream)) !== false) {
            if ($lineComment) { if ($char === "\n") { $lineComment = false; $sql .= "\n"; } continue; }
            if ($blockComment) {
                $sql .= $char;
                if ($char === '*') {
                    $next = fgetc($stream);
                    if ($next === '/') { $sql .= '/'; $blockComment = false; }
                    elseif ($next !== false) fseek($stream, -1, SEEK_CUR);
                }
                continue;
            }
            if ($quote !== null) { $sql .= $char; $this->readQuoted($stream, $char, $quote, $escaped, $sql); continue; }
            if ($char === '-' && $this->isLineComment($stream)) { $lineComment = true; continue; }
            if ($char === '/' && $this->isBlockComment($stream)) { $sql .= '/*'; $blockComment = true; continue; }
            if (in_array($char, ["'", '"', '`'], true)) { $quote = $char; $sql .= $char; continue; }
            if ($char === ';') { $this->consume($sql, $consume); $sql = ''; continue; }
            $sql .= $char;
        }
        if ($quote !== null || $blockComment || trim($sql) !== '') throw new ApiException(422, 'invalid_backup_file');
    }

    private function readQuoted($stream, string $char, ?string &$quote, bool &$escaped, string &$sql): void
    {
        if ($escaped) { $escaped = false; return; }
        if ($char === '\\' && $quote !== '`') { $escaped = true; return; }
        if ($char !== $quote) return;
        $next = fgetc($stream);
        if ($next === $quote) { $sql .= $next; return; }
        $quote = null;
        if ($next !== false) fseek($stream, -1, SEEK_CUR);
    }

    private function isLineComment($stream): bool
    {
        $position = ftell($stream);
        if (fgetc($stream) !== '-') { fseek($stream, $position, SEEK_SET); return false; }
        $next = fgetc($stream);
        if ($next !== false && preg_match('/\s/', $next)) return true;
        fseek($stream, $position, SEEK_SET);
        return false;
    }

    private function isBlockComment($stream): bool
    {
        $position = ftell($stream);
        if (fgetc($stream) === '*') return true;
        fseek($stream, $position, SEEK_SET);
        return false;
    }

    private function consume(string $sql, callable $consume): void
    {
        $sql = trim($sql);
        if ($sql === '') return;
        if (!$this->allowed($sql)) throw new ApiException(422, 'invalid_backup_file');
        $consume($sql);
    }

    private function allowed(string $sql): bool
    {
        $id = '`(?:``|[^`])+`';
        if (preg_match('/^SET NAMES utf8mb4$/i', $sql) || preg_match('/^SET FOREIGN_KEY_CHECKS\s*=\s*[01]$/i', $sql)) return true;
        if (preg_match('/^DROP (?:TABLE|VIEW) IF EXISTS ' . $id . '$/i', $sql)) return true;
        if (preg_match('/^CREATE TABLE ' . $id . '\s*\(/is', $sql)) return true;
        if (preg_match('/^CREATE\s+(?:(?:ALGORITHM=[A-Z_]+)\s+)?(?:(?:SQL SECURITY (?:DEFINER|INVOKER))\s+)?VIEW\s+' . $id . '\s+AS\s+.+$/is', $sql)) return true;
        return $this->allowedInsert($sql, $id);
    }

    private function allowedInsert(string $sql, string $id): bool
    {
        if (!preg_match('/^INSERT INTO ' . $id . '\s*\((.+)\)\s*VALUES\s*\((.*)\)$/is', $sql, $parts)) return false;
        if (!preg_match('/^' . $id . '(?:\s*,\s*' . $id . ')*$/s', $parts[1])) return false;
        $values = $parts[2]; $length = strlen($values); $offset = 0;
        while ($offset < $length) {
            while ($offset < $length && ctype_space($values[$offset])) $offset++;
            if (strtoupper(substr($values, $offset, 4)) === 'NULL') $offset += 4;
            elseif (substr($values, $offset, 2) === '0x') {
                $offset += 2;
                while ($offset < $length && ctype_xdigit($values[$offset])) $offset++;
            } elseif (($values[$offset] ?? '') === "'") {
                $offset++;
                if (!$this->readStringLiteral($values, $offset)) return false;
            } else return false;
            while ($offset < $length && ctype_space($values[$offset])) $offset++;
            if ($offset === $length) return true;
            if ($values[$offset++] !== ',') return false;
        }
        return $length === 0;
    }

    private function readStringLiteral(string $values, int &$offset): bool
    {
        $length = strlen($values);
        while ($offset < $length) {
            if ($values[$offset] === '\\') { $offset += 2; continue; }
            if ($values[$offset] === "'") {
                if (($values[$offset + 1] ?? '') === "'") { $offset += 2; continue; }
                $offset++; return true;
            }
            $offset++;
        }
        return false;
    }
}
