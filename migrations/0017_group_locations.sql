-- M17 Group Location Sharing

CREATE TABLE IF NOT EXISTS group_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  shared_by_user_id INT NULL,
  shared_by_member_id INT NULL,
  sender_name VARCHAR(150) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters FLOAT NULL,
  label VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'ended') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO schema_migrations (version) VALUES ('0017_group_locations');
