<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class ReportRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function dashboard(): array
    {
        return [
            'participants' => (int) $this->count('SELECT COUNT(*) FROM participants'),
            'beneficiaries' => (int) $this->count('SELECT COUNT(*) FROM beneficiaries'),
            'activities' => (int) $this->count('SELECT COUNT(*) FROM activities'),
            'activities_in_progress' => (int) $this->count("SELECT COUNT(*) FROM activities WHERE status='in_progress'"),
            'attendance_hours' => round((int) $this->count('SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,check_in,check_out)),0) FROM attendance_records') / 60, 2),
            'participant_evaluations' => (int) $this->count("SELECT COUNT(*) FROM evaluation_records WHERE evaluation_type='participant'"),
            'satisfaction_average' => round((float) $this->count("SELECT COALESCE(AVG(satisfaction_score),0) FROM evaluation_records WHERE evaluation_type='satisfaction'"), 2),
            'documents' => (int) $this->count('SELECT COUNT(*) FROM documents'),
        ];
    }

    public function people(string $query): array
    {
        $sql = 'SELECT p.id,p.first_name,p.last_name FROM people p LEFT JOIN participants pa ON pa.person_id=p.id '
            . 'LEFT JOIN beneficiaries b ON b.person_id=p.id WHERE p.status=\'active\' AND (pa.person_id IS NOT NULL OR b.person_id IS NOT NULL)';
        $params = [];
        if ($query !== '') {
            $sql .= ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)';
            $params = ['%' . $query . '%', '%' . $query . '%'];
        }
        $statement = $this->connection->prepare($sql . ' ORDER BY p.last_name,p.first_name LIMIT 100');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function report(array $filters): array
    {
        $spec = [
            'attendance' => ['SELECT a.attendance_date date,p.first_name,p.last_name,a.status,a.check_in,a.check_out,'
                . 'TIMESTAMPDIFF(MINUTE,a.check_in,a.check_out) minutes FROM attendance_records a JOIN people p ON p.id=a.participant_id', 'a.attendance_date', 'a.participant_id'],
            'activities' => ['SELECT a.start_at date,a.title,a.responsible,a.status,GROUP_CONCAT(p.first_name," ",p.last_name SEPARATOR ", ") participants '
                . 'FROM activities a LEFT JOIN activity_participants ap ON ap.activity_id=a.id LEFT JOIN people p ON p.id=ap.participant_id', 'a.start_at', 'ap.participant_id'],
            'evaluations' => ['SELECT e.evaluated_on date,e.evaluation_type type,p.first_name,p.last_name,e.satisfaction_score,'
                . 'ROUND(AVG(ans.score),2) criteria_average,e.observations FROM evaluation_records e JOIN people p ON p.id=e.person_id '
                . 'LEFT JOIN evaluation_answers ans ON ans.evaluation_id=e.id', 'e.evaluated_on', 'e.person_id'],
        ];
        [$select, $dateColumn, $personColumn] = $spec[$filters['type']];
        $where = []; $params = [];
        if ($filters['from']) { $where[] = "{$dateColumn}>=?"; $params[] = $filters['from']; }
        if ($filters['to']) { $where[] = "{$dateColumn}<?"; $params[] = $filters['to'] . ' 23:59:59'; }
        if ($filters['person_id']) { $where[] = "{$personColumn}=?"; $params[] = $filters['person_id']; }
        $sql = $select . ($where ? ' WHERE ' . implode(' AND ', $where) : '');
        if ($filters['type'] !== 'attendance') $sql .= ' GROUP BY ' . ($filters['type'] === 'activities' ? 'a.id' : 'e.id');
        $query = $this->connection->prepare($sql . ' ORDER BY ' . $dateColumn . ' DESC LIMIT 2000');
        $query->execute($params);
        return $query->fetchAll();
    }

    private function count(string $sql): mixed
    {
        return $this->connection->query($sql)->fetchColumn();
    }
}
