<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$role = $db->query("SELECT id FROM roles WHERE code='beneficiary' AND is_active=1")->fetchColumn();
if (!$role) throw new RuntimeException('Falta el rol beneficiario activo.');
$find = $db->prepare('SELECT id,role_id FROM users WHERE email=?');
$find->execute(['veronica.martinez@pana.com']);
$target = $find->fetch(PDO::FETCH_ASSOC);
if ($target !== false && (int) $target['role_id'] !== (int) $role) {
    throw new RuntimeException('El correo de la beneficiaria ya pertenece a otro rol.');
}
$beneficiaryId = $target ? (int) $target['id'] : (int) $db->query("SELECT u.id FROM users u JOIN people p ON p.user_id=u.id JOIN beneficiaries b ON b.person_id=p.id WHERE u.role_id={$role} AND u.is_active=1 AND b.is_active=1 ORDER BY u.id LIMIT 1")->fetchColumn();
if (!$beneficiaryId) throw new RuntimeException('No existe una cuenta beneficiaria para actualizar.');
$db->beginTransaction();
try {
    $update = $db->prepare('UPDATE users SET first_name=?,last_name=?,email=?,password_hash=?,role_id=?,is_active=1 WHERE id=?');
    $update->execute(['Verónica','Martínez','veronica.martinez@pana.com',password_hash('Pana.proyecto2026', PASSWORD_DEFAULT),$role,$beneficiaryId]);
    $db->prepare('DELETE FROM user_roles WHERE user_id=?')->execute([$beneficiaryId]);
    $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)')->execute([$beneficiaryId,$role]);
    $db->prepare('UPDATE people SET first_name=?,last_name=?,email=? WHERE user_id=?')->execute(['Verónica','Martínez','veronica.martinez@pana.com',$beneficiaryId]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$credentialFile = dirname(__DIR__, 3) . '/users.txt';
$content = is_file($credentialFile) ? file_get_contents($credentialFile) : '';
$lines = preg_split('/\R/', rtrim((string) $content));
$line = 'Verónica | veronica.martinez@pana.com | Beneficiaria | Pana.proyecto2026';
$found = false;
foreach ($lines as $index=>$old) if (str_contains($old, 'veronica.martinez@pana.com') || str_contains($old, 'beneficiario.prueba@pana.test')) { $lines[$index]=$line; $found=true; }
if (!$found) $lines[]=$line;
file_put_contents($credentialFile, implode(PHP_EOL, array_filter($lines, static fn($value)=>$value !== '')) . PHP_EOL, LOCK_EX);
echo "Cuenta de beneficiaria actualizada." . PHP_EOL;
