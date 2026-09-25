<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$role = $db->query("SELECT id FROM roles WHERE code='student' AND is_active=1")->fetchColumn();
if (!$role) throw new RuntimeException('Falta el rol estudiante activo.');
$find = $db->prepare('SELECT id,role_id FROM users WHERE email=?');
$find->execute(['jefferson.mejia@pana.com']);
$target = $find->fetch(PDO::FETCH_ASSOC);
if ($target !== false && (int) $target['role_id'] !== (int) $role) {
    throw new RuntimeException('El correo del estudiante ya pertenece a otro rol.');
}
$studentId = $target ? (int) $target['id'] : (int) $db->query("SELECT id FROM users WHERE role_id={$role} AND is_active=1 ORDER BY id LIMIT 1")->fetchColumn();
if (!$studentId) throw new RuntimeException('No existe una cuenta estudiante para actualizar.');
$db->beginTransaction();
try {
    $update = $db->prepare('UPDATE users SET first_name=?,last_name=?,email=?,password_hash=?,role_id=?,is_active=1 WHERE id=?');
    $update->execute(['Jefferson','Mejía','jefferson.mejia@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$role,$studentId]);
    $db->prepare('DELETE FROM user_roles WHERE user_id=?')->execute([$studentId]);
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$studentId,$role]);
    $db->prepare('UPDATE people SET first_name=?,last_name=?,email=? WHERE user_id=?')->execute(['Jefferson','Mejía','jefferson.mejia@pana.com',$studentId]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$credentialFile = dirname(__DIR__, 3) . '/users.txt';
$content = is_file($credentialFile) ? file_get_contents($credentialFile) : '';
$lines = preg_split('/\R/', rtrim((string) $content));
$line = 'Jefferson | jefferson.mejia@pana.com | Estudiante | Pana.proyecto2026';
$found = false;
foreach ($lines as $index=>$old) if (str_contains($old, 'jefferson.mejia@pana.com') || str_contains($old, 'estudiante.prueba@pana.test')) { $lines[$index]=$line; $found=true; }
if (!$found) $lines[]=$line;
file_put_contents($credentialFile, implode(PHP_EOL, array_filter($lines, static fn($value)=>$value !== '')) . PHP_EOL, LOCK_EX);
echo "Cuenta de estudiante actualizada." . PHP_EOL;
