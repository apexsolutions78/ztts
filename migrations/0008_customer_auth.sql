-- Add authentication fields to customers table
ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255) AFTER phone;
ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
ALTER TABLE customers ADD UNIQUE INDEX idx_customer_email (email);
