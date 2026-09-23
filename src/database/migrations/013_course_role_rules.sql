-- Reglas de acceso solicitadas para cursos e inscripciones.
-- Aplicar únicamente sobre la base indicada por .env.
INSERT INTO permissions (code,name,description) VALUES
('courses.enroll','Inscribirse en cursos','Permite al beneficiario autoinscribirse en cursos activos.')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);

DELETE rp FROM role_permissions rp
JOIN roles r ON r.id=rp.role_id
JOIN permissions p ON p.id=rp.permission_id
WHERE r.code='admin' AND p.code NOT IN ('users.read','users.manage','courses.read');
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='courses.read' WHERE r.code='admin';
DELETE rp FROM role_permissions rp
JOIN roles r ON r.id=rp.role_id
JOIN permissions p ON p.id=rp.permission_id
WHERE r.code='coordinator';
DELETE rp FROM role_permissions rp
JOIN roles r ON r.id=rp.role_id
JOIN permissions p ON p.id=rp.permission_id
WHERE r.code='beneficiary';

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('courses.read','courses.manage','people.read') WHERE r.code='coordinator';
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('courses.read','courses.enroll') WHERE r.code='beneficiary';
