<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
final class CourseRepository
{
    public function __construct(private PDO $db) {}
    public function all(array $actor,bool $isEvent=false): array
    {
        [$scope,$params]=$this->scope($actor);
        $q=$this->db->prepare($this->select()." WHERE c.es_evento=".(int)$isEvent." AND {$scope} GROUP BY c.id ORDER BY c.start_date,c.name");
        $q->execute($params); return array_map([$this,'mapCourse'],$q->fetchAll());
    }
    public function available(array $actor,bool $isEvent=false): array
    {
        $user=(int)($actor['id']??0); $person="(p2.user_id={$user} OR p2.ci=(SELECT ci FROM users WHERE id={$user}))"; $enrolled="EXISTS (SELECT 1 FROM course_participants cp2 JOIN people p2 ON p2.id=cp2.person_id WHERE cp2.course_id=c.id AND cp2.status='active' AND {$person})"; $hasAny="EXISTS (SELECT 1 FROM course_participants cp2 JOIN people p2 ON p2.id=cp2.person_id WHERE cp2.status='active' AND {$person})";
        $select=str_replace(' FROM courses c', ",CASE WHEN {$enrolled} THEN 1 ELSE 0 END enrolled FROM courses c", $this->select());
        $q=$this->db->query($select." WHERE c.es_evento=".(int)$isEvent." AND c.status='active' AND (NOT {$hasAny} OR {$enrolled}) GROUP BY c.id ORDER BY c.start_date,c.name");
        return array_map([$this,'mapCourse'],$q->fetchAll());
    }
    public function find(int $id,array $actor): ?array
    {
        [$scope,$params]=$this->scope($actor); $q=$this->db->prepare($this->select()." WHERE c.id=? AND {$scope} GROUP BY c.id");
        $q->execute(array_merge([$id],$params)); $course=$q->fetch(); return $course ? $this->mapCourse($course) : null;
    }
    public function tecnicos(): array
    {
        return $this->db->query("SELECT u.id,CONCAT(u.first_name,' ',u.last_name) name FROM tecnicos t JOIN users u ON u.id=t.user_id WHERE t.is_active=1 AND u.is_active=1 ORDER BY u.last_name,u.first_name")->fetchAll();
    }
    public function participants(): array
    {
        $sql="SELECT p.id,CONCAT(p.first_name,' ',p.last_name) name,'Estudiante' profile FROM people p WHERE p.status='active' AND EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1) ORDER BY p.last_name,p.first_name";
        return $this->db->query($sql)->fetchAll();
    }
    public function create(array $data,int $actor,array $user): int
    {
        return $this->transaction(function() use($data,$actor,$user): int {
            $q=$this->db->prepare('INSERT INTO courses (name,description,es_evento,qr_link,start_date,end_date,status,max_participants,coordinator_user_id) VALUES (?,?,?,?,?,?,?,?,?)');
            $q->execute([$data['name'],$data['description'],$data['is_event']?1:0,$data['qr_link'],$data['start_date'],$data['end_date'],$data['status'],$data['max_participants'],($user['roles'][0]??'')==='coordinator'?$actor:null]);
            $id=(int)$this->db->lastInsertId(); $this->syncTecnicos($id,$data['tecnico_user_ids']); $this->syncParticipants($id,$data['participant_ids']); $this->syncWeeklyEvidence($id,$data['start_date'],$data['end_date'],(bool)$data['is_event']); return $id;
        });
    }
    public function update(int $id,array $data): void
    {
        $this->transaction(function() use($id,$data): void {
            $q=$this->db->prepare('UPDATE courses SET name=?,description=?,es_evento=?,qr_link=?,start_date=?,end_date=?,status=?,max_participants=? WHERE id=?');
            $q->execute([$data['name'],$data['description'],$data['is_event']?1:0,$data['qr_link'],$data['start_date'],$data['end_date'],$data['status'],$data['max_participants'],$id]);
            $this->syncTecnicos($id,$data['tecnico_user_ids']); $this->syncParticipants($id,$data['participant_ids']); $this->syncWeeklyEvidence($id,$data['start_date'],$data['end_date'],(bool)$data['is_event']);
        });
    }
    public function deactivate(int $id): void { $q=$this->db->prepare("UPDATE courses SET status='inactive' WHERE id=?"); $q->execute([$id]); }
    public function delete(int $id): void { $q=$this->db->prepare('DELETE FROM courses WHERE id=?'); $q->execute([$id]); }
    public function setStatus(int $id,string $status): void { $q=$this->db->prepare('UPDATE courses SET status=? WHERE id=?'); $q->execute([$status,$id]); }
    public function weeklyEvidence(int $course): array
    {
        $q=$this->db->prepare("SELECT w.id,w.week_number,w.week_start,w.week_end,w.original_name,w.mime_type,w.file_size,w.created_at,u.first_name uploader_first_name,u.last_name uploader_last_name FROM course_weekly_evidences w LEFT JOIN users u ON u.id=w.uploaded_by WHERE w.course_id=? ORDER BY w.week_number"); $q->execute([$course]);
        return array_map(static function(array $row): array { $row['id']=(int)$row['id']; $row['week_number']=(int)$row['week_number']; $row['file_size']=$row['file_size']===null?null:(int)$row['file_size']; $row['uploader']=trim(($row['uploader_first_name']??'').' '.($row['uploader_last_name']??'')) ?: null; unset($row['uploader_first_name'],$row['uploader_last_name']); return $row; },$q->fetchAll());
    }
    public function weeklyEvidenceOne(int $id,int $course): ?array { $q=$this->db->prepare('SELECT * FROM course_weekly_evidences WHERE id=? AND course_id=?'); $q->execute([$id,$course]); return $q->fetch()?:null; }
    public function saveWeeklyEvidence(int $id,string $name,string $stored,string $mime,int $size,int $actor): void { $q=$this->db->prepare('UPDATE course_weekly_evidences SET original_name=?,stored_name=?,mime_type=?,file_size=?,uploaded_by=? WHERE id=?'); $q->execute([$name,$stored,$mime,$size,$actor,$id]); }
    public function clearWeeklyEvidence(int $id): void { $q=$this->db->prepare('UPDATE course_weekly_evidences SET original_name=NULL,stored_name=NULL,mime_type=NULL,file_size=NULL,uploaded_by=NULL WHERE id=?'); $q->execute([$id]); }
    public function setCover(int $id,string $stored,string $original,string $mime): void
    {
        $q=$this->db->prepare('UPDATE courses SET cover_stored_name=?,cover_original_name=?,cover_mime_type=? WHERE id=?');
        $q->execute([$stored,$original,$mime,$id]);
    }
    public function publicWelcome(int $id): ?array
    {
        $q=$this->db->prepare("SELECT id,name,description,cover_stored_name,cover_mime_type FROM courses WHERE id=? AND status='active'");
        $q->execute([$id]); $course=$q->fetch();
        if (!$course) return null;
        return ['id'=>(int)$course['id'],'name'=>$course['name'],'description'=>$course['description'],
            'cover_available'=>$course['cover_stored_name']!==null,'cover_stored_name'=>$course['cover_stored_name'],'cover_mime_type'=>$course['cover_mime_type']];
    }
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
    public function tecnicoExists(int $id): bool
    {
        $q=$this->db->prepare('SELECT 1 FROM tecnicos t JOIN users u ON u.id=t.user_id WHERE t.user_id=? AND t.is_active=1 AND u.is_active=1'); $q->execute([$id]); return (bool)$q->fetchColumn();
    }
    public function setTecnicoStatus(int $course,int $tecnico,string $status): void
    {
        $q=$this->db->prepare("UPDATE course_tecnicos SET status=? WHERE course_id=? AND tecnico_user_id=?");
        $q->execute([$status,$course,$tecnico]);
        if ($q->rowCount() < 1) throw new \RuntimeException('course_tecnico_not_found');
    }
    public function setParticipantStatus(int $course,int $person,string $status): void
    {
        $q=$this->db->prepare('UPDATE course_participants SET status=? WHERE course_id=? AND person_id=?');
        $q->execute([$status,$course,$person]);
        if ($q->rowCount() < 1) throw new \RuntimeException('course_participant_not_found');
    }
    public function participantExists(int $id): bool
    {
        $q=$this->db->prepare("SELECT 1 FROM people p WHERE p.id=? AND p.status='active' AND EXISTS (SELECT 1 FROM students s JOIN users u ON u.id=s.user_id AND u.is_active=1 WHERE (p.user_id=u.id OR p.ci=u.ci) AND s.is_active=1)");
        $q->execute([$id]); return (bool)$q->fetchColumn();
    }
    public function enroll(int $course,int $user): void
    {
        $this->transaction(function() use($course,$user): void {
            $q=$this->db->prepare("SELECT c.max_participants,COUNT(cp.person_id) enrolled FROM courses c LEFT JOIN course_participants cp ON cp.course_id=c.id AND cp.status='active' WHERE c.id=? AND c.status='active' GROUP BY c.id FOR UPDATE");
            $q->execute([$course]); $row=$q->fetch(); if(!$row) throw new \RuntimeException('course_unavailable');
            $person=$this->db->prepare("SELECT p.id FROM people p WHERE p.user_id=? AND p.status='active' AND (EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1) OR EXISTS (SELECT 1 FROM students s WHERE s.user_id=? AND s.is_active=1))");
            $person->execute([$user,$user]); $personId=(int)$person->fetchColumn(); if(!$personId) throw new \RuntimeException('participant_not_found');
            $active=$this->db->prepare("SELECT 1 FROM course_participants WHERE person_id=? AND status='active' LIMIT 1");
            $active->execute([$personId]); if($active->fetchColumn()) throw new \RuntimeException('already_enrolled');
            $exists=$this->db->prepare("SELECT status FROM course_participants WHERE course_id=? AND person_id=?"); $exists->execute([$course,$personId]);
            if($exists->fetchColumn()==='active') return;
            if((int)$row['max_participants']>0 && (int)$row['enrolled'] >= (int)$row['max_participants']) throw new \RuntimeException('course_full');
            $insert=$this->db->prepare("INSERT INTO course_participants (course_id,person_id,status) VALUES (?,?,'active') ON DUPLICATE KEY UPDATE status='active',enrolled_at=CURRENT_TIMESTAMP"); $insert->execute([$course,$personId]);
        });
    }
    private function select(): string
    {
        return "SELECT c.id,c.name,c.description,c.es_evento,c.qr_link,c.cover_stored_name IS NOT NULL cover_available,c.start_date,c.end_date,c.status,c.max_participants,(SELECT GROUP_CONCAT(ct.tecnico_user_id) FROM course_tecnicos ct WHERE ct.course_id=c.id) tecnico_user_ids_csv,(SELECT GROUP_CONCAT(CONCAT(tu.first_name,' ',tu.last_name) ORDER BY tu.last_name,tu.first_name SEPARATOR ', ') FROM course_tecnicos ct JOIN users tu ON tu.id=ct.tecnico_user_id WHERE ct.course_id=c.id) tecnico_name,COUNT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_count,GROUP_CONCAT(DISTINCT CASE WHEN cp.status='active' THEN cp.person_id END) participant_ids_csv,GROUP_CONCAT(DISTINCT CASE WHEN cp.status='active' THEN CONCAT(p.first_name,' ',p.last_name) END ORDER BY p.last_name,p.first_name SEPARATOR ', ') participant_names FROM courses c LEFT JOIN course_participants cp ON cp.course_id=c.id LEFT JOIN people p ON p.id=cp.person_id";
    }
    private function mapCourse(array $course): array
    {
        $csv=$course['participant_ids_csv']??''; $course['participant_ids']=$csv===''?[]:array_map('intval',explode(',',$csv)); $tecnicos=$course['tecnico_user_ids_csv']??''; $course['tecnico_user_ids']=$tecnicos===''?[]:array_map('intval',explode(',',$tecnicos)); unset($course['participant_ids_csv'],$course['tecnico_user_ids_csv']); return $course;
    }
    private function syncParticipants(int $course,array $ids): void
    {
        $q=$this->db->prepare("UPDATE course_participants SET status='inactive' WHERE course_id=?"); $q->execute([$course]);
        $q=$this->db->prepare("INSERT INTO course_participants (course_id,person_id,status) VALUES (?,?,'active') ON DUPLICATE KEY UPDATE status='active'");
        foreach($ids as $id) $q->execute([$course,$id]);
    }
    private function syncTecnicos(int $course,array $ids): void
    {
        $this->db->prepare('DELETE FROM course_tecnicos WHERE course_id=?')->execute([$course]);
        $q=$this->db->prepare('INSERT INTO course_tecnicos (course_id,tecnico_user_id) VALUES (?,?)');
        foreach($ids as $id) $q->execute([$course,$id]);
    }
    private function syncWeeklyEvidence(int $course,string $start,string $end,bool $isEvent=false): void
    {
        $from=new \DateTimeImmutable($start); $to=new \DateTimeImmutable($end); $days=(int)$from->diff($to)->days+1; $weeks=$isEvent?1:max(1,(int)ceil($days/7)); $insert=$this->db->prepare('INSERT INTO course_weekly_evidences (course_id,week_number,week_start,week_end) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE week_start=VALUES(week_start),week_end=VALUES(week_end)');
        for($week=1;$week<=$weeks;$week++){ $weekStart=$from->modify('+'.(($week-1)*7).' days'); $weekEnd=$weekStart->modify('+6 days'); if($weekEnd>$to)$weekEnd=$to; $insert->execute([$course,$week,$weekStart->format('Y-m-d'),$weekEnd->format('Y-m-d')]); }
        $this->db->prepare('DELETE FROM course_weekly_evidences WHERE course_id=? AND week_number>?')->execute([$course,$weeks]);
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
        if ($role==='tecnico') return ['EXISTS (SELECT 1 FROM course_tecnicos ct_scope WHERE ct_scope.course_id=c.id AND ct_scope.tecnico_user_id=? AND ct_scope.status=\'active\')',[$id]];
        $person="(p.user_id={$id} OR p.ci=(SELECT ci FROM users WHERE id={$id}))";
        if ($role==='beneficiary') $person.=' AND EXISTS (SELECT 1 FROM beneficiaries b WHERE b.person_id=p.id AND b.is_active=1)';
        elseif ($role==='student') $person.=" AND EXISTS (SELECT 1 FROM students s JOIN users su ON su.id=s.user_id AND su.is_active=1 WHERE su.id={$id} AND s.is_active=1)";
        else return ['1=0',[]];
        return ["EXISTS (SELECT 1 FROM course_participants cp2 JOIN people p ON p.id=cp2.person_id WHERE cp2.course_id=c.id AND cp2.status='active' AND {$person})",[]];
    }
}
