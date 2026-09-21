<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\ActivityService;

final class ActivityController
{
    public function __construct(private ActivityService $activities)
    {
    }

    public function index(array $filters): void
    {
        echo json_encode(['activities' => $this->activities->all($filters)]);
    }

    public function participants(mixed $query): void
    {
        echo json_encode(['participants' => $this->activities->participants($query)]);
    }

    public function show(int $id): void
    {
        echo json_encode(['activity' => $this->activities->one($id)]);
    }

    public function create(array $input, int $actor): void
    {
        http_response_code(201);
        echo json_encode($this->activities->create($input, $actor));
    }

    public function update(array $input, int $actor): void
    {
        $this->activities->update($input, $actor);
        echo json_encode(['status' => 'updated']);
    }

    public function logs(int $id): void
    {
        echo json_encode(['logs' => $this->activities->logs($id)]);
    }

    public function addObservation(array $input, int $actor): void
    {
        $this->activities->addObservation($input, $actor);
        echo json_encode(['status' => 'added']);
    }
}
