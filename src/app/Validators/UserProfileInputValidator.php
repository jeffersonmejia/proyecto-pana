<?php
declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ApiException;

final class UserProfileInputValidator
{
    public function validate(string $role, mixed $input): array
    {
        if (!is_array($input)) throw new ApiException(422, 'invalid_profile');
        $profile = match ($role) {
            'coordinator' => [
                'position' => $this->text($input, 'position', 100),
                'institutional_phone' => $this->optional($input, 'institutional_phone', 20),
            ],
            'tutor' => [
                'institution' => $this->text($input, 'institution', 150),
                'position' => $this->optional($input, 'position', 100),
                'student_person_ids' => $this->ids($input['student_person_ids'] ?? []),
            ],
            'student' => $this->student($input),
            'volunteer' => [
                'birth_date' => $this->date($input['birth_date'] ?? null, true),
                'address' => $this->optional($input, 'address', 255),
                'entry_date' => $this->date($input['entry_date'] ?? null),
            ],
            'beneficiary' => [
                'birth_date' => $this->date($input['birth_date'] ?? null, true),
                'address' => $this->optional($input, 'address', 255),
                'observations' => $this->optional($input, 'observations', 5000),
            ],
            default => [],
        };
        $active = $input['is_active'] ?? true;
        if (!is_bool($active)) throw new ApiException(422, 'invalid_profile_status');
        return $profile + ['is_active' => $active];
    }

    private function student(array $input): array
    {
        $required = $this->decimal($input['hours_required'] ?? null);
        $completed = $this->decimal($input['hours_completed'] ?? 0);
        $start = $this->date($input['start_date'] ?? null);
        $end = $this->date($input['end_date'] ?? null, true);
        if ($end !== null && $end < $start) throw new ApiException(422, 'invalid_date_range');
        return [
            'university' => $this->text($input, 'university', 150),
            'career' => $this->text($input, 'career', 150),
            'process_type' => $this->text($input, 'process_type', 50),
            'hours_required' => $required,
            'hours_completed' => $completed,
            'start_date' => $start,
            'end_date' => $end,
        ];
    }

    private function text(array $input, string $key, int $max): string
    {
        $value = $input[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) {
            throw new ApiException(422, 'invalid_profile');
        }
        return trim($value);
    }

    private function optional(array $input, string $key, int $max): ?string
    {
        $value = $input[$key] ?? '';
        if (!is_string($value) || strlen($value) > $max) throw new ApiException(422, 'invalid_profile');
        return trim($value) === '' ? null : trim($value);
    }

    private function date(mixed $value, bool $optional = false): ?string
    {
        if ($optional && ($value === null || $value === '')) return null;
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            || !checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4))) {
            throw new ApiException(422, 'invalid_profile_date');
        }
        return $value;
    }

    private function decimal(mixed $value): float
    {
        if (!is_numeric($value) || (float) $value < 0 || (float) $value > 999999.99) {
            throw new ApiException(422, 'invalid_profile_hours');
        }
        return round((float) $value, 2);
    }

    private function ids(mixed $values): array
    {
        if (!is_array($values) || count($values) > 100) throw new ApiException(422, 'invalid_tutor_students');
        foreach ($values as $id) {
            if (filter_var($id, FILTER_VALIDATE_INT) === false || (int) $id < 1) {
                throw new ApiException(422, 'invalid_tutor_students');
            }
        }
        return array_values(array_unique(array_map('intval', $values)));
    }
}
