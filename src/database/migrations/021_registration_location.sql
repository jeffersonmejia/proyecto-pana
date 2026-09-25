ALTER TABLE beneficiary_registrations
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL AFTER address,
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL AFTER latitude;
