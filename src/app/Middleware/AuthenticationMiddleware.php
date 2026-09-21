<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Exceptions\ApiException;
use App\Repositories\RefreshTokenRepository;
use App\Services\AuthService;
use App\Services\JwtService;
use Throwable;

final class AuthenticationMiddleware
{
    public function __construct(
        private JwtService $jwt,
        private AuthService $auth,
        private RefreshTokenRepository $sessions
    )
    {
    }

    public function authenticate(?string $authorization): array
    {
        if ($authorization === null
            || !preg_match('/^Bearer\s+([A-Za-z0-9._-]+)$/i', trim($authorization), $matches)) {
            throw new ApiException(401, 'authentication_required');
        }

        try {
            $claims = $this->jwt->verify($matches[1]);
        } catch (Throwable $exception) {
            throw new ApiException(401, 'invalid_access_token');
        }

        $user = $this->auth->activeUser((int) $claims->sub);
        if ($user === null || !$this->sessions->isFamilyActive((int) $claims->sub, (string) $claims->sid)) {
            throw new ApiException(401, 'inactive_or_missing_user');
        }

        return $user;
    }
}
