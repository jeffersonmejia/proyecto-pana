<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\ActivityRepository;
use App\Validators\ActivityInputValidator;
use RuntimeException;

final class ActivityService
{
    public function __construct(private ActivityRepository $activities, private ActivityInputValidator $validator)
    {
    }

    public function all(array $filters): array
    {
        $validated = $this->validator->filters($filters);
        $validated['_scope'] = $filters['_scope'] ?? [];
        return $this->activities->all($validated);
    }

    public function participants(mixed $query, array $actor = []): array
    {
        if (!is_string($query) || strlen($query) > 100) throw new ApiException(422, 'invalid_search');
        return $this->activities->participants(trim($query), $actor);
    }

    public function one(int $id, array $actor = []): array
    {
        return $this->activities->find($id, $actor) ?? throw new ApiException(404, 'activity_not_found');
    }

    public function create(array $input, int $actor, array $scope = []): array
    {
        $data = $this->validator->activity($input);
        $this->assertParticipants($data['participant_ids'], $scope);
        return ['id' => $this->activities->create($data, $actor)];
    }

    public function update(array $input, int $actor, array $scope = []): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $data = $this->validator->activity($input);
        $this->assertParticipants($data['participant_ids'], $scope);
        $this->one($id, $scope);
        try { $this->activities->update($id, $data, $actor, $scope); }
        catch (RuntimeException $error) {
            if ($error->getMessage() === 'activity_not_found') throw new ApiException(404, 'activity_not_found');
            if ($error->getMessage() === 'activity_has_out_of_scope_participants') throw new ApiException(403, 'activity_update_out_of_scope');
            throw $error;
        }
    }

    public function logs(int $id, array $scope = []): array
    {
        $this->one($id, $scope);
        return $this->activities->logs($id, $scope);
    }

    public function addObservation(array $input, int $actor, array $scope = []): void
    {
        $activity = $this->validator->id($input['activity_id'] ?? null);
        $participant = $input['participant_id'] ?? null;
        if (($scope['roles'][0] ?? '') === 'tutor' && ($participant === null || $participant === '')) {
            throw new ApiException(422, 'participant_required_for_observation');
        }
        if ($participant !== null && $participant !== '') {
            $participant = $this->validator->id($participant);
            if (!$this->activities->assigned($activity, $participant)
                || !$this->activities->isParticipant($participant, $scope)) throw new ApiException(404, 'participant_not_assigned');
        } else $participant = null;
        $this->one($activity, $scope);
        $this->activities->addObservation($activity, $participant, $actor, $this->validator->observation($input['details'] ?? null));
    }

    private function assertParticipants(array $ids, array $scope): void
    {
        foreach ($ids as $id) {
            if (!$this->activities->isParticipant($id, $scope)) throw new ApiException(404, 'participant_not_found');
        }
    }
}
