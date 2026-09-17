-- M15 Guide Messaging & Polls

CREATE TABLE IF NOT EXISTS group_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  sender_user_id INT NULL,
  sender_member_id INT NULL,
  sender_name VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'milestone', 'poll', 'share') DEFAULT 'text',
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guide_polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  question VARCHAR(500) NOT NULL,
  options JSON NOT NULL,
  status ENUM('active', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guide_poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  voter_member_id INT NULL,
  voter_name VARCHAR(150) NOT NULL,
  selected_option INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES guide_polls(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO schema_migrations (version) VALUES ('0015_guide_messaging');
