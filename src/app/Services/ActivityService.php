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
        return $this->activities->all($this->validator->filters($filters));
    }

    public function participants(mixed $query): array
    {
        if (!is_string($query) || strlen($query) > 100) throw new ApiException(422, 'invalid_search');
        return $this->activities->participants(trim($query));
    }

    public function one(int $id): array
    {
        return $this->activities->find($id) ?? throw new ApiException(404, 'activity_not_found');
    }

    public function create(array $input, int $actor): array
    {
        $data = $this->validator->activity($input);
        $this->assertParticipants($data['participant_ids']);
        return ['id' => $this->activities->create($data, $actor)];
    }

    public function update(array $input, int $actor): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $data = $this->validator->activity($input);
        $this->assertParticipants($data['participant_ids']);
        try { $this->activities->update($id, $data, $actor); }
        catch (RuntimeException $error) {
            if ($error->getMessage() === 'activity_not_found') throw new ApiException(404, 'activity_not_found');
            throw $error;
        }
    }

    public function logs(int $id): array
    {
        $this->one($id);
        return $this->activities->logs($id);
    }

    public function addObservation(array $input, int $actor): void
    {
        $activity = $this->validator->id($input['activity_id'] ?? null);
        $participant = $input['participant_id'] ?? null;
        if ($participant !== null && $participant !== '') {
            $participant = $this->validator->id($participant);
            if (!$this->activities->assigned($activity, $participant)) throw new ApiException(422, 'participant_not_assigned');
        } else $participant = null;
        $this->one($activity);
        $this->activities->addObservation($activity, $participant, $actor, $this->validator->observation($input['details'] ?? null));
    }

    private function assertParticipants(array $ids): void
    {
        foreach ($ids as $id) {
            if (!$this->activities->isParticipant($id)) throw new ApiException(422, 'participant_not_found');
        }
    }
}
