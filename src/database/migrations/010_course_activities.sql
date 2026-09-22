-- Vincula cada actividad creada desde un curso a su curso de origen.
CREATE TABLE IF NOT EXISTS course_activities (
    course_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id,activity_id),
    KEY ix_course_activities_activity (activity_id),
    CONSTRAINT fk_course_activities_course FOREIGN KEY (course_id)
        REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_activities_activity FOREIGN KEY (activity_id)
        REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO course_activities (course_id,activity_id)
SELECT DISTINCT cp.course_id,ap.activity_id FROM course_participants cp
JOIN activity_participants ap ON ap.participant_id=cp.person_id
WHERE cp.status='active';

INSERT INTO permissions (code,name,description) VALUES
    ('activities.submit_evidence','Subir evidencia PDF de actividades','Entregar archivos PDF en actividades asignadas.')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);
INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='activities.submit_evidence'
WHERE r.code IN ('student','beneficiary');
