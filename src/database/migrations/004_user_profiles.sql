-- Extiende las cuentas y perfiles definidos en PANA.
-- Aplicar despues de 004_people_user_account.sql en la base pana.
ALTER TABLE users
    ADD COLUMN ci VARCHAR(20) NULL,
    ADD COLUMN first_name VARCHAR(100) NULL,
    ADD COLUMN last_name VARCHAR(100) NULL,
    ADD COLUMN phone VARCHAR(40) NULL,
    ADD COLUMN last_login_at DATETIME NULL,
    ADD UNIQUE KEY uq_users_ci (ci);

UPDATE users u
INNER JOIN people p ON p.user_id = u.id
SET u.ci = p.ci, u.first_name = p.first_name, u.last_name = p.last_name,
    u.phone = p.phone;

ALTER TABLE users
    MODIFY ci VARCHAR(20) NOT NULL,
    MODIFY first_name VARCHAR(100) NOT NULL,
    MODIFY last_name VARCHAR(100) NOT NULL;

ALTER TABLE roles
    ADD COLUMN description VARCHAR(255) NULL,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE permissions ADD COLUMN description VARCHAR(255) NULL;

ALTER TABLE users ADD COLUMN role_id BIGINT UNSIGNED NULL;
UPDATE users u
INNER JOIN (SELECT user_id,MIN(role_id) role_id FROM user_roles GROUP BY user_id) ur
    ON ur.user_id=u.id
SET u.role_id=ur.role_id;
ALTER TABLE users
    MODIFY role_id BIGINT UNSIGNED NOT NULL,
    ADD KEY ix_users_role (role_id),
    ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT;

INSERT INTO roles (code, name, description) VALUES
    ('admin', 'Informatico', 'Administracion total del sistema.'),
    ('coordinator', 'Coordinador', 'Coordinacion institucional.'),
    ('tutor', 'Tutor', 'Acompanamiento y seguimiento de estudiantes.'),
    ('student', 'Estudiante', 'Participacion en procesos formativos.'),
    ('volunteer', 'Voluntario', 'Colaboracion en actividades del proyecto.'),
    ('beneficiary', 'Beneficiario', 'Acceso como beneficiario registrado.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

CREATE TABLE coordinators (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    position VARCHAR(100) NOT NULL,
    institutional_phone VARCHAR(20) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_coordinators_user (user_id),
    CONSTRAINT fk_coordinators_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tutors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    institution VARCHAR(150) NOT NULL,
    position VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_tutors_user (user_id),
    CONSTRAINT fk_tutors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE universities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_universities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE careers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    university_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_careers_university_name (university_id, name),
    CONSTRAINT fk_careers_university FOREIGN KEY (university_id)
        REFERENCES universities (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    university_id BIGINT UNSIGNED NOT NULL,
    career_id BIGINT UNSIGNED NOT NULL,
    process_type VARCHAR(50) NOT NULL,
    hours_required DECIMAL(8,2) NOT NULL,
    hours_completed DECIMAL(8,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_students_user (user_id),
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_students_university FOREIGN KEY (university_id) REFERENCES universities (id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_career FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE volunteers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    birth_date DATE NULL,
    address VARCHAR(255) NULL,
    entry_date DATE NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_volunteers_user (user_id),
    CONSTRAINT fk_volunteers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE beneficiaries
    DROP PRIMARY KEY,
    ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
    ADD UNIQUE KEY uq_beneficiaries_person (person_id),
    ADD COLUMN address VARCHAR(255) NULL,
    ADD COLUMN birth_date DATE NULL,
    ADD COLUMN observations TEXT NULL,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE participants ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;
