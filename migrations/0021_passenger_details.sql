-- 0021: Add passenger_details JSON column to flight_bookings
-- Stores individual traveler details (name, passport, nationality, DOB, gender)
-- needed for e-ticket issuance after customer approves the flight.

ALTER TABLE flight_bookings
  ADD COLUMN passenger_details JSON NULL AFTER passengers;
