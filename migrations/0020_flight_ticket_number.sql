-- 0020: Add ticket_number column for actual e-ticket number from Amadeus/GDS
-- Separates PNR (reservation reference) from ticket_number (actual e-ticket number).

ALTER TABLE flight_bookings
  ADD COLUMN ticket_number VARCHAR(50) NULL AFTER pnr,
  ADD INDEX idx_fb_ticket_number (ticket_number);
