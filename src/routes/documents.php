<?php
declare(strict_types=1);

use App\Controllers\DocumentController;
use App\Exceptions\ApiException;
use App\Repositories\DocumentRepository;
use App\Services\DocumentService;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth();
        $auth['documents'] = new DocumentController(new DocumentService(new DocumentRepository(database_connection())));
        return $auth;
    };
    $id = static function (): int {
        $value = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400, 'invalid_id');
        return (int) $value;
    };
    $read = static function (array $components) use ($authorizeAny): void {
        $authorizeAny($components, ['documents.read', 'documents.manage']);
    };

    return [
        'GET /api/documents/entities' => static function () use ($build, $read): void {
            $components = $build(); $read($components);
            $components['documents']->entities($_GET['type'] ?? '', $_GET['q'] ?? '');
        },
        'GET /api/documents' => static function () use ($build, $read, $id): void {
            $components = $build(); $read($components);
            if (isset($_GET['id'])) $components['documents']->download($id());
            else $components['documents']->index($_GET['type'] ?? '', $_GET['entity_id'] ?? null);
        },
        'POST /api/documents' => static function () use ($build, $authorize): void {
            $components = $build(); $actor = $authorize($components, 'documents.manage');
            $components['documents']->upload($_POST, $_FILES['file'] ?? null, (int) $actor['id']);
        },
        'DELETE /api/documents' => static function () use ($build, $authorize, $id): void {
            $components = $build(); $authorize($components, 'documents.manage');
            $components['documents']->delete($id());
        },
    ];
};
