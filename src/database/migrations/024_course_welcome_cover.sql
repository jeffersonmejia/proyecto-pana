ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS cover_stored_name VARCHAR(100) NULL AFTER qr_link,
    ADD COLUMN IF NOT EXISTS cover_original_name VARCHAR(255) NULL AFTER cover_stored_name,
    ADD COLUMN IF NOT EXISTS cover_mime_type VARCHAR(100) NULL AFTER cover_original_name;
