<?php
declare(strict_types=1);

namespace App\Support;

final class AccessScope
{
    public static function person(string $idExpression, array $actor, string $prefix = 'scope'): array
    {
        $role = $actor['roles'][0] ?? '';
        if (in_array($role, ['admin', 'coordinator'], true)) return ['sql' => '1=1', 'params' => []];
        $userId = (int) ($actor['id'] ?? 0);
        if ($role === 'tutor') return [
            'sql' => "EXISTS (SELECT 1 FROM tutor_student_assignments tsa JOIN tutors tr ON tr.user_id=tsa.tutor_user_id AND tr.is_active=1 JOIN people tp ON tp.id=tsa.student_person_id JOIN users tu ON (tu.id=tp.user_id OR tu.ci=tp.ci) AND tu.is_active=1 JOIN roles trol ON trol.id=tu.role_id AND trol.code='student' AND trol.is_active=1 JOIN students ts ON ts.user_id=tu.id AND ts.is_active=1 WHERE tsa.tutor_user_id={$userId} AND tsa.student_person_id={$idExpression})",
            'params' => [],
        ];
        $profile = ['student' => "EXISTS (SELECT 1 FROM students ps WHERE ps.user_id={$userId} AND ps.is_active=1)",
            'volunteer' => "EXISTS (SELECT 1 FROM volunteers pv WHERE pv.user_id={$userId} AND pv.is_active=1)",
            'beneficiary' => "EXISTS (SELECT 1 FROM beneficiaries pb WHERE pb.person_id=sp.id AND pb.is_active=1)"][$role] ?? '1=0';
        return [
            'sql' => "EXISTS (SELECT 1 FROM people sp WHERE sp.id={$idExpression} AND (sp.user_id={$userId} OR sp.ci=(SELECT ci FROM users WHERE id={$userId})) AND {$profile})",
            'params' => [],
        ];
    }

    public static function activity(string $idExpression, array $actor, string $prefix = 'activity_scope'): array
    {
        if (in_array($actor['roles'][0] ?? '', ['admin', 'coordinator'], true)) {
            return ['sql' => '1=1', 'params' => []];
        }
        $person = self::person('asp.participant_id', $actor, $prefix . '_person');
        return [
            'sql' => "EXISTS (SELECT 1 FROM activity_participants asp WHERE asp.activity_id={$idExpression} AND {$person['sql']})",
            'params' => $person['params'],
        ];
    }

    public static function evaluation(string $idExpression, array $actor, string $recordAlias = 'e'): array
    {
        $role = $actor['roles'][0] ?? '';
        if ($role === 'volunteer') return ['sql' => '1=0', 'params' => []];
        $person = self::person($idExpression, $actor);
        if ($role === 'beneficiary') $person['sql'] .= " AND {$recordAlias}.evaluation_type='satisfaction'";
        if (in_array($role, ['student', 'tutor'], true)) $person['sql'] .= " AND {$recordAlias}.evaluation_type='participant'";
        return $person;
    }

    public static function document(string $type, string $idExpression, array $actor): array
    {
        if ($type === 'person') return self::person($idExpression, $actor);
        if ($type === 'activity') return self::activity($idExpression, $actor);
        $scope = self::evaluation('de.person_id', $actor, 'de');
        if ($scope['sql'] === '1=1') return $scope;
        return ['sql' => "EXISTS (SELECT 1 FROM evaluation_records de WHERE de.id={$idExpression} AND {$scope['sql']})", 'params' => []];
    }
}
