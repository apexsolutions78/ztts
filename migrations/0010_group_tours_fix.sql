-- M10 Fix group_tours to match Milestone 1 spec
-- Drop group_members (out of scope for M1), rename columns, add missing fields

-- Drop foreign keys first so we can rename columns
ALTER TABLE group_tours DROP FOREIGN KEY IF EXISTS group_tours_ibfk_1;
ALTER TABLE group_tours DROP FOREIGN KEY IF EXISTS group_tours_ibfk_2;

-- Rename and add columns to match spec
ALTER TABLE group_tours
  CHANGE COLUMN tour_booking_id booking_id INT NOT NULL,
  CHANGE COLUMN group_name title VARCHAR(200) NOT NULL,
  CHANGE COLUMN guide_user_id assigned_guide_user_id INT;

ALTER TABLE group_tours
  ADD COLUMN group_size_expected INT AFTER assigned_guide_user_id,
  ADD COLUMN start_at DATETIME AFTER group_size_expected,
  ADD COLUMN end_at DATETIME AFTER start_at,
  ADD COLUMN welcome_message TEXT AFTER end_at,
  ADD COLUMN emergency_instructions TEXT AFTER welcome_message;

-- Recreate unique index and foreign keys
ALTER TABLE group_tours ADD UNIQUE INDEX idx_booking_id (booking_id);
ALTER TABLE group_tours ADD CONSTRAINT fk_gt_booking FOREIGN KEY (booking_id) REFERENCES tour_bookings(id) ON DELETE CASCADE;
ALTER TABLE group_tours ADD CONSTRAINT fk_gt_guide FOREIGN KEY (assigned_guide_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Drop group_members table (not in M1 scope)
DROP TABLE IF EXISTS group_members;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0010_group_tours_fix');
