-- M10 Payment Upgrade: Split Payments, Multiple Methods, Reference Tracking

-- Add new columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) AFTER payment_method,
  ADD COLUMN IF NOT EXISTS notes TEXT AFTER payment_reference,
  ADD COLUMN IF NOT EXISTS recorded_by INT AFTER notes;

-- Expand payment_method enum to include cheque
ALTER TABLE payments
  MODIFY COLUMN payment_method ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'cheque', 'online', 'other') DEFAULT 'cash';

-- Expand payment_status enum to include partial
ALTER TABLE payments
  MODIFY COLUMN payment_status ENUM('paid', 'pending', 'partial', 'refunded', 'cancelled') DEFAULT 'paid';

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0006_payments_upgrade');
