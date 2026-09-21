<?php
declare(strict_types=1);

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use UnexpectedValueException;

final class JwtService
{
    public function __construct(private AuthConfig $config)
    {
    }

    public function createAccessToken(int $userId, string $familyId): string
    {
        $issuedAt = time();
        return JWT::encode([
            'iss' => $this->config->issuer(),
            'aud' => 'pana-api',
            'sub' => (string) $userId,
            'sid' => $familyId,
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $issuedAt + ($this->config->accessMinutes * 60),
            'jti' => bin2hex(random_bytes(16)),
        ], $this->config->secret, $this->config->algorithm);
    }

    public function verify(string $token): object
    {
        $claims = JWT::decode($token, new Key($this->config->secret, $this->config->algorithm));
        if (($claims->iss ?? null) !== $this->config->issuer()
            || ($claims->aud ?? null) !== 'pana-api'
            || !isset($claims->sub)
            || !isset($claims->sid)
            || filter_var($claims->sub, FILTER_VALIDATE_INT) === false) {
            throw new UnexpectedValueException('Invalid access token claims.');
        }

        return $claims;
    }
}
