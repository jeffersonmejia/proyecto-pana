<?php
declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ApiException;
use DateTimeImmutable;

final class AttendanceInputValidator
{
    public function record(array $input, bool $correction = false): array
    {
        $participant = filter_var($input['participant_id'] ?? null, FILTER_VALIDATE_INT);
        if ($participant === false || $participant < 1) throw new ApiException(422, 'invalid_participant');
        $date = $input['attendance_date'] ?? null;
        $parsed = is_string($date) ? DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new ApiException(422, 'invalid_date');
        $status = $input['status'] ?? 'present';
        if (!in_array($status, ['present', 'absent', 'excused'], true)) throw new ApiException(422, 'invalid_status');
        $in = $this->time($input['check_in'] ?? null, 'invalid_check_in');
        $out = $this->time($input['check_out'] ?? null, 'invalid_check_out');
        if ($in !== null && $out !== null && $out <= $in) throw new ApiException(422, 'invalid_time_range');
        if ($status !== 'present' && ($in !== null || $out !== null)) throw new ApiException(422, 'times_require_presence');
        $note = $input['note'] ?? '';
        if (!is_string($note) || strlen($note) > 500) throw new ApiException(422, 'invalid_note');
        $reason = $input['correction_reason'] ?? '';
        if ($correction && (!is_string($reason) || strlen(trim($reason)) < 3 || strlen($reason) > 500)) {
            throw new ApiException(422, 'correction_reason_required');
        }
        return ['participant_id' => (int) $participant, 'attendance_date' => $date, 'status' => $status,
            'check_in' => $in, 'check_out' => $out, 'note' => trim($note), 'correction_reason' => trim($reason)];
    }

    public function checkout(array $input): array
    {
        $participant=filter_var($input['participant_id']??null,FILTER_VALIDATE_INT);
        $date=$input['attendance_date']??null;
        $parsed=is_string($date)?DateTimeImmutable::createFromFormat('!Y-m-d',$date):false;
        $time=$this->time($input['check_out']??null,'invalid_check_out');
        if($participant===false||$participant<1) throw new ApiException(422,'invalid_participant');
        if(!$parsed||$parsed->format('Y-m-d')!==$date) throw new ApiException(422,'invalid_date');
        if($time===null) throw new ApiException(422,'invalid_check_out');
        return ['participant_id'=>(int)$participant,'attendance_date'=>$date,'check_out'=>$time];
    }

    public function filters(array $filters): array
    {
        $id = $filters['participant_id'] ?? '';
        if ($id !== '' && (filter_var($id, FILTER_VALIDATE_INT) === false || (int) $id < 1)) {
            throw new ApiException(422, 'invalid_participant');
        }
        $from = $this->filterDate($filters['from'] ?? '');
        $to = $this->filterDate($filters['to'] ?? '');
        if ($from && $to && $from > $to) throw new ApiException(422, 'invalid_date_range');
        $status = $filters['status'] ?? 'all';
        if (!in_array($status, ['all', 'present', 'absent', 'excused'], true)) throw new ApiException(422, 'invalid_status');
        return ['participant_id' => $id === '' ? null : (int) $id, 'from' => $from, 'to' => $to,
            'status' => $status, 'page' => \App\Support\Pagination::page($filters['page'] ?? 1)];
    }

    public function id(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        return (int) $id;
    }

    private function filterDate(mixed $value): ?string
    {
        if ($value === '') return null;
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (!$date || $date->format('Y-m-d') !== $value) throw new ApiException(422, 'invalid_date');
        return $value;
    }

    private function time(mixed $value, string $error): ?string
    {
        if ($value === null || $value === '') return null;
        if (!is_string($value) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value)) {
            throw new ApiException(422, $error);
        }
        return $value . ':00';
    }
}
