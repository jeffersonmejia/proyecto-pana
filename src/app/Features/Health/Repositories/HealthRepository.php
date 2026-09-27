<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class HealthRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function databaseIsAvailable(): bool
    {
        return (int) $this->connection->query('SELECT 1')->fetchColumn() === 1;
    }
}
