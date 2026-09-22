<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\ReportRepository;
use DateTimeImmutable;

final class ReportService
{
    public function __construct(private ReportRepository $reports)
    {
    }

    public function dashboard(array $actor): array { return $this->reports->dashboard($actor); }

    public function people(mixed $query, array $actor): array
    {
        if (!is_string($query) || strlen($query) > 100) throw new ApiException(422, 'invalid_search');
        return $this->reports->people(trim($query), $actor);
    }

    public function report(array $input, array $actor): array
    {
        $type = $input['type'] ?? '';
        if (!in_array($type, ['attendance', 'activities', 'evaluations'], true)) throw new ApiException(422, 'invalid_report_type');
        $person = $input['person_id'] ?? '';
        if ($person !== '' && (filter_var($person, FILTER_VALIDATE_INT) === false || (int) $person < 1)) {
            throw new ApiException(422, 'invalid_person');
        }
        $from = $this->date($input['from'] ?? '');
        $to = $this->date($input['to'] ?? '');
        if ($from && $to && $from > $to) throw new ApiException(422, 'invalid_date_range');
        return $this->reports->report(['type' => $type, 'person_id' => $person === '' ? null : (int) $person,
            'from' => $from, 'to' => $to], $actor);
    }

    private function date(mixed $value): ?string
    {
        if ($value === '') return null;
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (!$date || $date->format('Y-m-d') !== $value) throw new ApiException(422, 'invalid_date');
        return $value;
    }
}
