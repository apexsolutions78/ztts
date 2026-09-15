-- M5 Notifications Schema for TripPortal (Zahabia Travel & Tourism)

CREATE TABLE IF NOT EXISTS notification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  flight_booking_id INT,
  channel ENUM('email', 'whatsapp') NOT NULL,
  recipient VARCHAR(150) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  status ENUM('sent', 'delivered', 'failed') DEFAULT 'delivered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0005_notifications');
