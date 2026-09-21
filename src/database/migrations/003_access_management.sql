-- Importar solo despues de 002 y unicamente en la base propia seleccionada.
-- Registra el catalogo de permisos que protegen la administracion.
INSERT INTO permissions (code, name) VALUES
    ('users.read', 'Consultar usuarios'),
    ('users.manage', 'Administrar usuarios'),
    ('roles.manage', 'Administrar roles y permisos')
ON DUPLICATE KEY UPDATE name = VALUES(name);
