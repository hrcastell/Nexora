-- Migration 25: Prevent duplicate active charges per consultation
-- Run manually via phpPgAdmin. Replace hernancius with the actual schema name for each tenant.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_charge
  ON hernancius.dental_charges (consultation_id)
  WHERE status != 'cancelled';
