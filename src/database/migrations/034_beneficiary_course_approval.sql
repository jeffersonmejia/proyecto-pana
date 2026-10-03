-- Las beneficiarias requieren habilitación técnica antes de acceder a un curso.
-- Mantiene las inscripciones existentes como solicitudes pendientes.
UPDATE course_participants cp
JOIN people p ON p.id = cp.person_id
JOIN beneficiaries b ON b.person_id = p.id
SET cp.status = 'inactive'
WHERE b.is_active = 1
  AND cp.status = 'active';
