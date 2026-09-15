-- M2 & M3 Enterprise Features Schema for TripPortal (Zahabia Travel & Tourism)

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add invoice breakdown columns to payments table
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(30) UNIQUE AFTER id,
  ADD COLUMN IF NOT EXISTS base_fare DECIMAL(10,2) DEFAULT 0.00 AFTER amount,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00 AFTER base_fare,
  ADD COLUMN IF NOT EXISTS agency_fee DECIMAL(10,2) DEFAULT 0.00 AFTER tax_amount;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0003_enterprise_features');
