-- Permite al tecnico administrar eventos con el mismo permiso operativo de cursos.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code='courses.manage'
WHERE r.code='tecnico';
