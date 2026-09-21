-- Requerimiento 004: datos compartidos y roles independientes por persona.
-- Aplicar solo a la base pana, después de los esquemas 002 y 003.
CREATE TABLE IF NOT EXISTS people (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NULL,
    phone VARCHAR(40) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_people_name (last_name, first_name),
    KEY ix_people_status (status),
    KEY ix_people_email (email),
    KEY ix_people_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS participants (
    person_id BIGINT UNSIGNED NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (person_id),
    CONSTRAINT fk_participants_person FOREIGN KEY (person_id)
        REFERENCES people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beneficiaries (
    person_id BIGINT UNSIGNED NOT NULL,
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (person_id),
    CONSTRAINT fk_beneficiaries_person FOREIGN KEY (person_id)
        REFERENCES people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    person_id BIGINT UNSIGNED NOT NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    event_type ENUM('created', 'updated', 'status_changed', 'note') NOT NULL,
    details VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_person_history_person (person_id, created_at),
    CONSTRAINT fk_person_history_person FOREIGN KEY (person_id)
        REFERENCES people (id) ON DELETE CASCADE,
    CONSTRAINT fk_person_history_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, name) VALUES
    ('people.read', 'Consultar participantes y beneficiarios'),
    ('people.manage', 'Administrar participantes y beneficiarios')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code IN ('people.read', 'people.manage');
