-- 0025: Add is_guest flag to customers table
-- Guest customers are auto-created from public flight requests
-- They must register (set password) before ticket can be issued

ALTER TABLE customers
  ADD COLUMN is_guest TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;
