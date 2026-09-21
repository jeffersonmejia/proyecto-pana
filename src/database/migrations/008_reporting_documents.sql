-- Requerimiento 008: indicadores, reportes y documentos asociados.
CREATE TABLE IF NOT EXISTS documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entity_type ENUM('person', 'activity', 'evaluation') NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(80) NOT NULL,
    mime_type VARCHAR(80) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_documents_stored_name (stored_name),
    KEY ix_documents_entity (entity_type, entity_id, created_at),
    CONSTRAINT fk_documents_uploader FOREIGN KEY (uploaded_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, name) VALUES
    ('reports.read', 'Consultar indicadores y reportes'),
    ('documents.read', 'Consultar documentos'),
    ('documents.manage', 'Administrar documentos')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code IN ('reports.read', 'documents.read', 'documents.manage');
