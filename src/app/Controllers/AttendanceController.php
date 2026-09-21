<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\AttendanceService;

final class AttendanceController
{
    public function __construct(private AttendanceService $attendance)
    {
    }

    public function index(array $filters): void
    {
        echo json_encode(['records' => $this->attendance->all($filters)]);
    }

    public function participants(mixed $query): void
    {
        echo json_encode(['participants' => $this->attendance->participants($query)]);
    }

    public function show(int $id): void
    {
        echo json_encode(['record' => $this->attendance->one($id)]);
    }

    public function create(array $input, int $actor): void
    {
        http_response_code(201);
        echo json_encode($this->attendance->create($input, $actor));
    }

    public function update(array $input, int $actor): void
    {
        $this->attendance->update($input, $actor);
        echo json_encode(['status' => 'corrected']);
    }

    public function history(int $id): void
    {
        echo json_encode(['history' => $this->attendance->history($id)]);
    }
}
