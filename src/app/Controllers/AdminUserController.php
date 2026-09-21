<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\AdminUserService;

final class AdminUserController
{
    public function __construct(private AdminUserService $users)
    {
    }

    public function index(): void
    {
        echo json_encode(['users' => $this->users->all()]);
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
