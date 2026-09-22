-- Proyectos de apoyo del Patronato Municipal de Santo Domingo, Ecuador.
UPDATE courses SET
    description=CASE name
        WHEN 'Desarrollo Web' THEN 'Acompañamiento, orientación y actividades de bienestar para personas adultas mayores del cantón Santo Domingo.'
        WHEN 'Bases de Datos' THEN 'Actividades de desarrollo integral, cuidado y apoyo a familias con niñas y niños atendidos por el Patronato.'
        WHEN 'Programación Móvil' THEN 'Acciones de inclusión, autonomía y acompañamiento a personas con discapacidad y sus familias.'
        WHEN 'Redes y Comunicaciones' THEN 'Orientación social y vinculación con servicios de apoyo para familias en situación de vulnerabilidad.'
        WHEN 'Seguridad Informática' THEN 'Jornadas de promoción de la salud, prevención y bienestar comunitario en Santo Domingo.'
    END
    ,name=CASE name
        WHEN 'Desarrollo Web' THEN 'Acompañamiento a Personas Adultas Mayores'
        WHEN 'Bases de Datos' THEN 'Apoyo al Desarrollo Infantil y Familiar'
        WHEN 'Programación Móvil' THEN 'Inclusión de Personas con Discapacidad'
        WHEN 'Redes y Comunicaciones' THEN 'Atención a Familias en Situación Vulnerable'
        WHEN 'Seguridad Informática' THEN 'Promoción de Salud y Bienestar Comunitario'
    END
WHERE name IN ('Desarrollo Web','Bases de Datos','Programación Móvil','Redes y Comunicaciones','Seguridad Informática');

-- Re-ejecutable: conserva IDs y asigna el primer tutor activo cuando existe.
INSERT INTO courses (name,description,start_date,end_date,status,max_participants,tutor_user_id,coordinator_user_id)
SELECT seed.name,seed.description,'2026-10-01','2026-12-18','active',30,
       (SELECT t.user_id FROM tutors t JOIN users u ON u.id=t.user_id AND u.is_active=1 WHERE t.is_active=1 ORDER BY t.user_id LIMIT 1),
       (SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='coordinator' AND u.is_active=1 ORDER BY u.id LIMIT 1)
FROM (
    SELECT 'Acompañamiento a Personas Adultas Mayores' name,'Acompañamiento, orientación y actividades de bienestar para personas adultas mayores del cantón Santo Domingo.' description UNION ALL
    SELECT 'Apoyo al Desarrollo Infantil y Familiar','Actividades de desarrollo integral, cuidado y apoyo a familias con niñas y niños atendidos por el Patronato.' UNION ALL
    SELECT 'Inclusión de Personas con Discapacidad','Acciones de inclusión, autonomía y acompañamiento a personas con discapacidad y sus familias.' UNION ALL
    SELECT 'Atención a Familias en Situación Vulnerable','Orientación social y vinculación con servicios de apoyo para familias en situación de vulnerabilidad.' UNION ALL
    SELECT 'Promoción de Salud y Bienestar Comunitario','Jornadas de promoción de la salud, prevención y bienestar comunitario en Santo Domingo.'
) seed
ON DUPLICATE KEY UPDATE description=VALUES(description),start_date=VALUES(start_date),end_date=VALUES(end_date),status=VALUES(status),max_participants=VALUES(max_participants);
