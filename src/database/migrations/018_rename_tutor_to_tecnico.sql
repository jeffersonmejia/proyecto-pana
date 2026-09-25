-- Renombra el rol y las relaciones de tutor a tecnico sin eliminar registros.
UPDATE roles SET code='tecnico', name=CONVERT(0x54C3A9636E69636F USING utf8mb4)
WHERE code='tutor';

RENAME TABLE tutors TO tecnicos;
RENAME TABLE tutor_student_assignments TO tecnico_student_assignments;

ALTER TABLE tecnico_student_assignments
    CHANGE COLUMN tutor_user_id tecnico_user_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE courses
    DROP FOREIGN KEY fk_courses_tutor,
    DROP INDEX ix_courses_tutor_status,
    CHANGE COLUMN tutor_user_id tecnico_user_id BIGINT UNSIGNED NULL,
    ADD KEY ix_courses_tecnico_status (tecnico_user_id,status),
    ADD CONSTRAINT fk_courses_tecnico FOREIGN KEY (tecnico_user_id)
        REFERENCES users(id) ON DELETE SET NULL;
