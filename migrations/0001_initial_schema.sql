CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M1 entity tables are intentionally not applied in M0.
-- Add the finalized domain schema in 0002_core_schema.sql.
INSERT INTO schema_migrations (version) VALUES ('0001_initial_schema');
