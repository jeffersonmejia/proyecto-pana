<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$samples = [
    'Acompañamiento a Personas Adultas Mayores' => [
        ['Jornada de bienvenida y bienestar', 'Preparar una jornada de encuentro y revisar las necesidades de acompañamiento.', '2026-10-02 09:00:00', '2026-10-02 11:00:00'],
        ['Taller de memoria y convivencia', 'Realizar actividades grupales para promover la memoria y la convivencia.', '2026-10-09 09:00:00', '2026-10-09 11:00:00'],
    ],
    'Apoyo al Desarrollo Infantil y Familiar' => [
        ['Jornada de lectura y juego', 'Organizar actividades recreativas y de lectura para niñas y niños.', '2026-10-02 09:00:00', '2026-10-02 11:00:00'],
        ['Seguimiento de acompañamiento familiar', 'Registrar acuerdos y necesidades de seguimiento con las familias.', '2026-10-09 09:00:00', '2026-10-09 11:00:00'],
    ],
    'Inclusión de Personas con Discapacidad' => [
        ['Taller de autonomía cotidiana', 'Preparar una actividad práctica de autonomía e inclusión.', '2026-10-02 09:00:00', '2026-10-02 11:00:00'],
        ['Encuentro de inclusión comunitaria', 'Coordinar un espacio de participación con las familias.', '2026-10-09 09:00:00', '2026-10-09 11:00:00'],
    ],
    'Atención a Familias en Situación Vulnerable' => [
        ['Jornada de orientación familiar', 'Revisar servicios de apoyo y preparar orientación para las familias.', '2026-10-02 09:00:00', '2026-10-02 11:00:00'],
        ['Mapa de redes de apoyo', 'Identificar recursos comunitarios y registrar rutas de acompañamiento.', '2026-10-09 09:00:00', '2026-10-09 11:00:00'],
    ],
    'Promoción de Salud y Bienestar Comunitario' => [
        ['Feria comunitaria de prevención', 'Apoyar la organización de una jornada de promoción de la salud.', '2026-10-02 09:00:00', '2026-10-02 11:00:00'],
        ['Actividad de bienestar integral', 'Preparar una actividad comunitaria de prevención y bienestar.', '2026-10-09 09:00:00', '2026-10-09 11:00:00'],
    ],
];
$courseQuery = $db->prepare('SELECT id,tutor_user_id FROM courses WHERE name=? AND status=\'active\'');
$participantQuery = $db->prepare("SELECT person_id FROM course_participants WHERE course_id=? AND status='active' ORDER BY person_id");
$existingQuery = $db->prepare('SELECT a.id FROM course_activities ca JOIN activities a ON a.id=ca.activity_id WHERE ca.course_id=? AND a.title=? LIMIT 1');
$insertActivity = $db->prepare("INSERT INTO activities (title,description,responsible,start_at,end_at,status,created_by) VALUES (?,?,?, ?,?, 'planned',?)");
$linkActivity = $db->prepare('INSERT IGNORE INTO course_activities (course_id,activity_id) VALUES (?,?)');
$assignParticipant = $db->prepare('INSERT IGNORE INTO activity_participants (activity_id,participant_id) VALUES (?,?)');
$created = 0;
$db->beginTransaction();
try {
    foreach ($samples as $courseName => $tasks) {
        $courseQuery->execute([$courseName]);
        $course = $courseQuery->fetch();
        if (!$course) throw new RuntimeException('Falta el curso activo: ' . $courseName);
        $participantQuery->execute([$course['id']]);
        $participants = array_column($participantQuery->fetchAll(), 'person_id');
        if (!$participants) throw new RuntimeException('El curso no tiene participantes: ' . $courseName);
        foreach ($tasks as [$title,$description,$start,$end]) {
            $existingQuery->execute([$course['id'],$title]);
            $activityId = $existingQuery->fetchColumn();
            if ($activityId === false) {
                $insertActivity->execute([$title,$description,'Equipo del Patronato',$start,$end,$course['tutor_user_id']]);
                $activityId = (int)$db->lastInsertId();
                $linkActivity->execute([$course['id'],$activityId]);
                $created++;
            }
            foreach ($participants as $personId) $assignParticipant->execute([$activityId,$personId]);
        }
    }
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
echo $created . " tareas de ejemplo nuevas; las existentes se conservaron y se verificaron sus asignaciones." . PHP_EOL;
