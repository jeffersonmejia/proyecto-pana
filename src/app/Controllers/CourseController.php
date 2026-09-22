<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Services\CourseService;
final class CourseController
{
    public function __construct(private CourseService $courses) {}
    public function index(array $actor): void { echo json_encode(['courses'=>$this->courses->all($actor)]); }
    public function show(int $id,array $actor): void { echo json_encode(['course'=>$this->courses->one($id,$actor)]); }
    public function sections(int $id,array $actor,string $attendanceDate): void { echo json_encode($this->courses->sections($id,$actor,$attendanceDate)); }
    public function createTask(int $course,array $data,array $actor): void { http_response_code(201); echo json_encode(['id'=>$this->courses->createTask($course,$data,$actor)]); }
    public function assertTask(int $course,int $activity,array $actor): void { $this->courses->assertTask($course,$activity,$actor); }
    public function tutors(): void { echo json_encode(['tutors'=>$this->courses->tutors()]); }
    public function participants(): void { echo json_encode(['participants'=>$this->courses->participants()]); }
    public function create(array $data,array $actor): void { http_response_code(201); echo json_encode(['id'=>$this->courses->create($data,$actor)]); }
    public function update(array $data,array $actor): void { $this->courses->update($data,$actor); echo json_encode(['status'=>'updated']); }
    public function deactivate(int $id,array $actor): void { $this->courses->deactivate($id,$actor); echo json_encode(['status'=>'inactive']); }
    public function setStatus(int $id,array $data,array $actor): void { $this->courses->setStatus($id,(string)($data['status']??''),$actor); echo json_encode(['status'=>'updated']); }
}
