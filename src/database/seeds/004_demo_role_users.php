<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
$roleQuery = $db->prepare('SELECT id FROM roles WHERE code=? AND is_active=1');
$specs = [
    ['coordinator','coordinador.demo@pana.test','PANA-COORD-0001','Coordinador','Demo','PanaDemo2026!Coord'],
    ['tutor','tutor.demo@pana.test','PANA-TUTOR-0001','Tutor','Demo','PanaDemo2026!Tutor'],
    ['student','estudiante.demo@pana.test','PANA-STUD-0001','Estudiante','Demo','PanaDemo2026!Student'],
    ['volunteer','voluntario.demo@pana.test','PANA-VOL-0001','Voluntario','Demo','PanaDemo2026!Volunteer'],
    ['beneficiary','beneficiario.demo@pana.test','PANA-BEN-0001','Beneficiario','Demo','PanaDemo2026!Beneficiary'],
];
$credentials = [];
$db->beginTransaction();
try {
    foreach ($specs as [$code,$email,$ci,$first,$last,$password]) {
        $roleQuery->execute([$code]); $roleId=(int)$roleQuery->fetchColumn();
        if (!$roleId) throw new RuntimeException('Falta el rol activo: '.$code);
        $userId=ensureUser($db,$email,$ci,$first,$last,$roleId,$password);
        $credentials[$email]=$password;
        $db->prepare('INSERT IGNORE INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$userId,$roleId]);
        if ($code==='coordinator') $db->prepare("INSERT INTO coordinators (user_id,position,is_active) VALUES (?, 'Coordinador de proyectos',1) ON DUPLICATE KEY UPDATE position=VALUES(position),is_active=1")->execute([$userId]);
        if ($code==='tutor') $db->prepare("INSERT INTO tutors (user_id,institution,position,is_active) VALUES (?, 'Patronato Municipal de Santo Domingo','Tutor de proyecto',1) ON DUPLICATE KEY UPDATE is_active=1")->execute([$userId]);
        if ($code==='volunteer') $db->prepare("INSERT INTO volunteers (user_id,entry_date,is_active) VALUES (?,CURRENT_DATE,1) ON DUPLICATE KEY UPDATE is_active=1")->execute([$userId]);
        if ($code==='student') ensureStudent($db,$userId,$ci,$email,$first,$last);
        if ($code==='beneficiary') ensureBeneficiary($db,$userId,$ci,$email,$first,$last);
    }
    $db->commit();
} catch (Throwable $error) { if ($db->inTransaction()) $db->rollBack(); throw $error; }
$file=dirname(__DIR__,3).'/users.txt';
$lines=['Cuentas locales de prueba PANA (no usar estas contraseñas en producción).','Informático existente: jefferson@gmail.com | consultar la clave ya registrada'];
foreach($credentials as $email=>$password)$lines[]=$email.' | '.$password;
file_put_contents($file,implode(PHP_EOL,$lines).PHP_EOL,LOCK_EX);
echo count($credentials).' cuentas de roles creadas o verificadas; credenciales actualizadas en users.txt'.PHP_EOL;

function ensureUser(PDO $db,string $email,string $ci,string $first,string $last,int $role,string $password): int
{
    $q=$db->prepare('SELECT id,role_id FROM users WHERE email=?');$q->execute([$email]);$found=$q->fetch();
    if($found){if((int)$found['role_id']!==$role)throw new RuntimeException('El correo ya pertenece a otro rol: '.$email);return (int)$found['id'];}
    $q=$db->prepare('INSERT INTO users (ci,first_name,last_name,email,password_hash,role_id) VALUES (?,?,?,?,?,?)');
    $q->execute([$ci,$first,$last,$email,password_hash($password,PASSWORD_DEFAULT),$role]);return (int)$db->lastInsertId();
}
function ensurePerson(PDO $db,int $userId,string $ci,string $email,string $first,string $last): int
{
    $q=$db->prepare('SELECT id FROM people WHERE ci=?');$q->execute([$ci]);$id=(int)$q->fetchColumn();
    if(!$id){$q=$db->prepare("INSERT INTO people (ci,first_name,last_name,email,user_id,status) VALUES (?,?,?,?,?,'active')");$q->execute([$ci,$first,$last,$email,$userId]);$id=(int)$db->lastInsertId();}
    else $db->prepare("UPDATE people SET user_id=?,first_name=?,last_name=?,email=?,status='active' WHERE id=?")->execute([$userId,$first,$last,$email,$id]);
    $db->prepare('INSERT INTO participants (person_id,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1')->execute([$id]);return $id;
}
function ensureStudent(PDO $db,int $userId,string $ci,string $email,string $first,string $last): void
{
    $person=ensurePerson($db,$userId,$ci,$email,$first,$last);$db->prepare('INSERT INTO students (user_id,university_id,career_id,process_type,hours_required,start_date,is_active) SELECT ?,u.id,c.id,\'Proyecto de apoyo social\',120,CURRENT_DATE,1 FROM universities u JOIN careers c ON c.university_id=u.id ORDER BY u.id,c.id LIMIT 1 ON DUPLICATE KEY UPDATE is_active=1')->execute([$userId]);
}
function ensureBeneficiary(PDO $db,int $userId,string $ci,string $email,string $first,string $last): void
{
    $person=ensurePerson($db,$userId,$ci,$email,$first,$last);$db->prepare('INSERT INTO beneficiaries (person_id,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1')->execute([$person]);
}
