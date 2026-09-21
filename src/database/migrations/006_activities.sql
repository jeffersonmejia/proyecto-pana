-- Requerimiento 006: cronograma, asignaciones a participantes y bitácoras.
CREATE TABLE IF NOT EXISTS activities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1500) NULL,
    responsible VARCHAR(120) NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'planned',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_activities_schedule (start_at, status),
    CONSTRAINT fk_activities_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_participants (
    activity_id BIGINT UNSIGNED NOT NULL,
    participant_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (activity_id, participant_id),
    KEY ix_activity_participants_person (participant_id, activity_id),
    CONSTRAINT fk_activity_participants_activity FOREIGN KEY (activity_id)
        REFERENCES activities (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_participants_person FOREIGN KEY (participant_id)
        REFERENCES participants (person_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_id BIGINT UNSIGNED NOT NULL,
    participant_id BIGINT UNSIGNED NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    event_type ENUM('created', 'updated', 'observation') NOT NULL,
    details VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_activity_logs_activity (activity_id, created_at),
    KEY ix_activity_logs_participant (participant_id, created_at),
    CONSTRAINT fk_activity_logs_activity FOREIGN KEY (activity_id)
        REFERENCES activities (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_logs_person FOREIGN KEY (participant_id)
        REFERENCES participants (person_id) ON DELETE SET NULL,
    CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, name) VALUES
    ('activities.read', 'Consultar cronogramas y bitácoras'),
    ('activities.manage', 'Administrar cronogramas y bitácoras')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code IN ('activities.read', 'activities.manage');
