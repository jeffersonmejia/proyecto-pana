<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\DocumentRepository;

final class DocumentService
{
    private const MIME_EXTENSIONS = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'text/plain' => 'txt'];
    private string $directory;

    public function __construct(private DocumentRepository $documents)
    {
        $this->directory = dirname(__DIR__, 3) . '/src/storage/documents';
    }

    public function entities(mixed $type, mixed $query): array
    {
        if (!in_array($type, ['person', 'activity', 'evaluation'], true) || !is_string($query) || strlen($query) > 100) {
            throw new ApiException(422, 'invalid_document_entity');
        }
        return $this->documents->entities($type, trim($query));
    }

    public function all(mixed $type, mixed $entityId): array
    {
        if (!in_array($type, ['person', 'activity', 'evaluation'], true)) throw new ApiException(422, 'invalid_document_entity');
        $id = $entityId === null || $entityId === '' ? null : filter_var($entityId, FILTER_VALIDATE_INT);
        if ($id === false || ($id !== null && $id < 1)) throw new ApiException(422, 'invalid_id');
        return $this->documents->all($type, $id === null ? null : (int) $id);
    }

    public function upload(array $input, mixed $file, int $actor): array
    {
        $type = $input['entity_type'] ?? null;
        $id = filter_var($input['entity_id'] ?? null, FILTER_VALIDATE_INT);
        if (!in_array($type, ['person', 'activity', 'evaluation'], true) || $id === false || $id < 1) {
            throw new ApiException(422, 'invalid_document_entity');
        }
        if (!$this->documents->entityExists($type, (int) $id)) throw new ApiException(404, 'document_entity_not_found');
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || !is_uploaded_file($file['tmp_name'] ?? '')) throw new ApiException(422, 'invalid_upload');
        if ($file['size'] > 8 * 1024 * 1024) throw new ApiException(413, 'file_too_large');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!is_string($mime) || !isset(self::MIME_EXTENSIONS[$mime])) throw new ApiException(415, 'unsupported_file_type');
        $name = $this->safeName($file['name'] ?? '');
        if ($name === '') throw new ApiException(422, 'invalid_file_name');
        if (!is_dir($this->directory) && !mkdir($this->directory, 0750, true) && !is_dir($this->directory)) {
            throw new ApiException(500, 'storage_unavailable');
        }
        $stored = bin2hex(random_bytes(16)) . '.' . self::MIME_EXTENSIONS[$mime];
        $path = $this->directory . '/' . $stored;
        if (!move_uploaded_file($file['tmp_name'], $path)) throw new ApiException(500, 'upload_failed');
        try {
            $documentId = $this->documents->create(['entity_type' => $type, 'entity_id' => (int) $id,
                'original_name' => $name, 'stored_name' => $stored, 'mime_type' => $mime, 'file_size' => (int) $file['size']], $actor);
            return ['id' => $documentId];
        } catch (\Throwable $error) { unlink($path); throw $error; }
    }

    public function download(int $id): array
    {
        $document = $this->documents->find($id) ?? throw new ApiException(404, 'document_not_found');
        $path = $this->directory . '/' . basename($document['stored_name']);
        if (!is_file($path)) throw new ApiException(404, 'document_file_not_found');
        return ['document' => $document, 'path' => $path];
    }

    public function delete(int $id): void
    {
        $file = $this->download($id);
        $this->documents->delete($id);
        if (is_file($file['path'])) unlink($file['path']);
    }

    private function safeName(mixed $name): string
    {
        if (!is_string($name)) return '';
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        return mb_substr(trim($name), 0, 255);
    }
}
