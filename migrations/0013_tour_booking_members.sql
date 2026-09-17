-- M13 Tour Booking Members (Individual Traveler Details)

CREATE TABLE IF NOT EXISTS tour_booking_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_booking_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  passport_number VARCHAR(50),
  nationality VARCHAR(80),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_booking_id) REFERENCES tour_bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add member tracking columns to tour_bookings
ALTER TABLE tour_bookings ADD COLUMN members_added INT DEFAULT 0 AFTER total_travelers;
ALTER TABLE tour_bookings ADD COLUMN members_required INT DEFAULT 1 AFTER members_added;

INSERT INTO schema_migrations (version) VALUES ('0013_tour_booking_members');
