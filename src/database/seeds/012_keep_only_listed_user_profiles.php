<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$emails = ['alexandra.carrion@pana.com','oswaldo.arias@pana.com','veronica.martinez@pana.com','jefferson.mejia@pana.com','john.cruz@pana.com'];
$params = implode(',', array_fill(0, count($emails), '?'));
$find = $db->prepare("SELECT email,id FROM users WHERE email IN ($params)");
$find->execute($emails);
$found = $find->fetchAll(PDO::FETCH_KEY_PAIR);
if (count($found) !== count($emails)) throw new RuntimeException('Falta una cuenta de users.txt.');
$studentId = (int) $found['jefferson.mejia@pana.com'];
$tutorId = (int) $found['john.cruz@pana.com'];
$db->beginTransaction();
try {
    $db->prepare('DELETE FROM students WHERE user_id<>?')->execute([$studentId]);
    $db->prepare('DELETE FROM tutors WHERE user_id<>?')->execute([$tutorId]);
    $db->prepare('DELETE FROM tutor_student_assignments WHERE tutor_user_id<>? OR student_person_id NOT IN (SELECT id FROM people WHERE user_id=?)')->execute([$tutorId,$studentId]);
    $university = $db->query("SELECT id FROM universities WHERE is_active=1 ORDER BY id LIMIT 1")->fetchColumn();
    if (!$university) { $db->exec("INSERT INTO universities (name) VALUES ('Universidad PANA')"); $university = $db->lastInsertId(); }
    $career = $db->prepare('SELECT id FROM careers WHERE university_id=? AND is_active=1 ORDER BY id LIMIT 1');
    $career->execute([$university]); $careerId = $career->fetchColumn();
    if (!$careerId) { $addCareer = $db->prepare('INSERT INTO careers (university_id,name) VALUES (?,?)'); $addCareer->execute([$university,'Proyecto PANA']); $careerId = $db->lastInsertId(); }
    $db->prepare("INSERT INTO students (user_id,university_id,career_id,process_type,hours_required,start_date,is_active) VALUES (?,?,?,?,120,CURRENT_DATE,1) ON DUPLICATE KEY UPDATE university_id=VALUES(university_id),career_id=VALUES(career_id),is_active=1")->execute([$studentId,$university,$careerId,'Proyecto de apoyo social']);
    $db->prepare("INSERT INTO tutors (user_id,institution,position,is_active) VALUES (?, 'Patronato Municipal de Santo Domingo','Tutor de proyecto',1) ON DUPLICATE KEY UPDATE is_active=1")->execute([$tutorId]);
    $db->prepare("DELETE FROM users WHERE email NOT IN ($params)")->execute($emails);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
echo "Users, estudiantes y tutores fueron depurados según users.txt." . PHP_EOL;
