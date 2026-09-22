<?php
declare(strict_types=1);

namespace App\Services;

use App\Validators\PersonInputValidator;
use App\Exceptions\ApiException;
use App\Repositories\PeopleRepository;
use App\Repositories\PersonHistoryRepository;
use PDOException;
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
        $page = \App\Support\Pagination::page($filters['page'] ?? 1);
        if (!in_array($type, ['all', 'participant', 'beneficiary'], true)
            || !in_array($status, ['all', 'active', 'inactive'], true)
            || !is_string($query) || strlen($query) > 120) {
            throw new ApiException(422, 'invalid_filters');
        }
        return $this->people->all(['type' => $type, 'status' => $status, 'q' => trim($query), 'page' => $page,
            '_scope' => $filters['_scope'] ?? []]);
    }

    public function one(int $id, array $actor = []): array
    {
        return $this->people->find($id, $actor) ?? throw new ApiException(404, 'person_not_found');
    }

    public function create(array $input, int $actorId): array
    {
        try {
            return ['id' => $this->people->create($this->validator->person($input), $actorId)];
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_or_ci_already_exists');
            throw $error;
        }
    }

    public function update(array $input, int $actorId): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        try {
            $this->people->update($id, $this->validator->person($input), $actorId);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'email_or_ci_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'person_not_found') throw new ApiException(404, 'person_not_found');
            if ($error->getMessage() === 'linked_account_identity_required') {
                throw new ApiException(422, 'linked_account_requires_ci_and_email');
            }
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

    public function history(int $id, array $actor = []): array
    {
        $this->one($id, $actor);
        return $this->history->forPerson($id);
    }

    public function addNote(int $id, mixed $note, int $actorId, array $actor = []): void
    {
        $this->one($id, $actor);
        $this->history->addNote($id, $actorId, $this->validator->note($note));
    }
}
