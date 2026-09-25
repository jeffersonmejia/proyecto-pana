-- Permite que las evidencias de actividades sean fotos, videos o PDF.
INSERT INTO permissions (code, name, description)
VALUES ('activities.submit_evidence', 'Subir evidencias de actividades', 'Entregar fotos, videos o archivos PDF en actividades asignadas.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
