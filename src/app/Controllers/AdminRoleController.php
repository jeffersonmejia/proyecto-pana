<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Exceptions\ApiException;
use App\Services\AdminRoleService;

final class AdminRoleController
{
    public function __construct(private AdminRoleService $roles)
    {
    }

    public function index(): void
    {
        echo json_encode(['roles' => $this->roles->all()]);
    }

    public function permissions(): void
    {
        echo json_encode(['permissions' => $this->roles->permissions()]);
    }

    public function save(array $input): void
    {
        http_response_code(isset($input['id']) ? 200 : 201);
        echo json_encode($this->roles->save($input));
    }

    public function delete(int $id): void
    {
        if ($id < 1) throw new ApiException(400, 'invalid_id');
        $this->roles->delete($id);
        echo json_encode(['status' => 'deleted']);
    }
}
