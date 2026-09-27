<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuthConfig;
use App\Services\AuthService;

final class AuthController
{
    private const REFRESH_COOKIE = 'pana_refresh';

    public function __construct(private AuthService $auth, private AuthConfig $config)
    {
    }

    public function login(array $payload, string $ipAddress): void
    {
        $email = $payload['email'] ?? null;
        $password = $payload['password'] ?? null;
        if (!is_string($email) || !is_string($password)) {
            throw new ApiException(422, 'invalid_input');
        }
        $this->sendSession($this->auth->login($email, $password, $ipAddress));
    }

    public function refresh(?string $refreshToken): void
    {
        $this->sendSession($this->auth->refresh($refreshToken ?? ''));
    }

    public function logout(?string $refreshToken): void
    {
        $this->auth->logout($refreshToken ?? '');
        $this->setRefreshCookie('', time() - 3600);
        http_response_code(200);
        echo json_encode(['status' => 'ok']);
    }

    public function me(array $user): void
    {
        http_response_code(200);
        echo json_encode(['user' => $user]);
    }

    public function profile(array $user): void
    {
        echo json_encode(['profile' => $this->auth->profile((int) $user['id'])]);
    }

    public function updateProfile(array $user, array $payload): void
    {
        echo json_encode(['profile' => $this->auth->updateProfile((int) $user['id'], $payload, (string) ($user['roles'][0] ?? ''))]);
    }

    private function sendSession(array $session): void
    {
        $this->setRefreshCookie($session['refresh_cookie'], time() + ($this->config->refreshDays * 86400));
        unset($session['refresh_cookie']);
        http_response_code(200);
        echo json_encode($session);
    }

    private function setRefreshCookie(string $value, int $expires): void
    {
        setcookie(self::REFRESH_COOKIE, $value, [
            'expires' => $expires,
            'path' => '/api/auth',
            'secure' => $this->config->cookieIsSecure(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
