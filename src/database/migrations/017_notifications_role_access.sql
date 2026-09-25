-- Mantiene las notificaciones disponibles para todas las cuentas registradas.
INSERT INTO permissions (code, name)
VALUES ('notifications.read', 'Consultar notificaciones')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'notifications.read'
  AND r.code IN ('admin', 'coordinator', 'tutor', 'student', 'volunteer', 'beneficiary');
