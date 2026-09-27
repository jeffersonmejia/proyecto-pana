<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\LoginAttemptRepository;
use App\Repositories\PermissionRepository;
use App\Repositories\RefreshTokenRepository;
use App\Repositories\UserRepository;

final class AuthService
{
    public function __construct(
        private AuthConfig $config,
        private JwtService $jwt,
        private PasswordService $passwords,
        private UserRepository $users,
        private PermissionRepository $permissions,
        private RefreshTokenRepository $refreshTokens,
        private LoginAttemptRepository $attempts
    ) {
    }

    public function login(string $email, string $password, string $ipAddress): array
    {
        $email = strtolower(trim($email));
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || strlen($password) < 1 || strlen($password) > 4096) {
            throw new ApiException(422, 'invalid_input');
        }

        [$identityHash, $ipHash] = $this->attemptKeys($email, $ipAddress);
        if ($this->attempts->isBlocked($identityHash, $ipHash)) {
            throw new ApiException(429, 'rate_limited');
        }

        $user = $this->users->findForLogin($email);
        $passwordMatches = $user !== null && $this->passwords->verify($password, $user['password_hash']);
        if (!$passwordMatches || (int) $user['is_active'] !== 1) {
            $blocked = $this->attempts->recordFailure(
                $identityHash, $ipHash, $this->config->maxLoginAttempts, $this->config->loginWindowMinutes
            );
            throw new ApiException($blocked ? 429 : 401, $blocked ? 'rate_limited' : 'invalid_credentials');
        }

        $this->attempts->clear($identityHash, $ipHash);
        $this->users->recordLogin((int) $user['id']);
        return $this->issueSession((int) $user['id']);
    }

    public function refresh(string $rawRefreshToken): array
    {
        if ($rawRefreshToken === '' || strlen($rawRefreshToken) > 200) {
            throw new ApiException(401, 'invalid_refresh_token');
        }

        $newRefresh = bin2hex(random_bytes(32));
        $rotated = $this->refreshTokens->rotate(
            hash('sha256', $rawRefreshToken),
            hash('sha256', $newRefresh),
            gmdate('Y-m-d H:i:s', time() + ($this->config->refreshDays * 86400))
        );
        if ($rotated === null) {
            throw new ApiException(401, 'invalid_refresh_token');
        }

        $user = $this->activeUser((int) $rotated['user_id']);
        if ($user === null) {
            $this->refreshTokens->revokeFamilyForToken(hash('sha256', $newRefresh));
            throw new ApiException(401, 'invalid_refresh_token');
        }

        return $this->sessionResponse($user, $newRefresh, (string) $rotated['family_id']);
    }

    public function logout(string $rawRefreshToken): void
    {
        if ($rawRefreshToken !== '' && strlen($rawRefreshToken) <= 200) {
            $this->refreshTokens->revokeFamilyForToken(hash('sha256', $rawRefreshToken));
        }
    }

    public function profile(int $userId): array
    {
        return $this->users->profile($userId) ?? throw new ApiException(404, 'profile_not_found');
    }

    public function updateProfile(int $userId, array $input, string $role): array
    {
        $profile = $this->profileInput($input);
        try { $this->users->updateProfile($userId, $profile, $role === 'beneficiary'); }
        catch (\PDOException $error) { if ($error->getCode() === '23000') throw new ApiException(409, 'email_already_exists'); throw $error; }
        return $this->profile($userId);
    }

    public function activeUser(int $userId): ?array
    {
        $user = $this->users->findActiveById($userId);
        if ($user === null) {
            return null;
        }

        return array_merge($user, $this->permissions->forUser($userId));
    }

    private function issueSession(int $userId): array
    {
        $user = $this->activeUser($userId);
        if ($user === null) {
            throw new ApiException(401, 'invalid_credentials');
        }

        $refreshToken = bin2hex(random_bytes(32));
        $familyId = sprintf('%s-%s-%s-%s-%s', bin2hex(random_bytes(4)), bin2hex(random_bytes(2)),
            bin2hex(random_bytes(2)), bin2hex(random_bytes(2)), bin2hex(random_bytes(6)));
        $this->refreshTokens->create(
            $userId, hash('sha256', $refreshToken), $familyId,
            gmdate('Y-m-d H:i:s', time() + ($this->config->refreshDays * 86400))
        );
        return $this->sessionResponse($user, $refreshToken, $familyId);
    }

    private function sessionResponse(array $user, string $refreshToken, string $familyId): array
    {
        unset($user['is_active']);
        return [
            'access_token' => $this->jwt->createAccessToken((int) $user['id'], $familyId),
            'expires_in' => $this->config->accessMinutes * 60,
            'user' => $user,
            'refresh_cookie' => $refreshToken,
        ];
    }

    private function attemptKeys(string $email, string $ipAddress): array
    {
        $secret = $this->config->secret;
        return [
            hash_hmac('sha256', $email, $secret),
            hash_hmac('sha256', $ipAddress !== '' ? $ipAddress : 'unknown', $secret),
        ];
    }

    private function profileInput(array $input): array
    {
        $text = static function (string $key, int $max) use ($input): string { $value=$input[$key]??''; if(!is_string($value)||trim($value)===''||strlen($value)>$max) throw new ApiException(422,'invalid_profile'); return trim($value); };
        $optional = static function (string $key, int $max) use ($input): ?string { $value=$input[$key]??''; if(!is_string($value)||strlen($value)>$max) throw new ApiException(422,'invalid_profile'); return trim($value)===''?null:trim($value); };
        $birth=$optional('birth_date',10); if($birth!==null&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$birth)) throw new ApiException(422,'invalid_profile');
        return ['first_name'=>$text('first_name',120),'last_name'=>$text('last_name',120),'phone'=>$optional('phone',30),
            'email'=>strtolower($text('email',254)),'birth_date'=>$birth,'address'=>$optional('address',255),'observations'=>$optional('observations',5000),
            'birth_province'=>$optional('birth_province',120),'birth_city'=>$optional('birth_city',120),'gender'=>$optional('gender',40),
            'self_identification'=>$optional('self_identification',80),'has_disability'=>$optional('has_disability',10),
            'disability_type'=>$optional('disability_type',100),'sector'=>$optional('sector',150),'education'=>$optional('education',150)];
    }
}
