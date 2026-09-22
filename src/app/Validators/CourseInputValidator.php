<?php
declare(strict_types=1);
namespace App\Validators;
use App\Exceptions\ApiException;
final class CourseInputValidator
{
    public function course(array $input): array
    {
        $name = trim((string)($input['name'] ?? ''));
        $description = trim((string)($input['description'] ?? ''));
        $start = $input['start_date'] ?? ''; $end = $input['end_date'] ?? '';
        $status = $input['status'] ?? 'active'; $tutor = $input['tutor_user_id'] ?? null;
        $capacity = $input['max_participants'] ?? null;
        if ($name === '' || $description === '' || strlen($name) > 150 || strlen($description) > 1000
            || !$this->date($start) || !$this->date($end) || $end < $start
            || !in_array($status, ['active','inactive'], true)) throw new ApiException(422,'invalid_course');
        if (filter_var($tutor,FILTER_VALIDATE_INT) === false || (int)$tutor < 1) throw new ApiException(422,'invalid_tutor');
        if (filter_var($capacity,FILTER_VALIDATE_INT) === false || (int)$capacity < 1 || (int)$capacity > 30) throw new ApiException(422,'invalid_capacity');
        $participants = $input['participant_ids'] ?? null;
        if (!is_array($participants) || !$participants || count($participants) > (int)$capacity) throw new ApiException(422,'invalid_participants');
        foreach ($participants as $participant) if (filter_var($participant,FILTER_VALIDATE_INT) === false || (int)$participant < 1) throw new ApiException(422,'invalid_participants');
        $participants = array_values(array_unique(array_map('intval',$participants)));
        return ['name'=>$name,'description'=>$description,'start_date'=>$start,'end_date'=>$end,'status'=>$status,
            'tutor_user_id'=>(int)$tutor,'max_participants'=>(int)$capacity,'participant_ids'=>$participants];
    }
    public function id(mixed $id): int
    {
        $value=filter_var($id,FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400,'invalid_id');
        return (int)$value;
    }
    private function date(mixed $value): bool
    {
        if (!is_string($value)) return false;
        $date=\DateTimeImmutable::createFromFormat('!Y-m-d',$value);
        return $date && $date->format('Y-m-d') === $value;
    }
}
