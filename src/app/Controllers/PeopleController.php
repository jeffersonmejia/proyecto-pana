<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\PeopleService;

final class PeopleController
{
    public function __construct(private PeopleService $people)
    {
    }

    public function index(array $filters): void
    {
        $result = $this->people->all($filters);
        echo json_encode(['people' => $result['items'], 'pagination' => $result['pagination']]);
    }

    public function show(int $id, array $actor): void
    {
        echo json_encode(['person' => $this->people->one($id, $actor)]);
    }

    public function create(array $input, int $actorId): void
    {
        http_response_code(201);
        echo json_encode($this->people->create($input, $actorId));
    }

    public function update(array $input, int $actorId): void
    {
        $this->people->update($input, $actorId);
        echo json_encode(['status' => 'updated']);
    }

    public function delete(int $id): void
    {
        $this->people->delete($id);
        echo json_encode(['status' => 'deleted']);
    }

    public function history(int $id, array $actor): void
    {
        echo json_encode(['history' => $this->people->history($id, $actor)]);
    }

    public function addNote(int $id, mixed $note, int $actorId, array $actor): void
    {
        $this->people->addNote($id, $note, $actorId, $actor);
        echo json_encode(['status' => 'added']);
    }
}
