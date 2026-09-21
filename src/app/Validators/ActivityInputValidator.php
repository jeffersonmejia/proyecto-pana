<?php
declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ApiException;
use DateTimeImmutable;

final class ActivityInputValidator
{
    public function activity(array $input): array
    {
        $title = $input['title'] ?? null;
        $responsible = $input['responsible'] ?? null;
        $description = $input['description'] ?? '';
        if (!is_string($title) || trim($title) === '' || strlen($title) > 150) throw new ApiException(422, 'invalid_title');
        if (!is_string($responsible) || trim($responsible) === '' || strlen($responsible) > 120) {
            throw new ApiException(422, 'invalid_responsible');
        }
        if (!is_string($description) || strlen($description) > 1500) throw new ApiException(422, 'invalid_description');
        $start = $this->dateTime($input['start_at'] ?? null);
        $end = $this->dateTime($input['end_at'] ?? null);
        if ($end <= $start) throw new ApiException(422, 'invalid_activity_range');
        $status = $input['status'] ?? 'planned';
        if (!in_array($status, ['planned', 'in_progress', 'completed', 'cancelled'], true)) {
            throw new ApiException(422, 'invalid_activity_status');
        }
        $participants = $input['participant_ids'] ?? null;
        if (!is_array($participants) || !$participants || count($participants) > 100) {
            throw new ApiException(422, 'invalid_activity_participants');
        }
        foreach ($participants as $id) {
            if (filter_var($id, FILTER_VALIDATE_INT) === false || (int) $id < 1) {
                throw new ApiException(422, 'invalid_activity_participants');
            }
        }
        return ['title' => trim($title), 'description' => trim($description), 'responsible' => trim($responsible),
            'start_at' => $start, 'end_at' => $end, 'status' => $status,
            'participant_ids' => array_values(array_unique(array_map('intval', $participants)))];
    }

    public function filters(array $filters): array
    {
        $participant = $filters['participant_id'] ?? '';
        if ($participant !== '' && (filter_var($participant, FILTER_VALIDATE_INT) === false || (int) $participant < 1)) {
            throw new ApiException(422, 'invalid_participant');
        }
        $from = $this->date($filters['from'] ?? '');
        $to = $this->date($filters['to'] ?? '');
        if ($from && $to && $from > $to) throw new ApiException(422, 'invalid_date_range');
        $status = $filters['status'] ?? 'all';
        if (!in_array($status, ['all', 'planned', 'in_progress', 'completed', 'cancelled'], true)) {
            throw new ApiException(422, 'invalid_activity_status');
        }
        return ['participant_id' => $participant === '' ? null : (int) $participant,
            'from' => $from, 'to' => $to, 'status' => $status];
    }

    public function id(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        return (int) $id;
    }

    public function observation(mixed $value): string
    {
        if (!is_string($value) || trim($value) === '' || strlen($value) > 1000) {
            throw new ApiException(422, 'invalid_observation');
        }
        return trim($value);
    }

    private function dateTime(mixed $value): string
    {
        if (!is_string($value)) throw new ApiException(422, 'invalid_activity_datetime');
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $value);
        if (!$date || $date->format('Y-m-d\TH:i') !== $value) throw new ApiException(422, 'invalid_activity_datetime');
        return str_replace('T', ' ', $value) . ':00';
    }

    private function date(mixed $value): ?string
    {
        if ($value === '') return null;
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (!$date || $date->format('Y-m-d') !== $value) throw new ApiException(422, 'invalid_date');
        return $value;
    }
}
