<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\ReportService;

final class ReportController
{
    public function __construct(private ReportService $reports)
    {
    }

    public function dashboard(): void { echo json_encode(['dashboard' => $this->reports->dashboard()]); }
    public function people(mixed $query): void { echo json_encode(['people' => $this->reports->people($query)]); }
    public function report(array $filters): void { echo json_encode(['rows' => $this->reports->report($filters)]); }
}
