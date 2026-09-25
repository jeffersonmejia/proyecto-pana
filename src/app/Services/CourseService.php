<?php
declare(strict_types=1);
namespace App\Services;
use App\Exceptions\ApiException;
use App\Repositories\CourseRepository;
use App\Repositories\CourseDetailsRepository;
use App\Validators\CourseInputValidator;
use App\Services\ActivityService;
final class CourseService
{
    public function __construct(private CourseRepository $courses,private CourseDetailsRepository $details,private CourseInputValidator $validator,private ActivityService $activities) {}
    public function all(array $actor): array { return $this->courses->all($actor); }
    public function available(array $actor): array { return $this->courses->available($actor); }
    public function enroll(int $id,array $actor): void
    {
        if (!in_array($actor['roles'][0] ?? '', ['beneficiary','student'], true)) throw new ApiException(403,'permission_denied');
        try { $this->courses->enroll($id,(int)$actor['id']); }
        catch(\RuntimeException $error) {
            $map=['course_unavailable'=>[404,'course_not_available'],'participant_not_found'=>[422,'participant_not_found'],'course_full'=>[409,'course_full']];
            [$status,$code]=$map[$error->getMessage()]??[500,'course_enrollment_failed']; throw new ApiException($status,$code);
        }
    }
    public function one(int $id,array $actor): array { return $this->courses->find($id,$actor) ?? throw new ApiException(404,'course_not_found'); }
    public function sections(int $id,array $actor,string $attendanceDate): array
    {
        $date=\DateTimeImmutable::createFromFormat('!Y-m-d',$attendanceDate);
        if(!$date||$date->format('Y-m-d')!==$attendanceDate) throw new ApiException(422,'invalid_attendance_date');
        $course=$this->one($id,$actor); $details=$this->details->load($id,$actor,$attendanceDate);
        if (($actor['roles'][0] ?? '') === 'beneficiary') {
            $people = $details['participants']; $days = $this->courseDays($course['start_date'], $course['end_date']);
            $expected = $days * count($people); $attended = array_sum(array_map(static fn (array $person): int => (int) $person['attendance_count'], $people));
            $details['attendance_percentage'] = $expected > 0 ? min(100, (int) round($attended * 100 / $expected)) : 0;
            $details['participants'] = []; $details['attendance'] = [];
            $details['activity_logs'] = []; $details['evaluations'] = [];
            $details['documents'] = array_values(array_filter($details['documents'], static fn (array $file): bool => $file['entity_type'] === 'activity'));
        }
        return ['course'=>$course]+$details;
    }
    private function courseDays(string $start, string $end): int
    {
        $from = new \DateTimeImmutable($start); $to = new \DateTimeImmutable($end);
        return max(0, (int) $from->diff($to)->days + 1);
    }
    public function createTask(int $course,array $input,array $actor): int
    {
        $this->one($course,$actor); $assigned=$this->courses->participantIds($course);
        $participants=$input['participant_ids']??[];
        if(!is_array($participants)||!$participants||array_diff($participants,$assigned)) throw new ApiException(422,'invalid_course_participants');
        $task=$this->activities->create($input,(int)$actor['id'],$actor); $this->courses->linkActivity($course,(int)$task['id']);
        return (int)$task['id'];
    }
    public function assertTask(int $course,int $activity,array $actor): void
    {
        $this->one($course,$actor);
        if(!$this->courses->activityBelongsTo($course,$activity)) throw new ApiException(404,'course_activity_not_found');
    }
    public function tecnicos(): array { return $this->courses->tecnicos(); }
    public function participants(): array { return $this->courses->participants(); }
    public function create(array $input,array $actor): int
    {
        $data=$this->validated($input); $this->assertAssignments($data); return $this->courses->create($data,(int)$actor['id'],$actor);
    }
    public function update(array $input,array $actor): void
    {
        $id=$this->validator->id($input['id']??null); $this->one($id,$actor); $data=$this->validated($input); $this->assertAssignments($data); $this->courses->update($id,$data);
    }
    public function deactivate(int $id,array $actor): void { $this->one($id,$actor); $this->courses->deactivate($id); }
    public function setStatus(int $id,string $status,array $actor): void
    {
        $this->one($id,$actor);
        if(!in_array($status,['active','inactive'],true)) throw new ApiException(422,'invalid_course_status');
        $this->courses->setStatus($id,$status);
    }
    private function validated(array $input): array { return $this->validator->course($input); }
    private function assertAssignments(array $data): void
    {
    foreach ($data['tecnico_user_ids'] as $tecnicoId) if (!$this->courses->tecnicoExists($tecnicoId)) throw new ApiException(422,'invalid_tecnicos');
        foreach($data['participant_ids'] as $id) if(!$this->courses->participantExists($id)) throw new ApiException(422,'invalid_participant');
    }
}
