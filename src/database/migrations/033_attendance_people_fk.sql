ALTER TABLE attendance_records
    DROP FOREIGN KEY fk_attendance_participant;

ALTER TABLE attendance_records
    ADD CONSTRAINT fk_attendance_participant
        FOREIGN KEY (participant_id) REFERENCES people (id);
