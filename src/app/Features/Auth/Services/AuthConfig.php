<?php
declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class AuthConfig
{
    public string $secret;
    public string $algorithm;
    public int $accessMinutes;
    public int $refreshDays;
    public int $maxLoginAttempts;
    public int $loginWindowMinutes;

    public function __construct()
    {
        $this->algorithm = env_value('JWT_ALGORITHM', 'HS256') ?? 'HS256';
        $keyLengths = ['HS256' => 32, 'HS384' => 48, 'HS512' => 64];
        if (!isset($keyLengths[$this->algorithm])) {
            throw new RuntimeException('JWT_ALGORITHM must be HS256, HS384, or HS512.');
        }

        $this->secret = env_value('JWT_SECRET', '') ?? '';
        if (strlen($this->secret) < $keyLengths[$this->algorithm]) {
            throw new RuntimeException('JWT_SECRET is missing or too short for the selected algorithm.');
        }

        $this->accessMinutes = $this->readInteger('JWT_ACCESS_TOKEN_MINUTES', 15, 1, 1440);
        $this->refreshDays = $this->readInteger('JWT_REFRESH_TOKEN_DAYS', 7, 1, 365);
        $this->maxLoginAttempts = $this->readInteger('LOGIN_MAX_ATTEMPTS', 5, 1, 100);
        $this->loginWindowMinutes = $this->readInteger('LOGIN_RATE_LIMIT_MINUTES', 1, 1, 60);
    }

    public function issuer(): string
    {
        return env_value('APP_URL', 'pana') ?? 'pana';
    }

    public function cookieIsSecure(): bool
    {
        return env_value('APP_ENV', 'development') === 'production'
            || str_starts_with($this->issuer(), 'https://');
    }

    private function readInteger(string $name, int $default, int $minimum, int $maximum): int
    {
        $value = filter_var(env_value($name, (string) $default), FILTER_VALIDATE_INT);
        if ($value === false || $value < $minimum || $value > $maximum) {
            throw new RuntimeException($name . ' is outside the supported range.');
        }

        return $value;
    }
}
