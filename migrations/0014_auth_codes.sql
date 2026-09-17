-- M14 Auth Codes (Passwordless Authentication)

CREATE TABLE IF NOT EXISTS auth_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose ENUM('login', 'register') NOT NULL DEFAULT 'login',
  target_role VARCHAR(20) DEFAULT NULL,
  extra_data JSON DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_email (email),
  INDEX idx_auth_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Make password_hash nullable (auth is code-based now)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE customers MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Update users.role ENUM to support guide
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'guide', 'agent', 'staff') NOT NULL DEFAULT 'guide';

-- Seed the only pre-existing admin (no password needed)
UPDATE users SET password_hash = NULL WHERE email = 'admin@zahabiatravel.com';

-- Remove the seeded agent (they'll re-register via auth code)
DELETE FROM users WHERE email = 'agent@zahabiatravel.com';

INSERT INTO schema_migrations (version) VALUES ('0014_auth_codes');
