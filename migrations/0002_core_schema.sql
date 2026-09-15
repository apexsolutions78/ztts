-- M1 Core Domain Schema for TripPortal (Zahabia Travel & Tourism)

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent', 'staff') NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  passport_number VARCHAR(50),
  nationality VARCHAR(80),
  email VARCHAR(150),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS flight_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_ref VARCHAR(20) NOT NULL UNIQUE, -- PNR Code
  customer_id INT NOT NULL,
  airline VARCHAR(100) NOT NULL,
  flight_number VARCHAR(20) NOT NULL,
  origin VARCHAR(10) NOT NULL,
  destination VARCHAR(10) NOT NULL,
  departure_date DATETIME NOT NULL,
  arrival_date DATETIME NOT NULL,
  cabin_class ENUM('Economy', 'Premium Economy', 'Business', 'First') DEFAULT 'Economy',
  ticket_status ENUM('pending', 'confirmed', 'ticketed', 'cancelled') DEFAULT 'confirmed',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tour_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  status ENUM('active', 'draft', 'archived') DEFAULT 'active',
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tour_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_package_id INT NOT NULL,
  customer_id INT NOT NULL,
  travel_date DATE NOT NULL,
  total_travelers INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('confirmed', 'pending', 'cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_package_id) REFERENCES tour_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS portal_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  flight_booking_id INT,
  tour_booking_id INT,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_type ENUM('flight', 'tour') NOT NULL,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'credit_card', 'bank_transfer', 'crypto') DEFAULT 'credit_card',
  payment_status ENUM('paid', 'pending', 'refunded') DEFAULT 'paid',
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0002_core_schema');
