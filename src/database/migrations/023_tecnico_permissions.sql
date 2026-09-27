-- Ajusta el rol tecnico: puede añadir estudiantes y gestionar asistencia.
-- El rol tutor ya fue renombrado a tecnico en la migracion 018.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'people.read',
    'people.manage',
    'attendance.read',
    'attendance.manage'
)
WHERE r.code = 'tecnico';
