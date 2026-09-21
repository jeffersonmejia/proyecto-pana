<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\HealthService;
use Throwable;

final class HealthController
{
    public function __construct(private HealthService $service)
    {
    }

    public function show(): void
    {
        try {
            $available = $this->service->check();
            http_response_code($available ? 200 : 503);
            echo json_encode([
                'status' => $available ? 'ok' : 'error',
                'database' => $available ? 'connected' : 'unavailable',
            ]);
        } catch (Throwable $exception) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'database' => 'unavailable']);
        }
    }
}
