-- 0019: Add workflow stage foundation to flight_bookings
-- Adds workflow stage tracking and staged data collection fields.
-- All existing records are marked as 'legacy' for backward compatibility.

-- 1. Add new columns to flight_bookings
ALTER TABLE flight_bookings
  ADD COLUMN workflow_stage VARCHAR(30) DEFAULT 'legacy' AFTER ticket_status,
  ADD COLUMN trip_type VARCHAR(20) DEFAULT 'one_way' AFTER workflow_stage,
  ADD COLUMN adults INT DEFAULT 1 AFTER trip_type,
  ADD COLUMN children INT DEFAULT 0 AFTER adults,
  ADD COLUMN infants INT DEFAULT 0 AFTER children,
  ADD COLUMN return_date DATETIME NULL AFTER departure_date,
  ADD COLUMN preferred_airline VARCHAR(100) NULL AFTER cabin_class,
  ADD COLUMN flexible_dates BOOLEAN DEFAULT FALSE AFTER preferred_airline,
  ADD COLUMN budget DECIMAL(14, 6) NULL AFTER flexible_dates,
  ADD COLUMN baggage_priority BOOLEAN DEFAULT FALSE AFTER budget,
  ADD COLUMN direct_transit VARCHAR(20) DEFAULT 'any' AFTER baggage_priority,
  ADD COLUMN customer_notes TEXT NULL AFTER direct_transit,
  ADD COLUMN passengers INT NULL AFTER total_amount,
  ADD COLUMN pnr VARCHAR(50) NULL AFTER passengers,
  ADD COLUMN reservation_date DATETIME NULL AFTER pnr,
  ADD COLUMN ticketing_deadline DATETIME NULL AFTER reservation_date,
  ADD COLUMN fare_change_reason TEXT NULL AFTER ticketing_deadline,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 2. Make columns nullable that may not be known at inquiry stage
ALTER TABLE flight_bookings
  MODIFY COLUMN customer_id INT NULL,
  MODIFY COLUMN airline VARCHAR(100) NULL,
  MODIFY COLUMN flight_number VARCHAR(20) NULL,
  MODIFY COLUMN arrival_date DATETIME NULL;

-- 3. Set all existing records to 'legacy' workflow stage
UPDATE flight_bookings SET workflow_stage = 'legacy' WHERE workflow_stage IS NULL OR workflow_stage = 'legacy';

-- 4. Add indexes for workflow filtering and customer portal queries
CREATE INDEX idx_fb_workflow_stage ON flight_bookings(workflow_stage);
CREATE INDEX idx_fb_ticket_status ON flight_bookings(ticket_status);
CREATE INDEX idx_fb_customer_id ON flight_bookings(customer_id);
CREATE INDEX idx_fb_departure_date ON flight_bookings(departure_date);
