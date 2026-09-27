<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\ReportService;

final class ReportController
{
    public function __construct(private ReportService $reports)
    {
    }

    public function dashboard(array $actor): void { echo json_encode(['dashboard' => $this->reports->dashboard($actor)]); }
    public function people(mixed $query, array $actor): void { echo json_encode(['people' => $this->reports->people($query, $actor)]); }
    public function report(array $filters, array $actor): void { echo json_encode(['rows' => $this->reports->report($filters, $actor)]); }
}
