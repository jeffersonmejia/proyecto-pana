<?php
declare(strict_types=1);

return static function (
    callable $buildAdmin,
    callable $authorize,
    callable $authorizeAny,
    callable $readJsonBody
): array {
    $buildBackup = static function (): \App\Controllers\DatabaseBackupController {
        $connection = database_connection();
        $backup = new \App\Services\DatabaseBackupService($connection);
        return new \App\Controllers\DatabaseBackupController($backup, new \App\Services\DatabaseRestoreService(
            $connection, $backup, new \App\Services\BackupSqlParser()
        ));
    };
    return [
        'GET /api/admin/users' => static function () use ($buildAdmin, $authorizeAny): void {
            $components = $buildAdmin();
            $authorizeAny($components, ['users.read', 'users.manage']);
            $components['users']->index($_GET['page'] ?? 1);
        },
        'GET /api/admin/users/beneficiaries' => static function () use ($buildAdmin, $authorize): void {
            $components = $buildAdmin();
            $authorize($components, 'users.manage');
            $components['users']->beneficiaries($_GET['q'] ?? '', $_GET['person_id'] ?? null);
        },
        'GET /api/admin/users/students' => static function () use ($buildAdmin, $authorize): void {
            $components = $buildAdmin();
            $authorize($components, 'users.manage');
            $components['users']->students($_GET['q'] ?? '', $_GET['user_id'] ?? null);
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
            $components['roles']->index($_GET['page'] ?? 1);
        },
        'GET /api/admin/roles/options' => static function () use ($buildAdmin, $authorizeAny): void {
            $components = $buildAdmin();
            $authorizeAny($components, ['users.manage', 'roles.manage']);
            $components['roles']->options();
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
        'POST /api/admin/backups' => static function () use ($buildAdmin, $buildBackup): void {
            $components = $buildAdmin();
            $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
            $buildBackup()->download($user);
        },
        'POST /api/admin/backups/restore' => static function () use ($buildAdmin, $buildBackup): void {
            $components = $buildAdmin();
            $user = $components['authentication']->authenticate($_SERVER['HTTP_AUTHORIZATION'] ?? null);
            $buildBackup()->restore($user, $_FILES['backup'] ?? []);
        },
    ];
};
