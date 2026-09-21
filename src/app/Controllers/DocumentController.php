<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\DocumentService;

final class DocumentController
{
    public function __construct(private DocumentService $documents)
    {
    }

    public function entities(mixed $type, mixed $query): void
    {
        echo json_encode(['entities' => $this->documents->entities($type, $query)]);
    }

    public function index(mixed $type, mixed $id): void
    {
        echo json_encode(['documents' => $this->documents->all($type, $id)]);
    }

    public function upload(array $input, mixed $file, int $actor): void
    {
        http_response_code(201);
        echo json_encode($this->documents->upload($input, $file, $actor));
    }

    public function download(int $id): void
    {
        $file = $this->documents->download($id);
        $document = $file['document'];
        header('Content-Type: ' . $document['mime_type']);
        header('Content-Length: ' . filesize($file['path']));
        header('Content-Disposition: attachment; filename*=UTF-8\'\'' . rawurlencode($document['original_name']));
        header('X-Content-Type-Options: nosniff');
        readfile($file['path']);
    }

    public function delete(int $id): void
    {
        $this->documents->delete($id);
        echo json_encode(['status' => 'deleted']);
    }
}
