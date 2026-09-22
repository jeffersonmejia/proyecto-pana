<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
final class CourseRepository
{
    public function __construct(private PDO $db) {}
    public function all(array $actor): array
    {
        [$scope,$params]=$this->scope($actor);
        $q=$this->db->prepare($this->select()." WHERE {$scope} GROUP BY c.id ORDER BY c.start_date,c.name");
        $q->execute($params); return array_map([$this,'mapCourse'],$q->fetchAll());
    }
    public function find(int $id,array $actor): ?array
    {
        [$scope,$params]=$this->scope($actor); $q=$this->db->prepare($this->select()." WHERE c.id=? AND {$scope} GROUP BY c.id");
        $q->execute(array_merge([$id],$params)); $course=$q->fetch(); return $course ? $this->mapCourse($course) : null;
    }
    public function tutors(): array
    {
        return $this->db->query("SELECT u.id,CONCAT(u.first_name,' ',u.last_name) name FROM tutors t JOIN users u ON u.id=t.user_id WHERE t.is_active=1 AND u.is_active=1 ORDER BY u.last_name,u.first_name")->fetchAll();
    }
    public function participants(): array
    {
        $sql="SELECT p.id,CONCAT(p.first_name,' ',p.last_name) name,CASE WHEN EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1) THEN 'Estudiante' WHEN EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1) THEN 'Beneficiario' ELSE 'Participante' END profile FROM people p WHERE p.status='active' AND (EXISTS (SELECT 1 FROM participants t WHERE t.person_id=p.id AND t.is_active=1) OR EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1) OR EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1)) ORDER BY p.last_name,p.first_name";
        return $this->db->query($sql)->fetchAll();
    }
    public function create(array $data,int $actor,array $user): int
    {
        return $this->transaction(function() use($data,$actor,$user): int {
            $q=$this->db->prepare('INSERT INTO courses (name,description,start_date,end_date,status,max_participants,tutor_user_id,coordinator_user_id) VALUES (?,?,?,?,?,?,?,?)');
            $q->execute([$data['name'],$data['description'],$data['start_date'],$data['end_date'],$data['status'],$data['max_participants'],$data['tutor_user_id'],($user['roles'][0]??'')==='coordinator'?$actor:null]);
            $id=(int)$this->db->lastInsertId(); $this->syncParticipants($id,$data['participant_ids']); return $id;
        });
    }
    public function update(int $id,array $data): void
    {
        $this->transaction(function() use($id,$data): void {
            $q=$this->db->prepare('UPDATE courses SET name=?,description=?,start_date=?,end_date=?,status=?,max_participants=?,tutor_user_id=? WHERE id=?');
            $q->execute([$data['name'],$data['description'],$data['start_date'],$data['end_date'],$data['status'],$data['max_participants'],$data['tutor_user_id'],$id]);
            $this->syncParticipants($id,$data['participant_ids']);
        });
    }
    public function deactivate(int $id): void { $q=$this->db->prepare("UPDATE courses SET status='inactive' WHERE id=?"); $q->execute([$id]); }
    public function setStatus(int $id,string $status): void { $q=$this->db->prepare('UPDATE courses SET status=? WHERE id=?'); $q->execute([$status,$id]); }
    public function participantIds(int $course): array
    {
        $q=$this->db->prepare("SELECT person_id FROM course_participants WHERE course_id=? AND status='active'");
        $q->execute([$course]); return array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));
    }
    public function linkActivity(int $course,int $activity): void
    {
        $q=$this->db->prepare('INSERT INTO course_activities (course_id,activity_id) VALUES (?,?)'); $q->execute([$course,$activity]);
    }
    public function activityBelongsTo(int $course,int $activity): bool
    {
        $q=$this->db->prepare('SELECT 1 FROM course_activities WHERE course_id=? AND activity_id=?');
        $q->execute([$course,$activity]); return (bool)$q->fetchColumn();
    }
    public function tutorExists(int $id): bool
    {
        $q=$this->db->prepare('SELECT 1 FROM tutors t JOIN users u ON u.id=t.user_id WHERE t.user_id=? AND t.is_active=1 AND u.is_active=1'); $q->execute([$id]); return (bool)$q->fetchColumn();
    }
    public function participantExists(int $id): bool
    {
        $q=$this->db->prepare("SELECT 1 FROM people p WHERE p.id=? AND p.status='active' AND (EXISTS (SELECT 1 FROM participants t WHERE t.person_id=p.id AND t.is_active=1) OR EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1) OR EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1))");
        $q->execute([$id]); return (bool)$q->fetchColumn();
    }
    private function select(): string
    {
        return "SELECT c.id,c.name,c.description,c.start_date,c.end_date,c.status,c.max_participants,c.tutor_user_id,COALESCE(CONCAT(u.first_name,' ',u.last_name),'Sin asignar') tutor_name,COUNT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_count,GROUP_CONCAT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_ids_csv,GROUP_CONCAT(DISTINCT CASE WHEN cp.status='active' THEN CONCAT(p.first_name,' ',p.last_name) END ORDER BY p.last_name,p.first_name SEPARATOR ', ') participant_names FROM courses c LEFT JOIN users u ON u.id=c.tutor_user_id LEFT JOIN course_participants cp ON cp.course_id=c.id LEFT JOIN people p ON p.id=cp.person_id";
    }
    private function mapCourse(array $course): array
    {
        $csv=$course['participant_ids_csv']??''; $course['participant_ids']=$csv===''?[]:array_map('intval',explode(',',$csv)); unset($course['participant_ids_csv']); return $course;
    }
    private function syncParticipants(int $course,array $ids): void
    {
        $q=$this->db->prepare("UPDATE course_participants SET status='inactive' WHERE course_id=?"); $q->execute([$course]);
        $q=$this->db->prepare("INSERT INTO course_participants (course_id,person_id,status) VALUES (?,?,'active') ON DUPLICATE KEY UPDATE status='active'");
        foreach($ids as $id) $q->execute([$course,$id]);
    }
    private function transaction(callable $callback): mixed
    {
        $this->db->beginTransaction(); try { $result=$callback(); $this->db->commit(); return $result; }
        catch(\Throwable $error) { if($this->db->inTransaction()) $this->db->rollBack(); throw $error; }
    }
    private function scope(array $a): array
    {
        $role=$a['roles'][0]??''; $id=(int)($a['id']??0);
        if ($role==='admin') return ['1=1',[]];
        if ($role==='coordinator') return ['c.coordinator_user_id=?',[$id]];
        if ($role==='tutor') return ['c.tutor_user_id=?',[$id]];
        $person="(p.user_id={$id} OR p.ci=(SELECT ci FROM users WHERE id={$id}))";
        if ($role==='beneficiary') $person.=' AND EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1)';
        elseif ($role==='student') $person.=" AND EXISTS (SELECT 1 FROM students s JOIN users su ON su.id=s.user_id AND su.is_active=1 WHERE su.id={$id} AND s.is_active=1)";
        else return ['1=0',[]];
        return ["EXISTS (SELECT 1 FROM course_participants cp2 JOIN people p ON p.id=cp2.person_id WHERE cp2.course_id=c.id AND cp2.status='active' AND {$person})",[]];
    }
}
