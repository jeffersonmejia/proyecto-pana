<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/config/bootstrap.php';

$db = database_connection();
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'pana') {
    throw new RuntimeException('El seed solo puede aplicarse a la base pana.');
}
$accounts = [
    'alexandra.carrion@pana.com'=>['Alexandra','Carrión','coordinator'],
    'oswaldo.arias@pana.com'=>['Oswaldo','Arias','admin'],
    'veronica.martinez@pana.com'=>['Verónica','Martínez','beneficiary'],
    'jefferson.mejia@pana.com'=>['Jefferson','Mejía','student'],
    'john.cruz@pana.com'=>['John','Cruz','tutor'],
];
$roles = $db->query("SELECT code,id FROM roles WHERE is_active=1")->fetchAll(PDO::FETCH_KEY_PAIR);
$db->beginTransaction();
try {
    $find = $db->prepare('SELECT id,role_id FROM users WHERE email=?');
    $update = $db->prepare('UPDATE users SET first_name=?,last_name=?,role_id=?,is_active=1 WHERE id=?');
    $sync = $db->prepare('DELETE FROM user_roles WHERE user_id=?');
    $addRole = $db->prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)');
    $ids = [];
    foreach ($accounts as $email=>$account) {
        [$first,$last,$role] = $account;
        if (!isset($roles[$role])) throw new RuntimeException('Falta el rol: '.$role);
        $find->execute([$email]); $user = $find->fetch(PDO::FETCH_ASSOC);
        if ($user === false) throw new RuntimeException('Falta la cuenta: '.$email);
        $update->execute([$first,$last,$roles[$role],$user['id']]); $sync->execute([$user['id']]); $addRole->execute([$user['id'],$roles[$role]]);
        $ids[] = (int) $user['id'];
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $db->prepare("UPDATE users SET is_active=0 WHERE id NOT IN ($placeholders)")->execute($ids);
    $db->prepare("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP()) WHERE user_id NOT IN ($placeholders)")->execute($ids);
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    throw $error;
}
$credentialFile = dirname(__DIR__, 3) . '/users.txt';
$lines = ['Clave para todo: Pana.proyecto2026','',
    'Alexandra | alexandra.carrion@pana.com | Coordinadora',
    'Oswaldo | oswaldo.arias@pana.com | Administrador',
    'Verónica | veronica.martinez@pana.com | Beneficiaria',
    'Jefferson | jefferson.mejia@pana.com | Estudiante',
    'John | john.cruz@pana.com | Tutor'];
file_put_contents($credentialFile, implode(PHP_EOL, $lines) . PHP_EOL, LOCK_EX);
echo "Solo las cinco cuentas del proyecto quedaron activas." . PHP_EOL;
