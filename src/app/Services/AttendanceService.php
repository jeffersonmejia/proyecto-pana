<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\AttendanceRepository;
use App\Validators\AttendanceInputValidator;
use PDOException;
use RuntimeException;

final class AttendanceService
{
    public function __construct(private AttendanceRepository $attendance, private AttendanceInputValidator $validator)
    {
    }

    public function all(array $filters): array
    {
        return $this->attendance->all($this->validator->filters($filters));
    }

    public function participants(mixed $query): array
    {
        if (!is_string($query) || strlen($query) > 100) throw new ApiException(422, 'invalid_search');
        return $this->attendance->participants(trim($query));
    }

    public function create(array $input, int $actor): array
    {
        $record = $this->validator->record($input);
        $this->assertParticipant($record['participant_id']);
        try { return ['id' => $this->attendance->create($record, $actor)]; }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'attendance_already_exists');
            throw $error;
        }
    }

    public function update(array $input, int $actor): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $record = $this->validator->record($input, true);
        $this->assertParticipant($record['participant_id']);
        try { $this->attendance->update($id, $record, $actor); }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'attendance_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'attendance_not_found') throw new ApiException(404, 'attendance_not_found');
            throw $error;
        }
    }

    public function one(int $id): array
    {
        return $this->attendance->find($id) ?? throw new ApiException(404, 'attendance_not_found');
    }

    public function history(int $id): array
    {
        $this->one($id);
        return $this->attendance->history($id);
    }

    private function assertParticipant(int $id): void
    {
        if (!$this->attendance->isParticipant($id)) throw new ApiException(422, 'participant_not_found');
    }
}
