<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$john = $db->prepare('SELECT id FROM users WHERE email=? AND is_active=1');
$john->execute(['john.cruz@pana.com']);
$johnId = $john->fetchColumn();
if (!$johnId) throw new RuntimeException('No se encontró la cuenta activa de John.');
$db->beginTransaction();
try {
    $db->exec('DELETE a FROM activities a INNER JOIN course_activities ca ON ca.activity_id=a.id');
    $db->exec('DELETE FROM courses');
    $db->prepare('DELETE FROM tutor_student_assignments WHERE tutor_user_id<>?')->execute([$johnId]);
    $db->prepare('DELETE FROM tutors WHERE user_id<>?')->execute([$johnId]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
echo "Cursos y tutores distintos de John eliminados; John fue conservado." . PHP_EOL;
