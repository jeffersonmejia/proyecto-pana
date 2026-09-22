<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
$databaseName = $db->query('SELECT DATABASE()')->fetchColumn();
if ($databaseName !== 'pana') throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
$roles = $db->query("SELECT code,id FROM roles WHERE code IN ('tutor','student') AND is_active=1")->fetchAll(\PDO::FETCH_KEY_PAIR);
if (!isset($roles['tutor'], $roles['student'])) throw new RuntimeException('Faltan roles tutor o student activos.');
$university = $db->prepare("INSERT INTO universities (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
$university->execute(['Universidad de Prueba PANA']);
$universityId = (int)$db->lastInsertId();
$career = $db->prepare("INSERT INTO careers (university_id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
$career->execute([$universityId,'Trabajo Social y Comunitario']);
$careerId = (int)$db->lastInsertId();
$oldCredentials = [];
$credentialFile = dirname(__DIR__, 3) . '/harness/usuarios_prueba_cursos.txt';
if (is_file($credentialFile)) foreach (file($credentialFile, FILE_IGNORE_NEW_LINES) as $line) {
    if (str_contains($line,'@') && str_contains($line,' | ')) [$mail,$pass] = explode(' | ',$line,2);
    else continue;
    $oldCredentials[$mail] = $pass;
}
$newCredentials = [];
$db->beginTransaction();
try {
    for ($i=1; $i<=30; $i++) {
        $number = str_pad((string)$i,2,'0',STR_PAD_LEFT);
        $tutor = ensureUser($db,'tutor'.$number.'@pana.test','PANA-TUT-'.str_pad((string)$i,4,'0',STR_PAD_LEFT),'Tutor','Proyecto '.$number,(int)$roles['tutor'],$newCredentials);
        $profile = $db->prepare("INSERT INTO tutors (user_id,institution,position,is_active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE institution=VALUES(institution),position=VALUES(position),is_active=1");
        $profile->execute([$tutor,'Patronato Municipal de Santo Domingo','Tutor de proyecto social']);

        $email = 'estudiante'.$number.'@pana.test'; $ci = 'PANA-EST-'.str_pad((string)$i,4,'0',STR_PAD_LEFT);
        $person = $db->prepare('SELECT id,user_id FROM people WHERE ci=?'); $person->execute([$ci]); $row = $person->fetch();
        if (!$row) {
            $add = $db->prepare("INSERT INTO people (ci,first_name,last_name,email,status) VALUES (?,?,?,?,'active')");
            $add->execute([$ci,'Estudiante','Proyecto '.$number,$email]); $personId = (int)$db->lastInsertId();
        } else { $personId = (int)$row['id']; if ($row['user_id'] !== null) throw new RuntimeException('La identidad de prueba ya está vinculada.'); }
        $student = ensureUser($db,$email,$ci,'Estudiante','Proyecto '.$number,(int)$roles['student'],$newCredentials);
        $link = $db->prepare('UPDATE people SET user_id=?,first_name=?,last_name=?,email=?,status=\'active\' WHERE id=?');
        $link->execute([$student,'Estudiante','Proyecto '.$number,$email,$personId]);
        $db->prepare('INSERT INTO participants (person_id,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1')->execute([$personId]);
        $studentProfile = $db->prepare('INSERT INTO students (user_id,university_id,career_id,process_type,hours_required,hours_completed,start_date,is_active) VALUES (?,?,?,?,120,0,CURRENT_DATE,1) ON DUPLICATE KEY UPDATE university_id=VALUES(university_id),career_id=VALUES(career_id),process_type=VALUES(process_type),is_active=1');
        $studentProfile->execute([$student,$universityId,$careerId,'Proyecto de apoyo social']);
    }
    $projects = [
        'Acompañamiento a Personas Adultas Mayores',
        'Apoyo al Desarrollo Infantil y Familiar',
        'Inclusión de Personas con Discapacidad',
        'Atención a Familias en Situación Vulnerable',
        'Promoción de Salud y Bienestar Comunitario',
    ];
    $findCourse = $db->prepare('SELECT id FROM courses WHERE name=?');
    $findTutor = $db->prepare('SELECT id FROM users WHERE email=?');
    $findStudent = $db->prepare('SELECT p.id FROM people p WHERE p.ci=?');
    $setTutor = $db->prepare('UPDATE courses SET tutor_user_id=? WHERE id=?');
    $enroll = $db->prepare("INSERT INTO course_participants (course_id,person_id,status) VALUES (?,?,'active') ON DUPLICATE KEY UPDATE status='active'");
    $assign = $db->prepare('INSERT IGNORE INTO tutor_student_assignments (tutor_user_id,student_person_id) VALUES (?,?)');
    foreach ($projects as $index=>$name) {
        $findCourse->execute([$name]); $courseId=$findCourse->fetchColumn();
        if ($courseId === false) throw new RuntimeException('Falta el proyecto de prueba: '.$name);
        $findTutor->execute(['tutor'.str_pad((string)($index+1),2,'0',STR_PAD_LEFT).'@pana.test']);
        $tutorId=(int)$findTutor->fetchColumn(); $setTutor->execute([$tutorId,(int)$courseId]);
        for ($j=$index*6+1; $j<=$index*6+6; $j++) {
            $findStudent->execute(['PANA-EST-'.str_pad((string)$j,4,'0',STR_PAD_LEFT)]); $personId=(int)$findStudent->fetchColumn();
            $enroll->execute([(int)$courseId,$personId]); $assign->execute([$tutorId,$personId]);
        }
    }
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$lines = ['Cuentas locales de prueba PANA; contraseña distinta para cada usuario.'];
foreach ($oldCredentials + $newCredentials as $email=>$password) $lines[] = $email.' | '.$password;
if (!is_dir(dirname($credentialFile))) mkdir(dirname($credentialFile),0775,true);
file_put_contents($credentialFile,implode(PHP_EOL,$lines).PHP_EOL,LOCK_EX);
echo "30 tutores y 30 estudiantes listos; credenciales en harness/usuarios_prueba_cursos.txt".PHP_EOL;

function ensureUser(\PDO $db,string $email,string $ci,string $first,string $last,int $role,array &$created): int
{
    $query=$db->prepare('SELECT id,role_id FROM users WHERE email=?'); $query->execute([$email]); $found=$query->fetch();
    if ($found) { if ((int)$found['role_id']!==$role) throw new RuntimeException('El correo de prueba tiene otro rol: '.$email); return (int)$found['id']; }
    $password=bin2hex(random_bytes(12));
    $insert=$db->prepare('INSERT INTO users (ci,first_name,last_name,email,password_hash,role_id) VALUES (?,?,?,?,?,?)');
    $insert->execute([$ci,$first,$last,$email,password_hash($password,PASSWORD_DEFAULT),$role]); $id=(int)$db->lastInsertId();
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$id,$role]); $created[$email]=$password;
    return $id;
}
