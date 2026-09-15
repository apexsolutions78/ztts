-- M4 Exchange Rates Schema for TripPortal (Zahabia Travel & Tourism)

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code VARCHAR(10) PRIMARY KEY,
  currency_symbol VARCHAR(10) NOT NULL,
  currency_name VARCHAR(50) NOT NULL,
  rate_to_usd DECIMAL(12, 6) NOT NULL DEFAULT 1.000000,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default exchange rates (Base currency: USD)
INSERT INTO exchange_rates (currency_code, currency_symbol, currency_name, rate_to_usd) VALUES
('USD', '$', 'US Dollar', 1.000000),
('AED', 'AED ', 'UAE Dirham', 3.672500),
('EUR', '€', 'Euro', 0.920000),
('GBP', '£', 'British Pound', 0.790000),
('SAR', 'SAR ', 'Saudi Riyal', 3.750000),
('PKR', 'Rs ', 'Pakistani Rupee', 278.500000)
ON DUPLICATE KEY UPDATE rate_to_usd=VALUES(rate_to_usd);

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('0004_exchange_rates');
