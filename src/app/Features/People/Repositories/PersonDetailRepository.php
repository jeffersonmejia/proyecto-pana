<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;

final class PersonDetailRepository
{
    public function __construct(private PDO $db) {}

    public function related(int $id): array
    {
        return ['courses' => $this->query('SELECT c.id,c.name,c.description,c.start_date,c.end_date,c.status,cp.status enrollment_status,cp.enrolled_at FROM courses c JOIN course_participants cp ON cp.course_id=c.id WHERE cp.person_id=? ORDER BY c.start_date DESC', [$id]),
            'activities' => $this->query('SELECT a.id,a.title,a.description,a.start_at,a.end_at,a.status FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id WHERE ap.participant_id=? ORDER BY a.start_at DESC', [$id]),
            'events' => $this->query('SELECT e.id,e.name,e.description,e.event_date,e.event_time,e.location,e.meeting_point,e.requirements,ep.full_name,ep.email,ep.gender,ep.gender_other,ep.category,ep.phone,ep.address,ep.status registration_status,ep.enrolled_at FROM events e JOIN event_participants ep ON ep.event_id=e.id WHERE ep.person_id=? ORDER BY e.event_date DESC', [$id]),
            'attendance' => $this->query('SELECT attendance_date,status,check_in,check_out,note FROM attendance_records WHERE participant_id=? ORDER BY attendance_date DESC LIMIT 200', [$id]),
            'evaluations' => $this->query('SELECT e.id,e.evaluation_type,e.evaluated_on,e.satisfaction_score,e.observations,ROUND(AVG(a.score),2) average_score FROM evaluation_records e LEFT JOIN evaluation_answers a ON a.evaluation_id=e.id WHERE e.person_id=? GROUP BY e.id ORDER BY e.evaluated_on DESC,e.id DESC', [$id]),
            'documents' => $this->query('SELECT id,entity_type,entity_id,original_name,mime_type,file_size,created_at FROM documents WHERE entity_type="person" AND entity_id=? ORDER BY created_at DESC', [$id])];
    }

    private function query(string $sql, array $params): array
    {
        $query = $this->db->prepare($sql); $query->execute($params); return $query->fetchAll();
    }
}
