<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$role = $db->query("SELECT id FROM roles WHERE code='tutor' AND is_active=1")->fetchColumn();
if (!$role) throw new RuntimeException('Falta el rol tutor activo.');
$find = $db->prepare('SELECT id,role_id FROM users WHERE email=?');
$find->execute(['john.cruz@pana.com']);
$target = $find->fetch(PDO::FETCH_ASSOC);
if ($target !== false && (int) $target['role_id'] !== (int) $role) {
    throw new RuntimeException('El correo del tutor ya pertenece a otro rol.');
}
$tutorId = $target ? (int) $target['id'] : (int) $db->query("SELECT u.id FROM users u JOIN tutors t ON t.user_id=u.id WHERE u.role_id={$role} AND u.is_active=1 AND t.is_active=1 ORDER BY u.id LIMIT 1")->fetchColumn();
if (!$tutorId) throw new RuntimeException('No existe una cuenta tutor para actualizar.');
$db->beginTransaction();
try {
    $update = $db->prepare('UPDATE users SET first_name=?,last_name=?,email=?,password_hash=?,role_id=?,is_active=1 WHERE id=?');
    $update->execute(['John','Cruz','john.cruz@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$role,$tutorId]);
    $db->prepare('DELETE FROM user_roles WHERE user_id=?')->execute([$tutorId]);
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$tutorId,$role]);
    $db->prepare('UPDATE tutors SET is_active=1 WHERE user_id=?')->execute([$tutorId]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$credentialFile = dirname(__DIR__, 3) . '/users.txt';
$content = is_file($credentialFile) ? file_get_contents($credentialFile) : '';
$lines = preg_split('/\R/', rtrim((string) $content));
$line = 'John | john.cruz@pana.com | Tutor | Pana.proyecto2026';
$found = false;
foreach ($lines as $index=>$old) if (str_contains($old, 'john.cruz@pana.com') || str_contains($old, 'tutor.prueba@pana.test')) { $lines[$index]=$line; $found=true; }
if (!$found) $lines[]=$line;
file_put_contents($credentialFile, implode(PHP_EOL, array_filter($lines, static fn($value)=>$value !== '')) . PHP_EOL, LOCK_EX);
echo "Cuenta de tutor actualizada." . PHP_EOL;
