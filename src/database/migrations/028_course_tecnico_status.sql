-- Permite habilitar o deshabilitar el acceso de un técnico por curso.
ALTER TABLE course_tecnicos
    ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active';
