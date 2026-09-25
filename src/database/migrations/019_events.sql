CREATE TABLE IF NOT EXISTS events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NULL,
    event_date DATE NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    max_participants INT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY ix_events_date_status (event_date,status),
    CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS event_participants (
    event_id BIGINT UNSIGNED NOT NULL, person_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id,person_id),
    CONSTRAINT fk_event_participants_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_participants_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO permissions (code,name,description) VALUES
('events.read','Consultar eventos','Consultar eventos disponibles.'),
('events.manage','Administrar eventos','Crear y administrar eventos.'),
('events.enroll','Inscribirse en eventos','Inscribirse en eventos disponibles.')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE (r.code IN ('admin','coordinator') AND p.code IN ('events.read','events.manage'))
   OR (r.code IN ('student','beneficiary') AND p.code IN ('events.read','events.enroll'));
