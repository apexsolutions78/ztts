-- 0018: Add refund tracking columns to payments table
ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(12,2) DEFAULT NULL AFTER amount;
ALTER TABLE payments ADD COLUMN refund_reason TEXT DEFAULT NULL AFTER notes;
ALTER TABLE payments ADD COLUMN refunded_at DATETIME DEFAULT NULL AFTER payment_status;
