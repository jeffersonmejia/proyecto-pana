<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Exceptions\ApiException;
use App\Repositories\PermissionRepository;

final class AuthorizationMiddleware
{
    public function __construct(private PermissionRepository $permissions)
    {
    }

    public function requirePermission(int $userId, string $permission): void
    {
        if (!$this->permissions->userHasPermission($userId, $permission)) {
            throw new ApiException(403, 'permission_denied');
        }
    }
}
