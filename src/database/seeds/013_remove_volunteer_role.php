<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$role = $db->query("SELECT id FROM roles WHERE code='volunteer'")->fetchColumn();
if (!$role) { echo "El rol voluntario ya no existe." . PHP_EOL; exit; }
$db->beginTransaction();
try {
    $db->prepare('DELETE FROM volunteers')->execute();
    $db->prepare('DELETE FROM user_roles WHERE role_id=?')->execute([$role]);
    $db->prepare('DELETE FROM role_permissions WHERE role_id=?')->execute([$role]);
    $db->prepare('UPDATE roles SET is_active=0 WHERE id=?')->execute([$role]);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
echo "Rol voluntario y sus perfiles eliminados; el rol quedó inactivo." . PHP_EOL;
