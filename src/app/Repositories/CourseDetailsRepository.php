<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
final class CourseDetailsRepository
{
    public function __construct(private PDO $db) {}
    public function load(int $course,array $actor,string $attendanceDate): array
    {
        $scope=$this->personScope('cp.person_id',$actor);
        return ['participants'=>$this->participants($course,$scope,$attendanceDate),
            'activities'=>$this->activities($course,$scope),
            'activity_logs'=>$this->activityLogs($course,$scope),
            'evaluations'=>$this->evaluations($course,$scope,$actor), 'documents'=>$this->documents($course,$scope)];
    }
    private function participants(int $id,string $scope,string $attendanceDate): array
    {
        $sql="SELECT p.id,p.first_name,p.last_name,CONCAT(p.first_name,' ',p.last_name) name,CASE WHEN EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1) THEN 'Estudiante' WHEN EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1) THEN 'Beneficiario' ELSE 'Participante' END profile,(SELECT COUNT(*) FROM attendance_records ar WHERE ar.participant_id=p.id) attendance_count,(SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,ar.check_in,ar.check_out)),0) FROM attendance_records ar WHERE ar.participant_id=p.id) attendance_minutes,(SELECT MAX(ar.attendance_date) FROM attendance_records ar WHERE ar.participant_id=p.id) last_attendance,(SELECT ar.status FROM attendance_records ar WHERE ar.participant_id=p.id ORDER BY ar.attendance_date DESC,ar.id DESC LIMIT 1) last_attendance_status,(SELECT ar.status FROM attendance_records ar WHERE ar.participant_id=p.id AND ar.attendance_date=? ORDER BY ar.id DESC LIMIT 1) selected_attendance_status,(SELECT ar.check_in FROM attendance_records ar WHERE ar.participant_id=p.id AND ar.attendance_date=? ORDER BY ar.id DESC LIMIT 1) selected_check_in,(SELECT ar.check_out FROM attendance_records ar WHERE ar.participant_id=p.id AND ar.attendance_date=? ORDER BY ar.id DESC LIMIT 1) selected_check_out,(SELECT COUNT(*) FROM activity_participants ap JOIN course_activities ca ON ca.activity_id=ap.activity_id AND ca.course_id=cp.course_id WHERE ap.participant_id=p.id) task_count,(SELECT COUNT(*) FROM evaluation_records e WHERE e.person_id=p.id) evaluation_count FROM course_participants cp JOIN people p ON p.id=cp.person_id WHERE cp.course_id=? AND cp.status='active' AND {$scope} ORDER BY p.last_name,p.first_name LIMIT 200";
        return $this->query($sql,[$attendanceDate,$attendanceDate,$attendanceDate,$id]);
    }
    private function activities(int $id,string $scope): array
    {
        $sql='SELECT a.id,a.title,a.description,a.start_at,a.end_at,a.status,a.responsible,GROUP_CONCAT(DISTINCT CONCAT(p.first_name,\' \',p.last_name) ORDER BY p.last_name SEPARATOR \', \') participants FROM course_activities ca JOIN activities a ON a.id=ca.activity_id JOIN activity_participants ap ON ap.activity_id=a.id JOIN course_participants cp ON cp.person_id=ap.participant_id AND cp.course_id=ca.course_id AND cp.status=\'active\' JOIN people p ON p.id=cp.person_id WHERE ca.course_id=? AND '.$scope.' GROUP BY a.id ORDER BY a.start_at DESC LIMIT 200';
        return $this->query($sql,[$id]);
    }
    private function evaluations(int $id,string $scope,array $actor): array
    {
        $role=$actor['roles'][0]??''; $type=$role==='student'?" AND e.evaluation_type='participant'":($role==='beneficiary'?" AND e.evaluation_type='satisfaction'":'');
        $sql='SELECT e.id,e.evaluation_type,e.evaluated_on,e.satisfaction_score,e.observations,p.first_name,p.last_name,ROUND(AVG(ans.score),2) average_score FROM evaluation_records e JOIN course_participants cp ON cp.person_id=e.person_id AND cp.course_id=? AND cp.status=\'active\' JOIN people p ON p.id=e.person_id LEFT JOIN evaluation_answers ans ON ans.evaluation_id=e.id WHERE '.$scope.$type.' GROUP BY e.id ORDER BY e.evaluated_on DESC,e.id DESC LIMIT 200';
        return $this->query($sql,[$id]);
    }
    private function activityLogs(int $id,string $scope): array
    {
        $sql='SELECT l.id,a.title activity_title,l.event_type,l.details,l.created_at,l.participant_id,u.email actor_email, '
            .'CONCAT(p.first_name,\' \',p.last_name) participant_name FROM activity_logs l JOIN activities a ON a.id=l.activity_id '
            .'JOIN course_activities ca ON ca.activity_id=a.id JOIN activity_participants ap ON ap.activity_id=a.id JOIN course_participants cp ON cp.person_id=ap.participant_id AND cp.course_id=ca.course_id AND cp.status=\'active\' '
            .'LEFT JOIN people p ON p.id=l.participant_id LEFT JOIN users u ON u.id=l.actor_user_id WHERE ca.course_id=? AND '.$scope
            .' AND (l.participant_id IS NULL OR l.participant_id=cp.person_id) GROUP BY l.id ORDER BY l.created_at DESC LIMIT 200';
        return $this->query($sql,[$id]);
    }
    private function documents(int $id,string $scope): array
    {
        $person="SELECT d.id,d.entity_type,d.entity_id,d.original_name,d.mime_type,d.file_size,d.created_at,u.email uploader FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by JOIN course_participants cp ON d.entity_type='person' AND d.entity_id=cp.person_id WHERE cp.course_id=? AND cp.status='active' AND {$scope}";
        $activity="SELECT DISTINCT d.id,d.entity_type,d.entity_id,d.original_name,d.mime_type,d.file_size,d.created_at,u.email uploader FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by JOIN course_activities ca ON d.entity_type='activity' AND d.entity_id=ca.activity_id JOIN activity_participants ap ON ap.activity_id=ca.activity_id JOIN course_participants cp ON cp.person_id=ap.participant_id AND cp.course_id=ca.course_id AND cp.status='active' WHERE ca.course_id=? AND {$scope}";
        $evaluation="SELECT DISTINCT d.id,d.entity_type,d.entity_id,d.original_name,d.mime_type,d.file_size,d.created_at,u.email uploader FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by JOIN evaluation_records e ON d.entity_type='evaluation' AND d.entity_id=e.id JOIN course_participants cp ON cp.person_id=e.person_id AND cp.course_id=? AND cp.status='active' WHERE {$scope}";
        return $this->query("({$person}) UNION ({$activity}) UNION ({$evaluation}) ORDER BY created_at DESC LIMIT 200",[$id,$id,$id]);
    }
    private function personScope(string $person,array $actor): string
    {
        $role=$actor['roles'][0]??''; if(in_array($role,['admin','coordinator','tutor'],true)) return '1=1';
        $id=(int)($actor['id']??0); $self="EXISTS (SELECT 1 FROM people cp_person WHERE cp_person.id={$person} AND (cp_person.user_id={$id} OR cp_person.ci=(SELECT ci FROM users WHERE id={$id}))";
        if($role==='student') return $self." AND EXISTS (SELECT 1 FROM students cs WHERE cs.user_id={$id} AND cs.is_active=1))";
        if($role==='beneficiary') return $self." AND EXISTS (SELECT 1 FROM beneficiaries cb WHERE cb.person_id=cp_person.id AND cb.is_active=1))";
        return '1=0';
    }
    private function query(string $sql,array $params): array
    {
        $q=$this->db->prepare($sql); $q->execute($params); return $q->fetchAll();
    }
}
