<?php
declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ApiException;
use DateTimeImmutable;

final class EvaluationInputValidator
{
    public function record(array $input): array
    {
        $type = $input['evaluation_type'] ?? null;
        if (!in_array($type, ['participant', 'satisfaction'], true)) throw new ApiException(422, 'invalid_evaluation_type');
        $person = filter_var($input['person_id'] ?? null, FILTER_VALIDATE_INT);
        if ($person === false || $person < 1) throw new ApiException(422, 'invalid_person');
        $dateValue = $input['evaluated_on'] ?? null;
        $date = is_string($dateValue) ? DateTimeImmutable::createFromFormat('!Y-m-d', $dateValue) : false;
        if (!$date || $date->format('Y-m-d') !== $dateValue) throw new ApiException(422, 'invalid_date');
        $observations = $input['observations'] ?? '';
        if (!is_string($observations) || strlen($observations) > 1000) throw new ApiException(422, 'invalid_observations');
        $score = $input['satisfaction_score'] ?? null;
        $answers = $input['answers'] ?? [];
        if ($type === 'satisfaction') {
            if (filter_var($score, FILTER_VALIDATE_INT) === false || (int) $score < 1 || (int) $score > 5) {
                throw new ApiException(422, 'invalid_satisfaction_score');
            }
            if (!is_array($answers) || $answers) throw new ApiException(422, 'invalid_satisfaction_answers');
        } else {
            if (!is_array($answers) || !$answers || count($answers) > 100) throw new ApiException(422, 'invalid_answers');
            foreach ($answers as $answer) {
                if (!is_array($answer)) throw new ApiException(422, 'invalid_answer');
                $id = filter_var($answer['criterion_id'] ?? null, FILTER_VALIDATE_INT);
                $value = filter_var($answer['score'] ?? null, FILTER_VALIDATE_INT);
                if ($id === false || $id < 1 || $value === false || $value < 1 || $value > 5) {
                    throw new ApiException(422, 'invalid_answer');
                }
                if (isset($answer['note']) && (!is_string($answer['note']) || strlen($answer['note']) > 500)) {
                    throw new ApiException(422, 'invalid_answer_note');
                }
            }
        }
        return ['type' => $type, 'person_id' => (int) $person, 'evaluated_on' => $dateValue,
            'satisfaction_score' => $type === 'satisfaction' ? (int) $score : null,
            'observations' => trim($observations), 'answers' => $this->uniqueAnswers($answers)];
    }

    public function filters(array $input): array
    {
        $type = $input['type'] ?? 'participant';
        if (!in_array($type, ['participant', 'satisfaction'], true)) throw new ApiException(422, 'invalid_evaluation_type');
        $person = $input['person_id'] ?? '';
        if ($person !== '' && (filter_var($person, FILTER_VALIDATE_INT) === false || (int) $person < 1)) {
            throw new ApiException(422, 'invalid_person');
        }
        $from = $this->filterDate($input['from'] ?? '');
        $to = $this->filterDate($input['to'] ?? '');
        if ($from && $to && $from > $to) throw new ApiException(422, 'invalid_date_range');
        return ['type' => $type, 'person_id' => $person === '' ? null : (int) $person, 'from' => $from, 'to' => $to];
    }

    public function criterion(array $input): array
    {
        $name = $input['name'] ?? null;
        $description = $input['description'] ?? '';
        if (!is_string($name) || trim($name) === '' || strlen($name) > 100) throw new ApiException(422, 'invalid_criterion_name');
        if (!is_string($description) || strlen($description) > 300) throw new ApiException(422, 'invalid_criterion_description');
        return ['name' => trim($name), 'description' => trim($description)];
    }

    public function id(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        return (int) $id;
    }

    private function uniqueAnswers(array $answers): array
    {
        $ids = array_column($answers, 'criterion_id');
        if (count(array_unique($ids)) !== count($ids)) throw new ApiException(422, 'duplicate_criterion');
        return array_map(static function (array $answer): array {
            return ['criterion_id' => (int) $answer['criterion_id'], 'score' => (int) $answer['score'],
                'note' => trim($answer['note'] ?? '')];
        }, $answers);
    }

    private function filterDate(mixed $value): ?string
    {
        if ($value === '') return null;
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (!$date || $date->format('Y-m-d') !== $value) throw new ApiException(422, 'invalid_date');
        return $value;
    }
}
