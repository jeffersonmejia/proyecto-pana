<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\EvaluationService;

final class EvaluationController
{
    public function __construct(private EvaluationService $evaluations)
    {
    }

    public function people(mixed $type, mixed $query): void
    {
        echo json_encode(['people' => $this->evaluations->people($type, $query)]);
    }

    public function criteria(): void { echo json_encode(['criteria' => $this->evaluations->criteria()]); }
    public function index(array $filters): void { echo json_encode(['evaluations' => $this->evaluations->all($filters)]); }
    public function show(int $id): void { echo json_encode(['evaluation' => $this->evaluations->one($id)]); }

    public function create(array $input, int $actor): void
    {
        http_response_code(201);
        echo json_encode($this->evaluations->create($input, $actor));
    }

    public function update(array $input): void
    {
        $this->evaluations->update($input);
        echo json_encode(['status' => 'updated']);
    }

    public function createCriterion(array $input): void
    {
        http_response_code(201);
        echo json_encode($this->evaluations->createCriterion($input));
    }

    public function updateCriterion(array $input): void
    {
        $this->evaluations->updateCriterion($input);
        echo json_encode(['status' => 'updated']);
    }
}
