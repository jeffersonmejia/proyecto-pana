<?php
declare(strict_types=1);

use App\Controllers\HealthController;
use App\Repositories\HealthRepository;
use App\Services\HealthService;

return [
    'GET /api/health' => static function (): void {
        try {
            $repository = new HealthRepository(database_connection());
            $service = new HealthService($repository);
            (new HealthController($service))->show();
        } catch (\Throwable $exception) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'database' => 'unavailable']);
        }
    },
];
