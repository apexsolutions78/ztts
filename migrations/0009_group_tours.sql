-- M9 Group Tour Entity: group_tours and group_members tables

CREATE TABLE IF NOT EXISTS group_tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_booking_id INT NOT NULL,
  group_name VARCHAR(200) NOT NULL,
  status ENUM('draft', 'finalized', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  guide_user_id INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_booking_id) REFERENCES tour_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(150),
  passport_number VARCHAR(50),
  nationality VARCHAR(80),
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0009_group_tours');
