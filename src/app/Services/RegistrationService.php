<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\RegistrationRepository;
use PDOException;

final class RegistrationService
{
    private const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    private const SCHEDULES = ['Mañana', 'Tarde'];

    public function __construct(private RegistrationRepository $registrations, private PasswordService $passwords)
    {
    }

    public function create(array $input): array
    {
        $user = $this->identity($input);
        $data = $this->registration($input);
        if (!$this->registrations->courseIsEligible($data['course'])) throw new ApiException(422, 'course_unavailable');
        try {
            $this->registrations->create($user, $data, $this->passwords->hash($data['password']));
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'registration_already_exists');
            throw $error;
        }
        return ['status' => 'received'];
    }

    public function publicCourses(): array
    {
        return $this->registrations->publicCourses();
    }

    private function identity(array $input): array
    {
        $name = $this->text($input, 'name', 200);
        $parts = preg_split('/\s+/', $name) ?: [];
        if (count($parts) < 2) throw new ApiException(422, 'invalid_name');
        $last = array_pop($parts);
        return ['ci' => $this->ci($input['id'] ?? null), 'first_name' => implode(' ', $parts), 'last_name' => $last,
            'email' => $this->email($input['email'] ?? null), 'phone' => $this->optional($input, 'phone', 40)];
    }

    private function registration(array $input): array
    {
        $birth = $this->date($input['birthDate'] ?? null);
        $age = (int) date_diff(new \DateTimeImmutable($birth), new \DateTimeImmutable('today'))->y;
        if ($age < 18 || $age > 29) throw new ApiException(422, 'age_not_allowed');
        $days = $this->options($input['days'] ?? null, self::DAYS);
        $schedules = $this->options($input['schedules'] ?? null, self::SCHEDULES);
        if (($input['terms'] ?? false) !== true || !$days || !$schedules) throw new ApiException(422, 'invalid_registration_requirements');
        return ['course' => $this->text($input, 'course', 200), 'birth_date' => $birth,
            'gender' => $this->option($input['gender'] ?? null, ['Femenino', 'Masculino', 'Otro']),
            'address' => $this->text($input, 'address', 255), 'institution' => $this->optional($input, 'institution', 150),
            'career' => $this->optional($input, 'career', 150), 'level' => $this->optional($input, 'level', 100),
            'motivation' => $this->text($input, 'motivation', 5000), 'skills' => $this->text($input, 'skills', 5000),
            'volunteer' => $this->option($input['volunteer'] ?? null, ['Si', 'No']), 'volunteer_details' => $this->optional($input, 'volunteerDetails', 5000),
            'days' => $days, 'schedules' => $schedules, 'password' => $this->password($input['password'] ?? null)];
    }

    private function text(array $input, string $key, int $max): string
    {
        $value = $input[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) throw new ApiException(422, 'invalid_registration_input');
        return trim($value);
    }

    private function optional(array $input, string $key, int $max): ?string
    {
        $value = $input[$key] ?? '';
        if (!is_string($value) || strlen($value) > $max) throw new ApiException(422, 'invalid_registration_input');
        return trim($value) ?: null;
    }

    private function ci(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^[A-Za-z0-9-]{5,20}$/', trim($value))) throw new ApiException(422, 'invalid_ci');
        return trim($value);
    }

    private function email(mixed $value): string
    {
        $email = is_string($value) ? strtolower(trim($value)) : '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) throw new ApiException(422, 'invalid_email');
        return $email;
    }

    private function date(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            || !checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4))) throw new ApiException(422, 'invalid_birth_date');
        return $value;
    }

    private function option(mixed $value, array $allowed): string
    {
        if (!is_string($value) || !in_array($value, $allowed, true)) throw new ApiException(422, 'invalid_registration_option');
        return $value;
    }

    private function options(mixed $values, array $allowed): array
    {
        if (!is_array($values)) throw new ApiException(422, 'invalid_registration_options');
        return array_values(array_filter($values, static fn ($value) => is_string($value) && in_array($value, $allowed, true)));
    }

    private function password(mixed $value): string
    {
        if (!is_string($value) || strlen($value) < 12 || strlen($value) > 4096) throw new ApiException(422, 'invalid_password');
        return $value;
    }
}
