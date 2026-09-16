-- Increase decimal precision from (10,2) to (14,6) for all monetary amounts
-- This eliminates rounding errors when converting between currencies
-- e.g. 110,000 PKR / 278.5 = 394.973069 USD -> back to PKR = 110,000 (exact)
-- vs old precision: 394.97 USD -> 109,999 PKR (off by 1)

ALTER TABLE payments MODIFY COLUMN amount DECIMAL(14, 6) NOT NULL;
ALTER TABLE payments MODIFY COLUMN base_fare DECIMAL(14, 6) DEFAULT NULL;
ALTER TABLE payments MODIFY COLUMN tax_amount DECIMAL(14, 6) DEFAULT NULL;
ALTER TABLE payments MODIFY COLUMN agency_fee DECIMAL(14, 6) DEFAULT NULL;

ALTER TABLE tour_packages MODIFY COLUMN price DECIMAL(14, 6) NOT NULL DEFAULT 0.000000;

ALTER TABLE tour_bookings MODIFY COLUMN total_amount DECIMAL(14, 6) NOT NULL DEFAULT 0.000000;

ALTER TABLE flight_bookings MODIFY COLUMN total_amount DECIMAL(14, 6) NOT NULL DEFAULT 0.000000;

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0007_currency_precision_upgrade');
