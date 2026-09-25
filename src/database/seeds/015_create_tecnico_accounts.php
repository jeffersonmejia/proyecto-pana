<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}

$role = $db->query("SELECT id FROM roles WHERE code IN ('tecnico','tutor') AND is_active=1 ORDER BY code='tecnico' DESC LIMIT 1")->fetchColumn();
if (!$role) {
    throw new RuntimeException('Falta el rol tecnico activo.');
}
$table = $db->query("SHOW TABLES LIKE 'tecnicos'")->fetchColumn() ? 'tecnicos' : 'tutors';
$people = [
    ['María José', 'López Zambrano', 'maria.lopez@pana.com', '0912345678', '0991234567', 'Técnica de proyectos sociales'],
    ['Carlos Andrés', 'Vera Mendoza', 'carlos.vera@pana.com', '0923456789', '0992345678', 'Técnico de acompañamiento comunitario'],
    ['Ana Belén', 'García Moreira', 'ana.garcia@pana.com', '0934567890', '0993456789', 'Técnica de formación y seguimiento'],
    ['Luis Fernando', 'Sánchez Cedeño', 'luis.sanchez@pana.com', '0945678901', '0994567890', 'Técnico de actividades y territorio'],
];
$password = 'Pana.proyecto2026';
$credentials = [];

$db->beginTransaction();
try {
    foreach ($people as [$first, $last, $email, $ci, $phone, $position]) {
        $find = $db->prepare('SELECT id FROM users WHERE email=?');
        $find->execute([$email]);
        $userId = (int) $find->fetchColumn();
        if (!$userId) {
            $insert = $db->prepare('INSERT INTO users (ci,first_name,last_name,email,phone,password_hash,role_id,is_active) VALUES (?,?,?,?,?,?,?,1)');
            $insert->execute([$ci, $first, $last, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $role]);
            $userId = (int) $db->lastInsertId();
        } else {
            $update = $db->prepare('UPDATE users SET ci=?,first_name=?,last_name=?,phone=?,role_id=?,is_active=1 WHERE id=?');
            $update->execute([$ci, $first, $last, $phone, $role, $userId]);
        }
        $db->prepare('INSERT IGNORE INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$userId, $role]);
        $findPerson = $db->prepare('SELECT id FROM people WHERE user_id=? OR ci=?');
        $findPerson->execute([$userId, $ci]);
        $personId = (int) $findPerson->fetchColumn();
        if (!$personId) {
            $person = $db->prepare("INSERT INTO people (first_name,last_name,email,phone,ci,user_id,status) VALUES (?,?,?,?,?,?,'active')");
            $person->execute([$first, $last, $email, $phone, $ci, $userId]);
            $personId = (int) $db->lastInsertId();
        } else {
            $person = $db->prepare("UPDATE people SET first_name=?,last_name=?,email=?,phone=?,ci=?,user_id=?,status='active' WHERE id=?");
            $person->execute([$first, $last, $email, $phone, $ci, $userId, $personId]);
        }
        $db->prepare('INSERT INTO participants (person_id,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1')->execute([$personId]);
        $sql = "INSERT INTO {$table} (user_id,institution,position,is_active) VALUES (?, 'Patronato Municipal de Santo Domingo', ?, 1) ON DUPLICATE KEY UPDATE institution=VALUES(institution),position=VALUES(position),is_active=1";
        $db->prepare($sql)->execute([$userId, $position]);
        $credentials[] = "$first $last | $email | Técnico | $password";
    }
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}

$file = dirname(__DIR__, 3) . '/users.txt';
$content = is_file($file) ? rtrim((string) file_get_contents($file)) : '';
$content .= ($content === '' ? '' : PHP_EOL) . implode(PHP_EOL, $credentials) . PHP_EOL;
file_put_contents($file, $content, LOCK_EX);
echo '4 cuentas de tecnico creadas o verificadas.' . PHP_EOL;
