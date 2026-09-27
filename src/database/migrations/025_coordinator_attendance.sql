-- Permite al coordinador consultar y administrar la asistencia.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('attendance.read', 'attendance.manage')
WHERE r.code = 'coordinator';
