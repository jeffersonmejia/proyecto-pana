<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseRestoreService;

final class DatabaseBackupController
{
    public function __construct(private DatabaseBackupService $service, private DatabaseRestoreService $restore)
    {
    }

    public function download(array $user): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        $backup = $this->service->create();
        while (ob_get_level() > 0) ob_end_clean();
        $filename = 'pana_backup_' . date('Ymd_His') . '.sql';
        http_response_code(200);
        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . $backup['size']);
        header('Cache-Control: no-store, private');
        header('X-Content-Type-Options: nosniff');
        header('Access-Control-Expose-Headers: Content-Disposition');
        try {
            fpassthru($backup['stream']);
        } finally {
            fclose($backup['stream']);
        }
    }

    public function restore(array $user, array $file): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        $path = $file['tmp_name'] ?? '';
        if (!is_string($path) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($path)
            || strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION)) !== 'sql') {
            throw new ApiException(422, 'invalid_backup_file');
        }
        $this->restore->restore($path);
        $secure = env_value('APP_ENV', 'development') === 'production' || str_starts_with((string) env_value('APP_URL', ''), 'https://');
        setcookie('pana_refresh', '', ['expires' => time() - 3600, 'path' => '/api/auth', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
        http_response_code(200);
        echo json_encode(['status' => 'restored']);
    }
}
