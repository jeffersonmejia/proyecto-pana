<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\AdminUserService;

final class AdminUserController
{
    public function __construct(private AdminUserService $users, private \App\Repositories\StudentLookupRepository $students)
    {
    }

    public function index(mixed $page): void
    {
        $result = $this->users->all($page);
        echo json_encode(['users' => $result['items'], 'pagination' => $result['pagination']]);
    }

    public function beneficiaries(mixed $query, mixed $personId): void
    {
        echo json_encode(['people' => $this->users->beneficiaryPeople($query, $personId)]);
    }

    public function students(mixed $query, mixed $userId): void
    {
        $id = $userId === null || $userId === '' ? null : filter_var($userId, FILTER_VALIDATE_INT);
        if (!is_string($query) || strlen(trim($query)) > 100 || (strlen(trim($query)) < 2 && $id === null)
            || $id === false || ($id !== null && $id < 1)) {
            throw new ApiException(422, 'student_search_too_short');
        }
        echo json_encode(['students' => $this->students->search(trim($query), $id === null ? null : (int) $id)]);
    }

    public function create(array $input): void
    {
        http_response_code(201);
        echo json_encode($this->users->create($input));
    }

    public function update(array $input, int $actorId): void
    {
        $this->users->update($input, $actorId);
        echo json_encode(['status' => 'updated']);
    }

    public function delete(int $id, int $actorId): void
    {
        if ($id < 1) throw new ApiException(400, 'invalid_id');
        $this->users->delete($id, $actorId);
        echo json_encode(['status' => 'deleted']);
    }
}
