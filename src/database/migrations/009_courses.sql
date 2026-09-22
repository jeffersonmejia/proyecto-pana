-- Req. 011: cursos, responsables y acceso de participantes.
CREATE TABLE IF NOT EXISTS courses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    max_participants INT UNSIGNED NULL,
    tutor_user_id BIGINT UNSIGNED NULL,
    coordinator_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_courses_name (name),
    KEY ix_courses_tutor_status (tutor_user_id,status),
    KEY ix_courses_coordinator_status (coordinator_user_id,status),
    CONSTRAINT fk_courses_tutor FOREIGN KEY (tutor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_courses_coordinator FOREIGN KEY (coordinator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_participants (
    course_id BIGINT UNSIGNED NOT NULL,
    person_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id,person_id), KEY ix_course_participants_person (person_id,status),
    CONSTRAINT fk_course_participants_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_participants_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code,name,description) VALUES
('courses.read','Consultar cursos','Consultar cursos autorizados por rol.'),
('courses.manage','Administrar cursos','Crear cursos y administrar los de su responsabilidad.'),
('courses.manage.all','Administrar todos los cursos','Administrar todos los cursos del sistema.')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('courses.read','courses.manage','courses.manage.all') WHERE r.code='admin';
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('courses.read','courses.manage') WHERE r.code='coordinator';
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='courses.read' WHERE r.code IN ('tutor','student','beneficiary');
