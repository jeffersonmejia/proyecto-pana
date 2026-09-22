<?php
declare(strict_types=1);

use App\Controllers\ReportController;
use App\Repositories\ReportRepository;
use App\Services\ReportService;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $controller = static function () use ($buildAuth): ReportController {
        return new ReportController(new ReportService(new ReportRepository(database_connection())));
    };
    $read = static function () use ($buildAuth, $authorize): array {
        return $authorize($buildAuth(), 'reports.read');
    };
    return [
        'GET /api/reports/dashboard' => static function () use ($controller, $read): void {
            $actor = $read(); $controller()->dashboard($actor);
        },
        'GET /api/reports/people' => static function () use ($controller, $read): void {
            $actor = $read(); $controller()->people($_GET['q'] ?? '', $actor);
        },
        'GET /api/reports' => static function () use ($controller, $read): void {
            $actor = $read(); $controller()->report($_GET, $actor);
        },
    ];
};
