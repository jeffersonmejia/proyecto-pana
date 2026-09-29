-- El tecnico consulta y trabaja los eventos asignados, pero no administra el catalogo.
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id=rp.role_id AND r.code='tecnico'
JOIN permissions p ON p.id=rp.permission_id AND p.code IN ('courses.manage','events.manage');
