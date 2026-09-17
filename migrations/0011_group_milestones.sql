-- M11 Group Itinerary Milestones

CREATE TABLE IF NOT EXISTS group_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  status ENUM('pending', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0011_group_milestones');
