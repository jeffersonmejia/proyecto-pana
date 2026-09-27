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
        $ci = $input['ci'] ?? '';
        $birthDate = $input['birth_date'] ?? '';
        $address = $input['address'] ?? '';
        $observations = $input['observations'] ?? '';

        if (!is_string($email) || strlen($email) > 254
            || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) {
            throw new ApiException(422, 'invalid_email');
        }
        if (!is_string($phone) || strlen($phone) > 40
            || ($phone !== '' && !preg_match('/^[+0-9() .-]+$/', $phone))) {
            throw new ApiException(422, 'invalid_phone');
        }
        if (!is_string($ci) || ($ci !== '' && !preg_match('/^[A-Za-z0-9-]{5,20}$/', trim($ci)))) {
            throw new ApiException(422, 'invalid_ci');
        }
        if (!is_string($address) || strlen($address) > 255
            || !is_string($observations) || strlen($observations) > 5000) {
            throw new ApiException(422, 'invalid_beneficiary_profile');
        }
        if ($birthDate !== '' && (!is_string($birthDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate)
            || !checkdate((int) substr($birthDate, 5, 2), (int) substr($birthDate, 8, 2), (int) substr($birthDate, 0, 4)))) {
            throw new ApiException(422, 'invalid_birth_date');
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
            'ci' => trim($ci) === '' ? null : trim($ci),
            'email' => $email === '' ? null : strtolower(trim($email)),
            'phone' => $phone === '' ? null : trim($phone),
            'birth_date' => $birthDate === '' ? null : $birthDate,
            'address' => trim($address) === '' ? null : trim($address),
            'observations' => trim($observations) === '' ? null : trim($observations),
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
