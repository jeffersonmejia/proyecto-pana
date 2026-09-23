<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\RegistrationService;

final class RegistrationController
{
    public function __construct(private RegistrationService $registrations)
    {
    }

    public function create(array $input): void
    {
        http_response_code(201);
        echo json_encode($this->registrations->create($input));
    }

    public function courses(): void
    {
        echo json_encode(['courses' => $this->registrations->publicCourses()]);
    }
}
