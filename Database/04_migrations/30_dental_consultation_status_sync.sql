-- Migration 30: dental_consultation_status_sync
-- Syncs administrative_status on dental_consultations based on the most recent
-- non-cancelled charge per consultation.
-- PostgreSQL 10.23 multi-tenant. Must be executed per schema individually.
-- This is a one-time manual sync script — safe to re-run (idempotent by design).
-- Run manually via phpPgAdmin after replacing 'hernancius' with the target schema.
-- Date: 2026-06-02
--
-- NOTE: Unlike other migrations this script is NOT wrapped in a DO loop.
-- Execute it once per tenant schema by replacing 'hernancius' below with
-- the actual schema name before pasting into phpPgAdmin.

UPDATE hernancius.dental_consultations dc
SET administrative_status = CASE
    WHEN ch.status = 'paid'           THEN 'paid'
    WHEN ch.status = 'partially_paid' THEN 'partially_paid'
    WHEN ch.status IS NULL
      OR ch.status = 'cancelled'      THEN 'unpaid'
    ELSE dc.administrative_status
END
FROM (
    SELECT DISTINCT ON (consultation_id)
        consultation_id,
        status
    FROM hernancius.dental_charges
    WHERE status != 'cancelled'
    ORDER BY consultation_id, created_at DESC
) ch
WHERE ch.consultation_id = dc.id
  AND dc.tenant_id = (
      SELECT id
      FROM public.companies
      WHERE schema_name = 'hernancius'
      LIMIT 1
  );
