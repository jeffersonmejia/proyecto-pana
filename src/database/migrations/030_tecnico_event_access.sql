-- Permite al tecnico entrar y administrar la seccion de eventos.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('events.read','events.manage')
WHERE r.code='tecnico';
