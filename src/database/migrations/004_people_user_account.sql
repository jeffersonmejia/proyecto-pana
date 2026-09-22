-- Vincula una persona con una cuenta de usuario sin duplicar credenciales.
-- Aplicar solo despues de 004_people.sql y con la base pana seleccionada.
ALTER TABLE people
    ADD COLUMN ci VARCHAR(20) NULL,
    ADD COLUMN user_id BIGINT UNSIGNED NULL,
    ADD UNIQUE KEY uq_people_ci (ci),
    ADD UNIQUE KEY uq_people_user (user_id),
    ADD CONSTRAINT fk_people_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_people_user_identity CHECK (
        user_id IS NULL OR (ci IS NOT NULL AND ci <> '' AND email IS NOT NULL AND email <> '')
    );
