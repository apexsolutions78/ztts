-- M12 Tour Date Ranges (Confirmed Groups)

CREATE TABLE IF NOT EXISTS tour_date_ranges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_package_id INT NOT NULL,
  label VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_capacity INT DEFAULT NULL,
  current_bookings INT DEFAULT 0,
  status ENUM('open', 'full', 'cancelled') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_package_id) REFERENCES tour_packages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add date range reference to tour bookings
ALTER TABLE tour_bookings ADD COLUMN tour_date_range_id INT NULL AFTER tour_package_id;
ALTER TABLE tour_bookings ADD CONSTRAINT fk_tb_daterange FOREIGN KEY (tour_date_range_id) REFERENCES tour_date_ranges(id) ON DELETE SET NULL;

INSERT INTO schema_migrations (version) VALUES ('0012_tour_date_ranges');
