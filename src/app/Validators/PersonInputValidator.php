<?php
declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ApiException;

final class PersonInputValidator
{
    public function person(array $input): array
    {
        $first = $this->text($input['first_name'] ?? null, 100, 'invalid_first_name');
        $last = $this->text($input['last_name'] ?? null, 100, 'invalid_last_name');
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $status = $input['status'] ?? 'active';
        $types = $input['types'] ?? null;

        if (!is_string($email) || strlen($email) > 254
            || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) {
            throw new ApiException(422, 'invalid_email');
        }
        if (!is_string($phone) || strlen($phone) > 40
            || ($phone !== '' && !preg_match('/^[+0-9() .-]+$/', $phone))) {
            throw new ApiException(422, 'invalid_phone');
        }
        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new ApiException(422, 'invalid_status');
        }
        if (!is_array($types) || !$types || count($types) > 2) {
            throw new ApiException(422, 'invalid_person_types');
        }
        foreach ($types as $type) {
            if (!is_string($type) || !in_array($type, ['participant', 'beneficiary'], true)) {
                throw new ApiException(422, 'invalid_person_types');
            }
        }

        return [
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email === '' ? null : strtolower(trim($email)),
            'phone' => $phone === '' ? null : trim($phone),
            'status' => $status,
            'types' => array_values(array_unique($types)),
        ];
    }

    public function id(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        return $id;
    }

    public function note(mixed $value): string
    {
        if (!is_string($value) || trim($value) === '' || strlen($value) > 500) {
            throw new ApiException(422, 'invalid_history_note');
        }
        return trim($value);
    }

    private function text(mixed $value, int $max, string $error): string
    {
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) {
            throw new ApiException(422, $error);
        }
        return trim($value);
    }
}
