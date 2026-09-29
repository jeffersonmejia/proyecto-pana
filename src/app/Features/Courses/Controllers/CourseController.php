<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Services\CourseService;
final class CourseController
{
    public function __construct(private CourseService $courses) {}
    public function index(array $actor,bool $isEvent=false): void { echo json_encode(['courses'=>$this->courses->all($actor,$isEvent)]); }
    public function available(array $actor,bool $isEvent=false): void { echo json_encode(['courses'=>$this->courses->available($actor,$isEvent)]); }
    public function enroll(int $id,array $actor): void { $this->courses->enroll($id,$actor); echo json_encode(['status'=>'enrolled']); }
    public function show(int $id,array $actor): void { echo json_encode(['course'=>$this->courses->one($id,$actor)]); }
    public function sections(int $id,array $actor,string $attendanceDate): void { echo json_encode($this->courses->sections($id,$actor,$attendanceDate)); }
    public function createTask(int $course,array $data,array $actor): void { http_response_code(201); echo json_encode(['id'=>$this->courses->createTask($course,$data,$actor)]); }
    public function updateTask(int $course,int $activity,array $data,array $actor): void { $this->courses->updateTask($course,$activity,$data,$actor); echo json_encode(['status'=>'updated']); }
    public function setTaskStatus(int $course,int $activity,array $data,array $actor): void { $this->courses->setTaskStatus($course,$activity,(string)($data['status']??''),$actor); echo json_encode(['status'=>'updated']); }
    public function deleteTask(int $course,int $activity,array $actor): void { $this->courses->deleteTask($course,$activity,$actor); echo json_encode(['status'=>'deleted']); }
    public function assertTask(int $course,int $activity,array $actor): void { $this->courses->assertTask($course,$activity,$actor); }
    public function tecnicos(): void { echo json_encode(['tecnicos'=>$this->courses->tecnicos()]); }
    public function participants(): void { echo json_encode(['participants'=>$this->courses->participants()]); }
    public function setTecnicoStatus(int $course,int $tecnico,array $data,array $actor): void { $this->courses->setTecnicoStatus($course,$tecnico,(string)($data['status']??''),$actor); echo json_encode(['status'=>'updated']); }
    public function setParticipantStatus(int $course,int $person,array $data,array $actor): void { $this->courses->setParticipantStatus($course,$person,(string)($data['status']??''),$actor); echo json_encode(['status'=>'updated']); }
    public function create(array $data,array $actor): void { http_response_code(201); echo json_encode(['id'=>$this->courses->create($data,$actor)]); }
    public function update(array $data,array $actor): void { $this->courses->update($data,$actor); echo json_encode(['status'=>'updated']); }
    public function deactivate(int $id,array $actor): void { $this->courses->deactivate($id,$actor); echo json_encode(['status'=>'inactive']); }
    public function delete(int $id,array $actor): void { $this->courses->delete($id,$actor); echo json_encode(['status'=>'deleted']); }
    public function setStatus(int $id,array $data,array $actor): void { $this->courses->setStatus($id,(string)($data['status']??''),$actor); echo json_encode(['status'=>'updated']); }
    public function uploadCover(int $id,mixed $file,array $actor): void { $this->courses->uploadCover($id,$file,$actor); http_response_code(201); echo json_encode(['status'=>'uploaded']); }
    public function weeklyEvidence(int $id,array $actor): void { echo json_encode($this->courses->weeklyEvidence($id,$actor)); }
    public function uploadWeeklyEvidence(int $course,int $week,mixed $file,array $actor): void { $this->courses->uploadWeeklyEvidence($course,$week,$file,$actor); http_response_code(201); echo json_encode(['status'=>'uploaded']); }
    public function deleteWeeklyEvidence(int $course,int $id,array $actor): void { $this->courses->deleteWeeklyEvidence($course,$id,$actor); echo json_encode(['status'=>'deleted']); }
    public function downloadWeeklyEvidence(int $course,int $id,array $actor): void { $file=$this->courses->downloadWeeklyEvidence($course,$id,$actor); header('Content-Type: application/pdf'); header('Content-Length: '.$file['size']); header('Content-Disposition: attachment; filename*=UTF-8\'\''.rawurlencode($file['row']['original_name'])); header('X-Content-Type-Options: nosniff'); try{fpassthru($file['stream']);}finally{fclose($file['stream']);} }
}
