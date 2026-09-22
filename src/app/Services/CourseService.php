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
    public function one(int $id,array $actor): array { return $this->courses->find($id,$actor) ?? throw new ApiException(404,'course_not_found'); }
    public function sections(int $id,array $actor,string $attendanceDate): array
    {
        $date=\DateTimeImmutable::createFromFormat('!Y-m-d',$attendanceDate);
        if(!$date||$date->format('Y-m-d')!==$attendanceDate) throw new ApiException(422,'invalid_attendance_date');
        $course=$this->one($id,$actor); return ['course'=>$course]+$this->details->load($id,$actor,$attendanceDate);
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
    public function tutors(): array { return $this->courses->tutors(); }
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
        if (!$this->courses->tutorExists($data['tutor_user_id'])) throw new ApiException(422,'invalid_tutor');
        foreach($data['participant_ids'] as $id) if(!$this->courses->participantExists($id)) throw new ApiException(422,'invalid_participant');
    }
}
