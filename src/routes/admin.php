<?php
declare(strict_types=1);

return static function (
    callable $buildAdmin,
    callable $authorize,
    callable $authorizeAny,
    callable $readJsonBody
): array {
    return [
        'GET /api/admin/users' => static function () use ($buildAdmin, $authorizeAny): void {
            $components = $buildAdmin();
            $authorizeAny($components, ['users.read', 'users.manage']);
            $components['users']->index();
        },
        'POST /api/admin/users' => static function () use ($buildAdmin, $authorize, $readJsonBody): void {
            $components = $buildAdmin();
            $authorize($components, 'users.manage');
            $components['users']->create($readJsonBody());
        },
        'PUT /api/admin/users' => static function () use ($buildAdmin, $authorize, $readJsonBody): void {
            $components = $buildAdmin();
            $actor = $authorize($components, 'users.manage');
            $components['users']->update($readJsonBody(), (int) $actor['id']);
        },
        'DELETE /api/admin/users' => static function () use ($buildAdmin, $authorize): void {
            $components = $buildAdmin();
            $actor = $authorize($components, 'users.manage');
            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            $components['users']->delete($id === false ? 0 : (int) $id, (int) $actor['id']);
        },
        'GET /api/admin/roles' => static function () use ($buildAdmin, $authorizeAny): void {
            $components = $buildAdmin();
            $authorizeAny($components, ['roles.manage', 'users.manage']);
            $components['roles']->index();
        },
        'GET /api/admin/permissions' => static function () use ($buildAdmin, $authorize): void {
            $components = $buildAdmin();
            $authorize($components, 'roles.manage');
            $components['roles']->permissions();
        },
        'POST /api/admin/roles' => static function () use ($buildAdmin, $authorize, $readJsonBody): void {
            $components = $buildAdmin();
            $authorize($components, 'roles.manage');
            $components['roles']->save($readJsonBody());
        },
        'PUT /api/admin/roles' => static function () use ($buildAdmin, $authorize, $readJsonBody): void {
            $components = $buildAdmin();
            $authorize($components, 'roles.manage');
            $components['roles']->save($readJsonBody());
        },
        'DELETE /api/admin/roles' => static function () use ($buildAdmin, $authorize): void {
            $components = $buildAdmin();
            $authorize($components, 'roles.manage');
            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            $components['roles']->delete($id === false ? 0 : (int) $id);
        },
    ];
};
