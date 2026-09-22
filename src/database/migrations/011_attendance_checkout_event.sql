ALTER TABLE attendance_history
    MODIFY event_type ENUM('created', 'corrected', 'checked_out') NOT NULL;
