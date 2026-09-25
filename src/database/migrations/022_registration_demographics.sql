ALTER TABLE beneficiary_registrations
    ADD COLUMN IF NOT EXISTS sector VARCHAR(150) NULL AFTER address,
    ADD COLUMN IF NOT EXISTS self_identification VARCHAR(80) NULL AFTER gender,
    ADD COLUMN IF NOT EXISTS has_disability VARCHAR(2) NULL AFTER self_identification,
    ADD COLUMN IF NOT EXISTS disability_type VARCHAR(80) NULL AFTER has_disability,
    ADD COLUMN IF NOT EXISTS education VARCHAR(180) NULL AFTER level,
    ADD COLUMN IF NOT EXISTS birth_province VARCHAR(80) NULL AFTER birth_date,
    ADD COLUMN IF NOT EXISTS birth_city VARCHAR(120) NULL AFTER birth_province;
