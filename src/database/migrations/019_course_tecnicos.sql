-- Permite asignar uno o varios técnicos a cada curso.
CREATE TABLE IF NOT EXISTS course_tecnicos (
    course_id BIGINT UNSIGNED NOT NULL,
    tecnico_user_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (course_id, tecnico_user_id),
    KEY ix_course_tecnicos_tecnico (tecnico_user_id),
    CONSTRAINT fk_course_tecnicos_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_tecnicos_tecnico FOREIGN KEY (tecnico_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO course_tecnicos (course_id, tecnico_user_id)
SELECT id, tecnico_user_id FROM courses WHERE tecnico_user_id IS NOT NULL;
