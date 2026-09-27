<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
final class EventRepository
{
    public function __construct(private PDO $db) {}
    public function list(array $actor): array
    {
        $role=$actor['roles'][0]??''; $where=$role==='coordinator'?'e.created_by=?':'1=1'; $params=$role==='coordinator'?[(int)$actor['id']]:[];
        if(in_array($role,['student','beneficiary'],true))$where="e.status='active'";
        $sql="SELECT e.id,e.name,e.description,e.event_date,e.event_time,e.location,e.meeting_point,e.requirements,e.status,e.max_participants,e.created_by,COUNT(ep.person_id) participant_count,MAX(CASE WHEN ep.person_id=p.id AND ep.status='active' THEN 1 ELSE 0 END) enrolled FROM events e LEFT JOIN event_participants ep ON ep.event_id=e.id AND ep.status='active' LEFT JOIN people p ON p.user_id=? WHERE {$where} GROUP BY e.id ORDER BY e.event_date,e.event_time,e.name";
        array_unshift($params,(int)$actor['id']); $q=$this->db->prepare($sql);$q->execute($params);return array_map(static function(array $row):array{$row['id']=(int)$row['id'];$row['participant_count']=(int)$row['participant_count'];$row['enrolled']=(bool)$row['enrolled'];return $row;},$q->fetchAll());
    }
    public function create(array $data,int $user): int { $q=$this->db->prepare('INSERT INTO events (name,description,event_date,event_time,location,meeting_point,requirements,status,max_participants,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)');$q->execute([$data['name'],$data['description'],$data['event_date'],$data['event_time'],$data['location'],$data['meeting_point'],$data['requirements'],$data['status'],$data['max_participants'],$user]);return (int)$this->db->lastInsertId(); }
    public function enroll(int $event,array $input,int $user): void
    {
        $q=$this->db->prepare("SELECT e.max_participants,COUNT(ep.person_id) enrolled FROM events e LEFT JOIN event_participants ep ON ep.event_id=e.id AND ep.status='active' WHERE e.id=? AND e.status='active' GROUP BY e.id");$q->execute([$event]);$row=$q->fetch();if(!$row)throw new \RuntimeException('event_unavailable');
        $p=$this->db->prepare("SELECT id FROM people WHERE user_id=? AND status='active'");$p->execute([$user]);$person=(int)$p->fetchColumn();if(!$person)throw new \RuntimeException('person_not_found');
        $existing=$this->db->prepare("SELECT status FROM event_participants WHERE event_id=? AND person_id=?");$existing->execute([$event,$person]);if($existing->fetchColumn()==='active')return;
        if((int)$row['max_participants']>0&&(int)$row['enrolled']>=(int)$row['max_participants'])throw new \RuntimeException('event_full');
        $fullName=trim((string)($input['full_name']??''));$email=trim((string)($input['email']??''));$gender=trim((string)($input['gender']??''));$category=trim((string)($input['category']??''));$phone=trim((string)($input['phone']??''));$address=trim((string)($input['address']??''));if($fullName===''||!filter_var($email,FILTER_VALIDATE_EMAIL)||$gender===''||$category===''||$phone===''||$address==='')throw new \RuntimeException('invalid_registration');
        $this->db->prepare("INSERT INTO event_participants (event_id,person_id,full_name,email,gender,gender_other,category,phone,address,status) VALUES (?,?,?,?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),email=VALUES(email),gender=VALUES(gender),gender_other=VALUES(gender_other),category=VALUES(category),phone=VALUES(phone),address=VALUES(address),status='active',enrolled_at=CURRENT_TIMESTAMP")->execute([$event,$person,$fullName,$email,$gender,trim((string)($input['gender_other']??''))?:null,$category,$phone,$address]);
    }
}
