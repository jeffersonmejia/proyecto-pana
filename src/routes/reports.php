<?php
declare(strict_types=1);

use App\Controllers\ReportController;
use App\Repositories\ReportRepository;
use App\Services\ReportService;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $controller = static function () use ($buildAuth): ReportController {
        return new ReportController(new ReportService(new ReportRepository(database_connection())));
    };
    $read = static function () use ($buildAuth, $authorize): void {
        $authorize($buildAuth(), 'reports.read');
    };
    return [
        'GET /api/reports/dashboard' => static function () use ($controller, $read): void {
            $read(); $controller()->dashboard();
        },
        'GET /api/reports/people' => static function () use ($controller, $read): void {
            $read(); $controller()->people($_GET['q'] ?? '');
        },
        'GET /api/reports' => static function () use ($controller, $read): void {
            $read(); $controller()->report($_GET);
        },
    ];
};
