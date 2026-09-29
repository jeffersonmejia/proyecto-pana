<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\RegistrationRepository;
use PDOException;

final class RegistrationService
{
    private const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    private const SCHEDULES = ['08:30 a 12:30', '14:30 a 16:30'];
    private const SELF_IDENTIFICATIONS = ['Indígena', 'Afroecuatoriano/a', 'Negro/a', 'Mulato/a', 'Montubio/a', 'Mestizo/a', 'Blanco/a', 'Otro/a'];
    private const DISABILITY_TYPES = ['Visual', 'Auditiva', 'Física', 'Intelectual', 'Psicosocial', 'Del lenguaje', 'Múltiple', 'Otra'];

    public function __construct(private RegistrationRepository $registrations, private PasswordService $passwords)
    {
    }

    public function create(array $input): array
    {
        $user = $this->identity($input);
        $data = $this->registration($input);
        $duplicate = $this->registrations->duplicateIdentity($user['ci'], $user['email'], $user['phone'] ?? '');
        if ($duplicate !== null) throw new ApiException(409, $duplicate);
        try {
            $this->registrations->create($user, $data, $this->passwords->hash($data['password']));
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                throw new ApiException(409, $this->registrations->duplicateIdentity($user['ci'], $user['email'], $user['phone'] ?? '') ?? 'registration_identity_already_exists');
            }
            throw $error;
        }
        return ['status' => 'received'];
    }

    public function publicCourses(): array
    {
        return $this->registrations->publicCourses();
    }

    public function checkIdentity(string $ci, string $email, string $phone): array
    {
        $duplicate = $this->registrations->duplicateIdentity($this->ci($ci), $this->email($email), $this->optionalPhone($phone));
        if ($duplicate !== null) throw new ApiException(409, $duplicate);
        return ['available' => true];
    }

    private function identity(array $input): array
    {
        $name = $this->text($input, 'name', 200);
        $parts = preg_split('/\s+/', $name) ?: [];
        if (count($parts) < 2 || array_filter($parts, static fn (string $part): bool => !preg_match('/^[\p{L}]+(?:[-\'][\p{L}]+)*$/u', $part))) throw new ApiException(422, 'invalid_name');
        $firstCount = count($parts) === 4 ? 2 : 1;
        return ['ci' => $this->ci($input['id'] ?? null), 'first_name' => implode(' ', array_slice($parts, 0, $firstCount)), 'last_name' => implode(' ', array_slice($parts, $firstCount)),
            'email' => $this->email($input['email'] ?? null), 'phone' => $this->optional($input, 'phone', 40)];
    }

    private function registration(array $input): array
    {
        $birth = $this->date($input['birthDate'] ?? null);
        $age = (int) date_diff(new \DateTimeImmutable($birth), new \DateTimeImmutable('today'))->y;
        if ($age < 18 || $age > 29) throw new ApiException(422, 'age_not_allowed');
        $role = $this->option($input['role'] ?? 'beneficiary', ['beneficiary', 'student']);
        $days = $this->options($input['days'] ?? null, self::DAYS);
        $schedules = $this->options($input['schedules'] ?? null, self::SCHEDULES);
        if (($input['terms'] ?? false) !== true || !$days || !$schedules) throw new ApiException(422, 'invalid_registration_requirements');
        $institution = $role === 'student' ? $this->text($input, 'institution', 150) : null;
        $career = $role === 'student' ? $this->text($input, 'career', 150) : null;
        $level = $role === 'student' ? $this->text($input, 'level', 100) : null;
        $practiceHours = $role === 'student' ? $this->positiveHours($input['practiceHours'] ?? null) : null;
        $volunteer = $role === 'student' ? $this->option($input['volunteer'] ?? null, ['Si', 'No']) : 'No';
        $skills = $role === 'student' ? $this->text($input, 'skills', 5000) : null;
        $hasDisability = $this->option($input['hasDisability'] ?? null, ['Si', 'No']);
        $disabilityType = $hasDisability === 'Si' ? $this->option($input['disabilityType'] ?? null, self::DISABILITY_TYPES) : null;
        return ['role' => $role, 'course' => '', 'birth_date' => $birth,
            'gender' => $this->option($input['gender'] ?? null, ['Femenino', 'Masculino', 'Otro']),
            'birth_province' => $this->text($input, 'birthProvince', 80), 'birth_city' => $this->text($input, 'birthCity', 120),
            'self_identification' => $this->option($input['selfIdentification'] ?? null, self::SELF_IDENTIFICATIONS),
            'has_disability' => $hasDisability, 'disability_type' => $disabilityType,
            'address' => $this->text($input, 'address', 255), 'sector' => $this->text($input, 'sector', 150), 'latitude' => $this->coordinate($input['latitude'] ?? null),
            'longitude' => $this->coordinate($input['longitude'] ?? null), 'institution' => $institution,
            'career' => $career, 'education' => $this->text($input, 'education', 180), 'level' => $level, 'practice_hours' => $practiceHours,
            'motivation' => $this->text($input, 'motivation', 5000), 'skills' => $skills,
            'volunteer' => $volunteer, 'volunteer_details' => $role === 'student' ? $this->optional($input, 'volunteerDetails', 5000) : null,
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

    private function optionalPhone(mixed $value): string
    {
        $phone = is_string($value) ? trim($value) : '';
        if ($phone !== '' && !preg_match('/^09\d{8}$/', $phone)) throw new ApiException(422, 'invalid_phone');
        return $phone;
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
        if (!is_string($value) || strlen($value) < 12 || strlen($value) > 4096
            || !preg_match('/\d/', $value) || !preg_match('/\p{L}/u', $value)) throw new ApiException(422, 'invalid_password');
        return $value;
    }

    private function positiveHours(mixed $value): int
    {
        if (!is_string($value) || !preg_match('/^[1-9][0-9]{0,2}$/', $value)) throw new ApiException(422, 'invalid_practice_hours');
        return (int) $value;
    }

    private function coordinate(mixed $value): ?float
    {
        if ($value === null || $value === '') return null;
        $number = filter_var($value, FILTER_VALIDATE_FLOAT);
        if ($number === false || abs((float) $number) > 180) throw new ApiException(422, 'invalid_location');
        return (float) $number;
    }
}
