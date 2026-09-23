CREATE TABLE IF NOT EXISTS beneficiary_registrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    person_id BIGINT UNSIGNED NOT NULL,
    course VARCHAR(80) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(30) NOT NULL,
    address VARCHAR(255) NOT NULL,
    institution VARCHAR(150) NULL,
    career VARCHAR(150) NULL,
    level VARCHAR(100) NULL,
    motivation TEXT NOT NULL,
    skills TEXT NOT NULL,
    volunteer_experience VARCHAR(10) NOT NULL,
    volunteer_details TEXT NULL,
    available_days JSON NOT NULL,
    available_schedules JSON NOT NULL,
    terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_beneficiary_registration_user (user_id),
    UNIQUE KEY uq_beneficiary_registration_person (person_id),
    CONSTRAINT fk_beneficiary_registration_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_beneficiary_registration_person FOREIGN KEY (person_id)
        REFERENCES people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
