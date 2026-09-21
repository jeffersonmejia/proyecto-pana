<?php
declare(strict_types=1);

namespace App\Services;

final class PasswordService
{
    public function hash(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public function verify(string $password, string $storedHash): bool
    {
        return password_verify($password, $storedHash);
    }
}
