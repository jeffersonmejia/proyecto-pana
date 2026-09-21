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
        echo json_encode(['people' => $this->people->all($filters)]);
    }

    public function show(int $id): void
    {
        echo json_encode(['person' => $this->people->one($id)]);
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

    public function history(int $id): void
    {
        echo json_encode(['history' => $this->people->history($id)]);
    }

    public function addNote(int $id, mixed $note, int $actorId): void
    {
        $this->people->addNote($id, $note, $actorId);
        echo json_encode(['status' => 'added']);
    }
}
