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
        $validated = $this->validator->filters($filters);
        $validated['_scope'] = $filters['_scope'] ?? [];
        return $this->attendance->all($validated);
    }

    public function participants(mixed $query, array $actor = []): array
    {
        if (!is_string($query) || strlen($query) > 100) throw new ApiException(422, 'invalid_search');
        return $this->attendance->participants(trim($query), $actor);
    }

    public function create(array $input, int $actor, array $scope = []): array
    {
        $record = $this->validator->record($input);
        $this->assertParticipant($record['participant_id'], $scope);
        try { return ['id' => $this->attendance->create($record, $actor)]; }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'attendance_already_exists');
            throw $error;
        }
    }

    public function checkout(array $input,int $actor,array $scope=[]): void
    {
        $record=$this->validator->checkout($input); $this->assertParticipant($record['participant_id'],$scope);
        try { $this->attendance->checkOut($record['participant_id'],$record['attendance_date'],$record['check_out'],$actor); }
        catch(RuntimeException $error) {
            $status=match($error->getMessage()) {'attendance_entry_required'=>409,'attendance_exit_exists'=>409,'invalid_attendance_range'=>422,default=>500};
            if($status===500) throw $error;
            throw new ApiException($status,$error->getMessage());
        }
    }

    public function update(array $input, int $actor, array $scope = []): void
    {
        $id = $this->validator->id($input['id'] ?? null);
        $record = $this->validator->record($input, true);
        $this->assertParticipant($record['participant_id'], $scope);
        try { $this->attendance->update($id, $record, $actor, $scope); }
        catch (PDOException $error) {
            if ($error->getCode() === '23000') throw new ApiException(409, 'attendance_already_exists');
            throw $error;
        } catch (RuntimeException $error) {
            if ($error->getMessage() === 'attendance_not_found') throw new ApiException(404, 'attendance_not_found');
            throw $error;
        }
    }

    public function one(int $id, array $scope = []): array
    {
        return $this->attendance->find($id, $scope) ?? throw new ApiException(404, 'attendance_not_found');
    }

    public function history(int $id, array $scope = []): array
    {
        $this->one($id, $scope);
        return $this->attendance->history($id);
    }

    private function assertParticipant(int $id, array $scope): void
    {
        if (!$this->attendance->isParticipant($id, $scope)) throw new ApiException(404, 'participant_not_found');
    }
}
