<?php
declare(strict_types=1);
namespace App\Services;
use App\Exceptions\ApiException;
use App\Repositories\CourseRepository;
use App\Repositories\CourseDetailsRepository;
use App\Validators\CourseInputValidator;
use App\Services\ActivityService;
use PDOException;
final class CourseService
{
    public function __construct(private CourseRepository $courses,private CourseDetailsRepository $details,private CourseInputValidator $validator,private ActivityService $activities,private CourseCoverService $covers,private NextcloudStorageService $storage) {}
    public function all(array $actor,bool $isEvent=false): array { return $this->courses->all($actor,$isEvent); }
    public function available(array $actor,bool $isEvent=false): array { return $this->courses->available($actor,$isEvent); }
    public function enroll(int $id,array $actor): void
    {
        if (!in_array($actor['roles'][0] ?? '', ['beneficiary','student'], true)) throw new ApiException(403,'permission_denied');
        try { $this->courses->enroll($id,(int)$actor['id']); }
        catch(\RuntimeException $error) {
            $map=['course_unavailable'=>[404,'course_not_available'],'participant_not_found'=>[422,'participant_not_found'],'already_enrolled'=>[409,'already_enrolled'],'course_full'=>[409,'course_full']];
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
            $details['participants'] = [];
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
    public function updateTask(int $course,int $activity,array $input,array $actor): void { $this->assertTask($course,$activity,$actor); $input['id']=$activity; $this->activities->update($input,(int)$actor['id'],$actor); }
    public function setTaskStatus(int $course,int $activity,string $status,array $actor): void { $this->assertTask($course,$activity,$actor); $this->activities->setStatus($activity,$status,(int)$actor['id'],$actor); }
    public function deleteTask(int $course,int $activity,array $actor): void { $this->assertTask($course,$activity,$actor); $this->activities->delete($activity,$actor); }
    public function assertTask(int $course,int $activity,array $actor): void
    {
        $this->one($course,$actor);
        if(!$this->courses->activityBelongsTo($course,$activity)) throw new ApiException(404,'course_activity_not_found');
    }
    public function tecnicos(): array { return $this->courses->tecnicos(); }
    public function participants(): array { return $this->courses->participants(); }
    public function setTecnicoStatus(int $course,int $tecnico,string $status,array $actor): void
    {
        $this->one($course,$actor);
        if (!in_array($status,['active','inactive'],true)) throw new ApiException(422,'invalid_tecnico_status');
        try { $this->courses->setTecnicoStatus($course,$tecnico,$status); }
        catch (\RuntimeException $error) { throw new ApiException(404,$error->getMessage()); }
    }
    public function setParticipantStatus(int $course,int $person,string $status,array $actor): void
    {
        if (!in_array($actor['roles'][0]??'', ['admin','coordinator','tecnico'], true)) throw new ApiException(403,'permission_denied');
        $this->one($course,$actor);
        if (!in_array($status,['active','inactive'],true)) throw new ApiException(422,'invalid_participant_status');
        try { $this->courses->setParticipantStatus($course,$person,$status); }
        catch (\RuntimeException $error) { throw new ApiException(404,$error->getMessage()); }
    }
    public function create(array $input,array $actor): int
    {
        $data=$this->validated($input); $this->assertAssignments($data);
        try { return $this->courses->create($data,(int)$actor['id'],$actor); }
        catch (PDOException $error) { if ($error->getCode() === '23000') throw new ApiException(409,'course_name_exists'); throw $error; }
    }
    public function update(array $input,array $actor): void
    {
        $id=$this->validator->id($input['id']??null); $current=$this->one($id,$actor); $data=$this->validated($input);
        $currentParticipants=array_map('intval',$current['participant_ids']??[]);
        $submittedParticipants=array_map('intval',$data['participant_ids']); sort($currentParticipants); sort($submittedParticipants);
        $this->assertAssignments($data,$currentParticipants===$submittedParticipants);
        try { $this->courses->update($id,$data); }
        catch (PDOException $error) { if ($error->getCode() === '23000') throw new ApiException(409,'course_name_exists'); throw $error; }
    }
    public function deactivate(int $id,array $actor): void { $this->one($id,$actor); $this->courses->deactivate($id); }
    public function delete(int $id,array $actor): void { $this->one($id,$actor); $this->courses->delete($id); }
    public function setStatus(int $id,string $status,array $actor): void
    {
        $this->one($id,$actor);
        if(!in_array($status,['active','inactive'],true)) throw new ApiException(422,'invalid_course_status');
        $this->courses->setStatus($id,$status);
    }
    public function uploadCover(int $id,mixed $file,array $actor): void { $this->covers->upload($id,$file,$actor); }
    public function weeklyEvidence(int $course,array $actor): array { $this->one($course,$actor); return ['weeks'=>$this->courses->weeklyEvidence($course)]; }
    public function uploadWeeklyEvidence(int $course,int $week,mixed $file,array $actor): void
    {
        if(($actor['roles'][0]??'')!=='tecnico') throw new ApiException(403,'permission_denied'); $this->one($course,$actor); $row=$this->courses->weeklyEvidence($course)[$week-1]??null;
        if(!$row||(int)$row['week_number']!==$week) throw new ApiException(404,'course_week_not_found'); if(!is_array($file)||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']??'')) throw new ApiException(422,'invalid_upload'); if($file['size']>50*1024*1024) throw new ApiException(413,'file_too_large');
        $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']); if($mime!=='application/pdf') throw new ApiException(415,'pdf_only'); $name=basename(str_replace('\\','/',(string)($file['name']??''))); if($name==='') throw new ApiException(422,'invalid_file_name'); $stored=bin2hex(random_bytes(16)).'.pdf'; $path="Cursos/{$course}/Semanas/{$week}/{$stored}"; $legacy=dirname(__DIR__,4).'/storage/documents/'.$stored; $remote=true;
        try{$this->storage->uploadFile($file['tmp_name'],$path);}catch(ApiException){$remote=false; if(!is_dir(dirname($legacy))&&!mkdir(dirname($legacy),0770,true)&&!is_dir(dirname($legacy)))throw new ApiException(500,'storage_unavailable'); if(!copy($file['tmp_name'],$legacy))throw new ApiException(500,'storage_unavailable');}
        $previousStored=(string)($row['stored_name']??'');
        try{$this->courses->saveWeeklyEvidence((int)$row['id'],$name,$stored,$mime,(int)$file['size'],(int)$actor['id']);}catch(\Throwable $error){if($remote){try{$this->storage->delete($path);}catch(\Throwable){}}elseif(is_file($legacy))unlink($legacy);throw $error;}
        if($previousStored!==''&&$previousStored!==$stored){$previousLegacy=dirname(__DIR__,4).'/storage/documents/'.basename($previousStored);if(is_file($previousLegacy))unlink($previousLegacy);else try{$this->storage->delete("Cursos/{$course}/Semanas/{$week}/".basename($previousStored));}catch(\Throwable){} }
    }
    public function deleteWeeklyEvidence(int $course,int $id,array $actor): void
    {
        if(($actor['roles'][0]??'')!=='tecnico') throw new ApiException(403,'permission_denied'); $this->one($course,$actor); $row=$this->courses->weeklyEvidenceOne($id,$course); if(!$row) throw new ApiException(404,'course_evidence_not_found'); if($row['stored_name']){ $legacy=dirname(__DIR__,4).'/storage/documents/'.basename($row['stored_name']); if(is_file($legacy))unlink($legacy); else try{$this->storage->delete("Cursos/{$course}/Semanas/{$row['week_number']}/".basename($row['stored_name']));}catch(ApiException){} } $this->courses->clearWeeklyEvidence($id);
    }
    public function downloadWeeklyEvidence(int $course,int $id,array $actor): array
    {
        $this->one($course,$actor); $row=$this->courses->weeklyEvidenceOne($id,$course); if(!$row||!$row['stored_name']) throw new ApiException(404,'course_evidence_not_found'); $legacy=dirname(__DIR__,4).'/storage/documents/'.basename($row['stored_name']); if(is_file($legacy))return ['row'=>$row,'stream'=>fopen($legacy,'rb'),'size'=>filesize($legacy)]; $file=$this->storage->download("Cursos/{$course}/Semanas/{$row['week_number']}/".basename($row['stored_name'])); return ['row'=>$row]+$file;
    }
    private function validated(array $input): array { return $this->validator->course($input); }
    private function assertAssignments(array $data,bool $keepExistingParticipants=false): void
    {
    foreach ($data['tecnico_user_ids'] as $tecnicoId) if (!$this->courses->tecnicoExists($tecnicoId)) throw new ApiException(422,'invalid_tecnicos');
        if (!$keepExistingParticipants) foreach($data['participant_ids'] as $id) if(!$this->courses->participantExists($id)) throw new ApiException(422,'invalid_participant');
    }
}
