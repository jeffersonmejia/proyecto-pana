-- Requerimiento 005: asistencia diaria de participantes y auditoría de correcciones.
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    participant_id BIGINT UNSIGNED NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL DEFAULT 'present',
    check_in TIME NULL,
    check_out TIME NULL,
    note VARCHAR(500) NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_participant_date (participant_id, attendance_date),
    KEY ix_attendance_date_status (attendance_date, status),
    CONSTRAINT fk_attendance_participant FOREIGN KEY (participant_id)
        REFERENCES participants (person_id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_created_by FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_attendance_updated_by FOREIGN KEY (updated_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attendance_id BIGINT UNSIGNED NOT NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    event_type ENUM('created', 'corrected') NOT NULL,
    old_values JSON NULL,
    new_values JSON NOT NULL,
    correction_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_attendance_history_record (attendance_id, created_at),
    CONSTRAINT fk_attendance_history_record FOREIGN KEY (attendance_id)
        REFERENCES attendance_records (id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_history_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, name) VALUES
    ('attendance.read', 'Consultar asistencia y horas'),
    ('attendance.manage', 'Administrar asistencia y horas')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code IN ('attendance.read', 'attendance.manage');
