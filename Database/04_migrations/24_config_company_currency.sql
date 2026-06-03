-- Migration 24: Add currency column to config_company
-- Run manually via phpPgAdmin. Replace hernancius with the actual schema name for each tenant.

ALTER TABLE hernancius.config_company ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
