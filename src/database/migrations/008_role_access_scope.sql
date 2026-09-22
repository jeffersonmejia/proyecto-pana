-- Permisos iniciales y asignaciones de estudiantes a tutores.
-- Aplicar despues de las migraciones 002 a 008, solo en la base pana seleccionada.
CREATE TABLE IF NOT EXISTS tutor_student_assignments (
    tutor_user_id BIGINT UNSIGNED NOT NULL,
    student_person_id BIGINT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tutor_user_id, student_person_id),
    KEY ix_tutor_student_person (student_person_id, tutor_user_id),
    CONSTRAINT fk_tutor_student_tutor FOREIGN KEY (tutor_user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_tutor_student_participant FOREIGN KEY (student_person_id)
        REFERENCES participants (person_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, name, description) VALUES
    ('evaluations.criteria.manage', 'Administrar criterios de evaluación', 'Crear y actualizar criterios de evaluación.')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code='admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN (
    'people.read','people.manage','attendance.read','attendance.manage',
    'activities.read','activities.manage','evaluations.read','evaluations.manage',
    'evaluations.criteria.manage','reports.read','documents.read','documents.manage'
) WHERE r.code='coordinator';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN (
    'people.read','attendance.read','attendance.manage','activities.read','activities.manage',
    'evaluations.read','evaluations.manage','reports.read','documents.read','documents.manage'
) WHERE r.code='tutor';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN (
    'people.read','attendance.read','activities.read','evaluations.read','documents.read'
) WHERE r.code='student';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN (
    'people.read','attendance.read','activities.read','documents.read'
) WHERE r.code='volunteer';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN (
    'people.read','evaluations.read','documents.read'
) WHERE r.code='beneficiary';
