-- Los estudiantes deben ser habilitados por un técnico antes de acceder a un curso.
UPDATE course_participants cp
JOIN people p ON p.id = cp.person_id
JOIN students s ON (p.user_id = s.user_id OR p.ci = (SELECT u.ci FROM users u WHERE u.id = s.user_id))
SET cp.status = 'inactive'
WHERE s.is_active = 1
  AND cp.status = 'active';
