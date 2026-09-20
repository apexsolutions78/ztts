-- 0022: Add payment proof upload to flight_bookings
-- Stores the payment deposit screenshot/snapshot uploaded by the customer.

ALTER TABLE flight_bookings
  ADD COLUMN payment_proof VARCHAR(500) NULL AFTER ticket_number,
  ADD COLUMN payment_proof_uploaded_at DATETIME NULL AFTER payment_proof;
