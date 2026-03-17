-- 001_extensions.sql
-- Enable required PostgreSQL extensions for Soterion AI Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TimescaleDB is optional: used for hypertables in production but not
-- available on all managed Postgres providers (e.g. Render standard plan).
-- The application works without it — tables are created as regular tables.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'timescaledb extension not available — continuing without hypertables';
END $$;
