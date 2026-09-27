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
        $result = $this->attendance->all($filters);
        echo json_encode(['records' => $result['items'], 'pagination' => $result['pagination']]);
    }

    public function participants(mixed $query, array $actor): void
    {
        echo json_encode(['participants' => $this->attendance->participants($query, $actor)]);
    }

    public function show(int $id, array $actor): void
    {
        echo json_encode(['record' => $this->attendance->one($id, $actor)]);
    }

    public function create(array $input, array $actor): void
    {
        http_response_code(201);
        echo json_encode($this->attendance->create($input, (int) $actor['id'], $actor));
    }

    public function checkout(array $input,array $actor): void
    {
        $this->attendance->checkout($input,(int)$actor['id'],$actor);
        echo json_encode(['status'=>'checked_out']);
    }

    public function update(array $input, array $actor): void
    {
        $this->attendance->update($input, (int) $actor['id'], $actor);
        echo json_encode(['status' => 'corrected']);
    }

    public function history(int $id, array $actor): void
    {
        echo json_encode(['history' => $this->attendance->history($id, $actor)]);
    }
}
