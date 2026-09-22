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
        $result = $this->activities->all($filters);
        echo json_encode(['activities' => $result['items'], 'pagination' => $result['pagination']]);
    }

    public function participants(mixed $query, array $actor): void
    {
        echo json_encode(['participants' => $this->activities->participants($query, $actor)]);
    }

    public function show(int $id, array $actor): void
    {
        echo json_encode(['activity' => $this->activities->one($id, $actor)]);
    }

    public function create(array $input, array $actor): void
    {
        http_response_code(201);
        echo json_encode($this->activities->create($input, (int) $actor['id'], $actor));
    }

    public function update(array $input, array $actor): void
    {
        $this->activities->update($input, (int) $actor['id'], $actor);
        echo json_encode(['status' => 'updated']);
    }

    public function logs(int $id, array $actor): void
    {
        echo json_encode(['logs' => $this->activities->logs($id, $actor)]);
    }

    public function addObservation(array $input, array $actor): void
    {
        $this->activities->addObservation($input, (int) $actor['id'], $actor);
        echo json_encode(['status' => 'added']);
    }
}
