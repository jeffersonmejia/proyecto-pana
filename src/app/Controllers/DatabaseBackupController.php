<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseRestoreService;
use App\Services\NextcloudStorageService;

final class DatabaseBackupController
{
    public function __construct(private DatabaseBackupService $service, private DatabaseRestoreService $restore,
        private NextcloudStorageService $storage)
    {
    }

    public function createStored(array $user): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        $this->storage->assertAvailable();
        $backup = $this->service->create();
        $filename = 'pana_backup_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '.sql';
        try { $this->storage->uploadStream($backup['stream'], 'Respaldos/' . $filename); }
        catch (\Throwable $error) { fclose($backup['stream']); throw $error; }
        fclose($backup['stream']);
        echo json_encode(['status' => 'stored', 'name' => $filename, 'bytes' => $backup['size'], 'date' => date('Y-m-d H:i')]);
    }

    public function downloadStored(array $user, mixed $name): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        if (!is_string($name) || !preg_match('/^pana_backup_[0-9]{8}_[0-9]{6}(?:_[a-f0-9]{6})?\.sql$/i', $name)) {
            throw new ApiException(422, 'invalid_backup_file');
        }
        $backup = $this->storage->download('Respaldos/' . $name);
        while (ob_get_level() > 0) ob_end_clean();
        http_response_code(200);
        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $name . '"');
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

    public function index(array $user): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        echo json_encode(['backups' => $this->storage->listSqlFiles('Respaldos')]);
    }

    public function restore(array $user, array $file): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        $path = $file['tmp_name'] ?? '';
        if (!is_string($path) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($path)
            || strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION)) !== 'sql') {
            throw new ApiException(422, 'invalid_backup_file');
        }
        $this->storage->assertAvailable();
        $stream = fopen($path, 'rb');
        if ($stream === false) throw new ApiException(422, 'invalid_backup_file');
        try {
            $this->restore->validateStream($stream);
            $archive = 'pana_backup_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '.sql';
            $this->storage->uploadStream($stream, 'Respaldos/' . $archive);
        } finally { fclose($stream); }
        $this->restore->restore($path);
        $this->finishRestore();
    }

    public function restoreStored(array $user, mixed $name): void
    {
        if (!in_array('admin', $user['roles'] ?? [], true)) throw new ApiException(403, 'permission_denied');
        if (!is_string($name) || !preg_match('/^pana_backup_[0-9]{8}_[0-9]{6}(?:_[a-f0-9]{6})?\.sql$/i', $name)) {
            throw new ApiException(422, 'invalid_backup_file');
        }
        $file = $this->storage->download('Respaldos/' . $name);
        try { $this->restore->restoreStream($file['stream']); } finally { fclose($file['stream']); }
        $this->finishRestore();
    }

    private function finishRestore(): void
    {
        $secure = env_value('APP_ENV', 'development') === 'production' || str_starts_with((string) env_value('APP_URL', ''), 'https://');
        setcookie('pana_refresh', '', ['expires' => time() - 3600, 'path' => '/api/auth', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
        http_response_code(200);
        echo json_encode(['status' => 'restored']);
    }
}
