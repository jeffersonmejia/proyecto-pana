-- Sincroniza las inscripciones activas con el catálogo requerido por asistencia.
INSERT IGNORE INTO participants (person_id)
SELECT DISTINCT cp.person_id
FROM course_participants cp
LEFT JOIN participants p ON p.person_id = cp.person_id
WHERE cp.status = 'active'
  AND p.person_id IS NULL;
