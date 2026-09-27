<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\EvaluationService;

final class EvaluationController
{
    public function __construct(private EvaluationService $evaluations)
    {
    }

    public function people(mixed $type, mixed $query, array $actor): void
    {
        echo json_encode(['people' => $this->evaluations->people($type, $query, $actor)]);
    }

    public function criteria(): void { echo json_encode(['criteria' => $this->evaluations->criteria()]); }
    public function index(array $filters): void
    {
        $result = $this->evaluations->all($filters);
        echo json_encode(['evaluations' => $result['items'], 'pagination' => $result['pagination']]);
    }
    public function show(int $id, array $actor): void { echo json_encode(['evaluation' => $this->evaluations->one($id, $actor)]); }

    public function create(array $input, array $actor): void
    {
        http_response_code(201);
        echo json_encode($this->evaluations->create($input, $actor));
    }

    public function update(array $input, array $actor): void
    {
        $this->evaluations->update($input, $actor);
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
