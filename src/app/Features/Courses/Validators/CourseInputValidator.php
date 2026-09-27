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
        $status = $input['status'] ?? 'active'; $tecnicos = $input['tecnico_user_ids'] ?? [];
        $capacity = $input['max_participants'] ?? null;
        $qrLink = trim((string)($input['qr_link'] ?? ''));
        if ($name === '' || $description === '' || strlen($name) > 150 || strlen($description) > 1000
            || !$this->date($start) || !$this->date($end) || $end < $start
            || !in_array($status, ['active','inactive'], true)) throw new ApiException(422,'invalid_course');
        if (!is_array($tecnicos) || !$tecnicos) throw new ApiException(422,'invalid_tecnicos');
        foreach ($tecnicos as $tecnico) if (filter_var($tecnico,FILTER_VALIDATE_INT) === false || (int)$tecnico < 1) throw new ApiException(422,'invalid_tecnicos');
        if (filter_var($capacity,FILTER_VALIDATE_INT) === false || (int)$capacity < 1 || (int)$capacity > 30) throw new ApiException(422,'invalid_capacity');
        if ($qrLink === '' || strlen($qrLink) > 500 || filter_var($qrLink,FILTER_VALIDATE_URL) === false) throw new ApiException(422,'invalid_qr_link');
        $participants = $input['participant_ids'] ?? null;
        if (!is_array($participants) || count($participants) > (int)$capacity) throw new ApiException(422,'invalid_participants');
        foreach ($participants as $participant) if (filter_var($participant,FILTER_VALIDATE_INT) === false || (int)$participant < 1) throw new ApiException(422,'invalid_participants');
        $participants = array_values(array_unique(array_map('intval',$participants)));
        return ['name'=>$name,'description'=>$description,'start_date'=>$start,'end_date'=>$end,'status'=>$status,
            'tecnico_user_ids'=>array_values(array_unique(array_map('intval',$tecnicos))),'max_participants'=>(int)$capacity,'participant_ids'=>$participants,'qr_link'=>$qrLink];
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
