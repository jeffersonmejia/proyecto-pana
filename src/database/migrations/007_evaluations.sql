-- Requerimiento 007: evaluaciones de participantes y satisfacción de beneficiarios.
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(300) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_evaluation_criteria_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    evaluation_type ENUM('participant', 'satisfaction') NOT NULL,
    person_id BIGINT UNSIGNED NOT NULL,
    evaluated_on DATE NOT NULL,
    satisfaction_score TINYINT UNSIGNED NULL,
    observations VARCHAR(1000) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_evaluation_type_date (evaluation_type, evaluated_on),
    KEY ix_evaluation_person_date (person_id, evaluated_on),
    CONSTRAINT fk_evaluation_person FOREIGN KEY (person_id)
        REFERENCES people (id) ON DELETE RESTRICT,
    CONSTRAINT fk_evaluation_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_answers (
    evaluation_id BIGINT UNSIGNED NOT NULL,
    criterion_id BIGINT UNSIGNED NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    note VARCHAR(500) NULL,
    PRIMARY KEY (evaluation_id, criterion_id),
    CONSTRAINT fk_evaluation_answer_record FOREIGN KEY (evaluation_id)
        REFERENCES evaluation_records (id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_answer_criterion FOREIGN KEY (criterion_id)
        REFERENCES evaluation_criteria (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO evaluation_criteria (name, description) VALUES
    ('Responsabilidad', 'Cumplimiento de compromisos y tareas.'),
    ('Participación', 'Involucramiento en las actividades.'),
    ('Cumplimiento', 'Avance respecto a los objetivos acordados.'),
    ('Trabajo en equipo', 'Colaboración con otras personas.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO permissions (code, name) VALUES
    ('evaluations.read', 'Consultar evaluaciones y satisfacción'),
    ('evaluations.manage', 'Administrar evaluaciones y satisfacción')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code IN ('evaluations.read', 'evaluations.manage');
