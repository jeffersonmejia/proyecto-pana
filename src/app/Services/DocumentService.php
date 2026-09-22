<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\DocumentRepository;

final class DocumentService
{
    private const MIME_EXTENSIONS = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'text/plain' => 'txt'];

    public function __construct(private DocumentRepository $documents, private NextcloudStorageService $storage)
    {
    }

    public function entities(mixed $type, mixed $query, array $actor): array
    {
        if (!in_array($type, ['person', 'activity', 'evaluation'], true) || !is_string($query) || strlen($query) > 100) {
            throw new ApiException(422, 'invalid_document_entity');
        }
        return $this->documents->entities($type, trim($query), $actor);
    }

    public function all(mixed $type, mixed $entityId, mixed $page, array $actor): array
    {
        if (!in_array($type, ['person', 'activity', 'evaluation'], true)) throw new ApiException(422, 'invalid_document_entity');
        $id = $entityId === null || $entityId === '' ? null : filter_var($entityId, FILTER_VALIDATE_INT);
        if ($id === false || ($id !== null && $id < 1)) throw new ApiException(422, 'invalid_id');
        return $this->documents->all($type, $id === null ? null : (int) $id,
            \App\Support\Pagination::page($page), $actor);
    }

    public function upload(array $input, mixed $file, int $actor, array $scope): array
    {
        return $this->store($input,$file,$actor,$scope,false);
    }

    public function uploadEvidence(array $input,mixed $file,int $actor,array $scope): array
    {
        if(($input['entity_type']??null)!=='activity') throw new ApiException(422,'evidence_must_belong_to_activity');
        return $this->store($input,$file,$actor,$scope,true);
    }

    private function store(array $input,mixed $file,int $actor,array $scope,bool $evidence): array
    {
        $type = $input['entity_type'] ?? null;
        $id = filter_var($input['entity_id'] ?? null, FILTER_VALIDATE_INT);
        if (!in_array($type, ['person', 'activity', 'evaluation'], true) || $id === false || $id < 1) {
            throw new ApiException(422, 'invalid_document_entity');
        }
        if (!$this->documents->entityExists($type, (int) $id, $scope)) throw new ApiException(404, 'document_entity_not_found');
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || !is_uploaded_file($file['tmp_name'] ?? '')) throw new ApiException(422, 'invalid_upload');
        if ($file['size'] > 8 * 1024 * 1024) throw new ApiException(413, 'file_too_large');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!is_string($mime) || !isset(self::MIME_EXTENSIONS[$mime]) || ($evidence && $mime!=='application/pdf')) throw new ApiException(415, 'unsupported_file_type');
        $name = $this->safeName($file['name'] ?? '');
        if ($name === '') throw new ApiException(422, 'invalid_file_name');
        $stored = bin2hex(random_bytes(16)) . '.' . self::MIME_EXTENSIONS[$mime];
        $path = $this->remotePath($type, (int) $id, $stored);
        $this->storage->uploadFile($file['tmp_name'], $path);
        try {
            $documentId = $this->documents->create(['entity_type' => $type, 'entity_id' => (int) $id,
                'original_name' => $name, 'stored_name' => $stored, 'mime_type' => $mime, 'file_size' => (int) $file['size']], $actor);
            return ['id' => $documentId];
        } catch (\Throwable $error) {
            try { $this->storage->delete($path); } catch (\Throwable) { }
            throw $error;
        }
    }

    public function download(int $id, array $actor): array
    {
        $document = $this->documents->find($id, $actor) ?? throw new ApiException(404, 'document_not_found');
        $legacy = dirname(__DIR__, 3) . '/src/storage/documents/' . basename($document['stored_name']);
        if (is_file($legacy)) return ['document' => $document, 'stream' => fopen($legacy, 'rb'), 'size' => filesize($legacy)];
        $file = $this->storage->download($this->remotePath($document['entity_type'], (int) $document['entity_id'], $document['stored_name']));
        return ['document' => $document] + $file;
    }

    public function delete(int $id, array $actor): void
    {
        $document = $this->documents->find($id, $actor) ?? throw new ApiException(404, 'document_not_found');
        $legacy = dirname(__DIR__, 3) . '/src/storage/documents/' . basename($document['stored_name']);
        if (is_file($legacy)) unlink($legacy);
        else $this->storage->delete($this->remotePath($document['entity_type'],
            (int) $document['entity_id'], $document['stored_name']));
        $this->documents->delete($id);
    }

    private function remotePath(string $type, int $id, string $stored): string
    {
        $folder = ['person' => 'Personas', 'activity' => 'Actividades', 'evaluation' => 'Evaluaciones'][$type] ?? '';
        if ($folder === '') throw new ApiException(422, 'invalid_document_entity');
        return "Documentos/{$folder}/{$id}/" . basename($stored);
    }

    private function safeName(mixed $name): string
    {
        if (!is_string($name)) return '';
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        return mb_substr(trim($name), 0, 255);
    }
}
