<?php
declare(strict_types=1);

namespace App\Services;

use App\Validators\PersonInputValidator;
use App\Exceptions\ApiException;
use App\Repositories\PeopleRepository;
use App\Repositories\PersonHistoryRepository;
use RuntimeException;

final class PeopleService
{
    public function __construct(
        private PeopleRepository $people,
        private PersonHistoryRepository $history,
        private PersonInputValidator $validator
    ) {
    }

    public function all(array $filters): array
    {
        $type = $filters['type'] ?? 'all';
        $status = $filters['status'] ?? 'all';
        $query = $filters['q'] ?? '';
        if (!in_array($type, ['all', 'participant', 'beneficiary'], true)
            || !in_array($status, ['all', 'active', 'inactive'], true)
            || !is_string($query) || strlen($query) > 120) {
            throw new ApiException(422, 'invalid_filters');
        }
        return $this->people->all(['type' => $type, 'status' => $status, 'q' => trim($query)]);
    }

    public function one(int $id): array
    {
        return $this->people->find($id) ?? throw new ApiException(404, 'person_not_found');
    }

    public function create(array $input, int $actorId): array
    {
        return ['id' => $this->people->create($this->validator->person($input), $actorId)];
    }

    public function update(array $input, int $actorId): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        try {
            $this->people->update($id, $this->validator->person($input), $actorId);
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'person_not_found') throw new ApiException(404, 'person_not_found');
            throw $error;
        }
    }

    public function delete(int $id): void
    {
        try {
            $this->people->delete($id);
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'person_not_found') throw new ApiException(404, 'person_not_found');
            throw $error;
        }
    }

    public function history(int $id): array
    {
        $this->one($id);
        return $this->history->forPerson($id);
    }

    public function addNote(int $id, mixed $note, int $actorId): void
    {
        $this->one($id);
        $this->history->addNote($id, $actorId, $this->validator->note($note));
    }
}
