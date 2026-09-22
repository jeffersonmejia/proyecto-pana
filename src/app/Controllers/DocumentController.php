<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\DocumentService;

final class DocumentController
{
    public function __construct(private DocumentService $documents)
    {
    }

    public function entities(mixed $type, mixed $query, array $actor): void
    {
        echo json_encode(['entities' => $this->documents->entities($type, $query, $actor)]);
    }

    public function index(mixed $type, mixed $id, mixed $page, array $actor): void
    {
        $result = $this->documents->all($type, $id, $page, $actor);
        echo json_encode(['documents' => $result['items'], 'pagination' => $result['pagination']]);
    }

    public function upload(array $input, mixed $file, array $actor): void
    {
        http_response_code(201);
        echo json_encode($this->documents->upload($input, $file, (int) $actor['id'], $actor));
    }

    public function uploadEvidence(array $input,mixed $file,array $actor): void
    {
        http_response_code(201);
        echo json_encode($this->documents->uploadEvidence($input,$file,(int)$actor['id'],$actor));
    }

    public function download(int $id, array $actor): void
    {
        $file = $this->documents->download($id, $actor);
        $document = $file['document'];
        header('Content-Type: ' . $document['mime_type']);
        header('Content-Length: ' . filesize($file['path']));
        header('Content-Disposition: attachment; filename*=UTF-8\'\'' . rawurlencode($document['original_name']));
        header('X-Content-Type-Options: nosniff');
        readfile($file['path']);
    }

    public function delete(int $id, array $actor): void
    {
        $this->documents->delete($id, $actor);
        echo json_encode(['status' => 'deleted']);
    }
}
