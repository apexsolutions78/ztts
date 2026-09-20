-- 0023: Per-passenger pricing for flight bookings
-- Adds per-category price fields so admin can enter adult/child/infant prices
-- and baggage fee. System auto-calculates total_amount.

ALTER TABLE flight_bookings
  ADD COLUMN price_per_adult DECIMAL(14, 6) DEFAULT 0 AFTER total_amount,
  ADD COLUMN price_per_child DECIMAL(14, 6) DEFAULT 0 AFTER price_per_adult,
  ADD COLUMN price_per_infant DECIMAL(14, 6) DEFAULT 0 AFTER price_per_child,
  ADD COLUMN baggage_fee DECIMAL(14, 6) DEFAULT 0 AFTER price_per_infant;
