<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$roles = $db->query("SELECT code,id FROM roles WHERE code IN ('admin','coordinator') AND is_active=1")
    ->fetchAll(PDO::FETCH_KEY_PAIR);
if (!isset($roles['admin'], $roles['coordinator'])) throw new RuntimeException('Faltan roles de gestion.');
$db->beginTransaction();
try {
    $find = $db->prepare('SELECT id,role_id FROM users WHERE email=?');
    $find->execute(['alexandra.carrion@pana.com']);
    $alexandra = $find->fetch(PDO::FETCH_ASSOC);
    $current = $db->query("SELECT id FROM users WHERE role_id={$roles['coordinator']} AND is_active=1 ORDER BY id LIMIT 1")
        ->fetchColumn();
    if ($alexandra !== false && (int) $alexandra['role_id'] !== (int) $roles['coordinator']) {
        throw new RuntimeException('El correo de Alexandra ya pertenece a otro rol.');
    }
    $coordinatorId = $alexandra ? (int) $alexandra['id'] : (int) ($current ?: 0);
    if (!$coordinatorId) {
        $insert = $db->prepare('INSERT INTO users (ci,first_name,last_name,email,password_hash,role_id) VALUES (?,?,?,?,?,?)');
        $insert->execute(['PANA-COORD-0001','Alexandra','Carrión','alexandra.carrion@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$roles['coordinator']]);
        $coordinatorId = (int) $db->lastInsertId();
    } else {
        $update = $db->prepare('UPDATE users SET first_name=?,last_name=?,email=?,password_hash=?,role_id=?,is_active=1 WHERE id=?');
        $update->execute(['Alexandra','Carrión','alexandra.carrion@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$roles['coordinator'],$coordinatorId]);
    }
    $db->prepare('UPDATE users SET is_active=0 WHERE role_id=? AND id<>?')->execute([$roles['coordinator'],$coordinatorId]);
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?) ON DUPLICATE KEY UPDATE role_id=VALUES(role_id)')->execute([$coordinatorId,$roles['coordinator']]);
    $db->prepare("INSERT INTO coordinators (user_id,position,is_active) VALUES (?, 'Coordinadora de proyectos',1) ON DUPLICATE KEY UPDATE position=VALUES(position),is_active=1")->execute([$coordinatorId]);
    $db->prepare('UPDATE courses SET coordinator_user_id=? WHERE coordinator_user_id IS NULL OR coordinator_user_id<>?')->execute([$coordinatorId,$coordinatorId]);
    $find->execute(['oswaldo.arias@pana.com']);
    $oswaldo = $find->fetch(PDO::FETCH_ASSOC);
    if ($oswaldo !== false && (int) $oswaldo['role_id'] !== (int) $roles['admin']) {
        throw new RuntimeException('El correo de Oswaldo ya pertenece a otro rol.');
    }
    $adminId = $oswaldo ? (int) $oswaldo['id'] : (int) $db->query("SELECT id FROM users WHERE role_id={$roles['admin']} AND is_active=1 ORDER BY id LIMIT 1")->fetchColumn();
    if (!$adminId) {
        $insert->execute(['PANA-ADMIN-0001','Oswaldo','Arias','oswaldo.arias@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$roles['admin']]);
        $adminId = (int) $db->lastInsertId();
    } else {
        $update->execute(['Oswaldo','Arias','oswaldo.arias@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$roles['admin'],$adminId]);
    }
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?) ON DUPLICATE KEY UPDATE role_id=VALUES(role_id)')->execute([$adminId,$roles['admin']]);
    $db->prepare('UPDATE users SET is_active=0 WHERE role_id=? AND id<>?')->execute([$roles['admin'],$adminId]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$credentialFile = dirname(__DIR__, 3) . '/users.txt';
$content = is_file($credentialFile) ? file_get_contents($credentialFile) : '';
$lines = preg_split('/\R/', rtrim((string) $content));
$accounts = ['alexandra.carrion@pana.com'=>['Alexandra','Coordinadora'],'oswaldo.arias@pana.com'=>['Oswaldo','Administrador']];
foreach ($accounts as $email=>$account) {
    [$name,$role] = $account; $line = $name . ' | ' . $email . ' | ' . $role . ' | Pana.proyecto2026'; $found = false;
    foreach ($lines as $index=>$old) if (str_contains($old, $email)) { $lines[$index]=$line; $found=true; }
    if (!$found) $lines[]=$line;
}
file_put_contents($credentialFile, implode(PHP_EOL, array_filter($lines, static fn($line)=>$line !== '')) . PHP_EOL, LOCK_EX);
echo "Cuenta unica de coordinacion y administracion configuradas." . PHP_EOL;
