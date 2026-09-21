<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\EvaluationRepository;
use App\Validators\EvaluationInputValidator;
use PDOException;
use RuntimeException;

final class EvaluationService
{
    public function __construct(private EvaluationRepository $evaluations, private EvaluationInputValidator $validator)
    {
    }

    public function people(mixed $type, mixed $query): array
    {
        if (!in_array($type, ['participant', 'beneficiary'], true) || !is_string($query) || strlen($query) > 100) {
            throw new ApiException(422, 'invalid_person_search');
        }
        return $this->evaluations->people($type, trim($query));
    }

    public function criteria(): array { return $this->evaluations->criteria(); }
    public function all(array $filters): array { return $this->evaluations->all($this->validator->filters($filters)); }

    public function one(int $id): array
    {
        return $this->evaluations->find($id) ?? throw new ApiException(404, 'evaluation_not_found');
    }

    public function create(array $input, int $actor): array
    {
        $data = $this->validator->record($input);
        $this->assertRole($data['person_id'], $data['type']);
        $this->assertActiveCriteria($data['answers']);
        return ['id' => $this->evaluations->create($data, $actor)];
    }

    public function update(array $input): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $old = $this->one($id);
        $data = $this->validator->record($input);
        if ($old['evaluation_type'] !== $data['type']) throw new ApiException(422, 'evaluation_type_immutable');
        $this->assertRole($data['person_id'], $data['type']);
        $this->assertActiveCriteria($data['answers']);
        $this->evaluations->update($id, $data);
    }

    public function createCriterion(array $input): array
    {
        try { return ['id' => $this->evaluations->createCriterion($this->validator->criterion($input))]; }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'criterion_already_exists');
            throw $error;
        }
    }

    public function updateCriterion(array $input): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $active = $input['is_active'] ?? null;
        if (!in_array($active, [true, false, 0, 1, '0', '1'], true)) throw new ApiException(422, 'invalid_criterion_state');
        try { $this->evaluations->updateCriterion($id, $this->validator->criterion($input), (bool) $active); }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'criterion_already_exists');
            throw $error;
        }
        catch (RuntimeException $error) {
            if ($error->getMessage() === 'criterion_not_found') throw new ApiException(404, 'criterion_not_found');
            throw $error;
        }
    }

    private function assertRole(int $id, string $type): void
    {
        if (!$this->evaluations->hasRole($id, $type)) throw new ApiException(422, 'person_not_in_evaluation_type');
    }

    private function assertActiveCriteria(array $answers): void
    {
        $active = array_column($this->evaluations->criteria(true), 'id');
        foreach ($answers as $answer) {
            if (!in_array($answer['criterion_id'], array_map('intval', $active), true)) {
                throw new ApiException(422, 'criterion_not_active');
            }
        }
    }
}
