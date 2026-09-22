<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\AdminRoleController;
use App\Controllers\AdminUserController;
use App\Controllers\HealthController;
use App\Exceptions\ApiException;
use App\Middleware\AuthenticationMiddleware;
use App\Middleware\AuthorizationMiddleware;
use App\Repositories\LoginAttemptRepository;
use App\Repositories\AdminRoleRepository;
use App\Repositories\AdminUserRepository;
use App\Repositories\PermissionRepository;
use App\Repositories\RefreshTokenRepository;
use App\Repositories\UserRepository;
use App\Services\AuthConfig;
use App\Services\AuthService;
use App\Services\AdminRoleService;
use App\Services\AdminUserService;
use App\Services\HealthService;
use App\Services\JwtService;
use App\Services\PasswordService;
use App\Validators\UserProfileInputValidator;

$buildAuth = static function (): array {
    $connection = database_connection();
    $config = new AuthConfig();
    $jwt = new JwtService($config);
    $users = new UserRepository($connection);
    $permissions = new PermissionRepository($connection);
    $auth = new AuthService(
        $config,
        $jwt,
        new PasswordService(),
        $users,
        $permissions,
        new RefreshTokenRepository($connection),
        new LoginAttemptRepository($connection)
    );

    return [
        'controller' => new AuthController($auth, $config),
        'authentication' => new AuthenticationMiddleware($jwt, $auth, new RefreshTokenRepository($connection)),
        'authorization' => new AuthorizationMiddleware($permissions),
    ];
};

$readJsonBody = static function (): array {
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) {
        throw new ApiException(400, 'invalid_json');
    }
    return $body;
};

$buildAdmin = static function () use ($buildAuth): array {
    $auth = $buildAuth();
    $connection = database_connection();
    return [
        'authentication' => $auth['authentication'],
        'authorization' => $auth['authorization'],
        'users' => new AdminUserController(new AdminUserService(
            new AdminUserRepository($connection), new PasswordService(), new UserProfileInputValidator(),
            new \App\Repositories\BeneficiaryLookupRepository($connection)
        ), new \App\Repositories\StudentLookupRepository($connection)),
        'roles' => new AdminRoleController(new AdminRoleService(new AdminRoleRepository($connection))),
    ];
};

$authorize = static function (array $components, string $permission): array {
    $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
    $components['authorization']->requirePermission((int) $user['id'], $permission);
    return $user;
};

$authorizeAny = static function (array $components, array $permissions): array {
    $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
    foreach ($permissions as $permission) {
        try {
            $components['authorization']->requirePermission((int) $user['id'], $permission);
            return $user;
        } catch (ApiException $error) {
            if ($error->status !== 403) throw $error;
        }
    }
    throw new ApiException(403, 'permission_denied');
};

$routes = array_merge([
    'GET /api/health' => static function (): void {
        $controller = new HealthController(new HealthService(
            new \App\Repositories\HealthRepository(database_connection())
        ));
        $controller->show();
    },
    'POST /api/auth/login' => static function () use ($buildAuth, $readJsonBody): void {
        $components = $buildAuth();
        $components['controller']->login($readJsonBody(), $_SERVER['REMOTE_ADDR'] ?? '');
    },
    'POST /api/auth/refresh' => static function () use ($buildAuth): void {
        $components = $buildAuth();
        $components['controller']->refresh($_COOKIE['pana_refresh'] ?? null);
    },
    'POST /api/auth/logout' => static function () use ($buildAuth): void {
        $components = $buildAuth();
        $components['controller']->logout($_COOKIE['pana_refresh'] ?? null);
    },
    'GET /api/auth/me' => static function () use ($buildAuth): void {
        $components = $buildAuth();
        $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
        $components['controller']->me($user);
    },
    'GET /api/auth/can' => static function () use ($buildAuth): void {
        $components = $buildAuth();
        $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
        $permission = $_GET['permission'] ?? '';
        if (!is_string($permission) || !preg_match('/^[a-z0-9._:-]{1,120}$/', $permission)) {
            throw new ApiException(400, 'invalid_permission');
        }
        $components['authorization']->requirePermission((int) $user['id'], $permission);
        echo json_encode(['allowed' => true]);
    },
], (require __DIR__ . '/admin.php')($buildAdmin, $authorize, $authorizeAny, $readJsonBody));

return array_merge(
    $routes,
    (require __DIR__ . '/people.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/attendance.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/activities.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/courses.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/evaluations.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/reports.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody),
    (require __DIR__ . '/documents.php')($buildAuth, $authorize, $authorizeAny, $readJsonBody)
    ,(require __DIR__ . '/notifications.php')($buildAuth, $authorize)
);
