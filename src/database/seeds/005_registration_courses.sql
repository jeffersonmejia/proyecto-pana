-- Cursos vigentes para la inscripción pública. Reejecutable y no destructivo.
UPDATE courses SET start_date='2026-09-01',end_date='2026-12-18',status='active' WHERE id IN (1,2,3,4,5);
UPDATE courses SET status='inactive' WHERE id=9;
UPDATE courses SET start_date='2026-09-01',end_date='2026-12-18',status='active'
WHERE name IN ('Acompañamiento a Personas Adultas Mayores','Apoyo al Desarrollo Infantil y Familiar','Inclusión de Personas con Discapacidad','Atención a Familias en Situación Vulnerable','Promoción de Salud y Bienestar Comunitario');

INSERT INTO courses (name,description,start_date,end_date,status,max_participants,tutor_user_id,coordinator_user_id)
SELECT 'Acompañamiento a Personas Adultas Mayores','Acompañamiento y bienestar para personas adultas mayores.','2026-09-01','2026-12-18','active',30,
       (SELECT t.user_id FROM tutors t JOIN users u ON u.id=t.user_id AND u.is_active=1 WHERE t.is_active=1 ORDER BY t.user_id LIMIT 1),
       (SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id AND r.code='coordinator' AND u.is_active=1 ORDER BY u.id LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name='Acompañamiento a Personas Adultas Mayores');

INSERT INTO courses (name,description,start_date,end_date,status,max_participants,tutor_user_id,coordinator_user_id)
SELECT 'Apoyo al Desarrollo Infantil y Familiar','Apoyo al desarrollo infantil y familiar.','2026-09-01','2026-12-18','active',30,
       (SELECT t.user_id FROM tutors t JOIN users u ON u.id=t.user_id AND u.is_active=1 WHERE t.is_active=1 ORDER BY t.user_id LIMIT 1),
       (SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id AND r.code='coordinator' AND u.is_active=1 ORDER BY u.id LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name='Apoyo al Desarrollo Infantil y Familiar');

-- El registro auxiliar creado por la primera versión del seed no se ofrece en inscripción.
UPDATE courses SET status='inactive' WHERE id=9;
