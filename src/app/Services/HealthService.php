<?php
declare(strict_types=1);

namespace App\Services;

use App\Repositories\HealthRepository;

final class HealthService
{
    public function __construct(private HealthRepository $repository)
    {
    }

    public function check(): bool
    {
        return $this->repository->databaseIsAvailable();
    }
}
