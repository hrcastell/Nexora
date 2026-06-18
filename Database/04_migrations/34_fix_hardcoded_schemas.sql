-- Migration 34: Fix hardcoded schema references in prior migrations
-- ─────────────────────────────────────────────────────────────────
-- What:  Migration 23 (dental_medical_history) only created the table in the
--        hernancius schema because the DDL used a literal schema name instead
--        of a tenant loop.  Migration 30 (dental_consultation_status_sync) had
--        the same issue: it was an UPDATE-only script that referred to
--        hernancius literally, so the status sync never ran for any other tenant.
--
-- Fix:   This migration iterates every tenant schema registered in
--        public.companies and:
--          1. Creates dental_medical_history if it does not yet exist.
--          2. Ensures the index exists.
--          3. Re-runs the status-sync UPDATE (idempotent — it only changes rows
--             whose administrative_status does not already reflect their charge
--             status, or is NULL).
--
-- Safety: Every statement uses IF NOT EXISTS / IF EXISTS or is naturally
--        idempotent.  Safe to re-run via phpPgAdmin.
-- Date:  2026-06-10
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schema_name
        FROM public.companies
        WHERE schema_name IS NOT NULL
          AND schema_name != 'public'
    LOOP

        -- ----------------------------------------------------------------
        -- 1. Create dental_medical_history if missing (fix for migration 23)
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.dental_medical_history (
                id                   SERIAL PRIMARY KEY,
                tenant_id            INTEGER NOT NULL,
                customer_id          INTEGER NOT NULL,
                entry_date           DATE NOT NULL DEFAULT CURRENT_DATE,
                blood_type           VARCHAR(10),
                medical_background   TEXT,
                allergies            TEXT,
                current_medications  TEXT,
                chronic_conditions   TEXT,
                dental_observations  TEXT,
                notes                TEXT,
                created_by           INTEGER,
                created_at           TIMESTAMP DEFAULT NOW()
            )
        $sql$, r.schema_name);

        -- Index
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = r.schema_name
              AND tablename  = 'dental_medical_history'
              AND indexname  = 'idx_dental_med_history_tenant_customer'
        ) THEN
            EXECUTE format($sql$
                CREATE INDEX idx_dental_med_history_tenant_customer
                    ON %I.dental_medical_history(tenant_id, customer_id)
            $sql$, r.schema_name);
        END IF;

        -- ----------------------------------------------------------------
        -- 2. Sync administrative_status (fix for migration 30)
        --    Updates rows whose charge status differs from the stored value.
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            UPDATE %I.dental_consultations dc
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
                FROM %I.dental_charges
                WHERE status != 'cancelled'
                ORDER BY consultation_id, created_at DESC
            ) ch
            WHERE ch.consultation_id = dc.id
              AND dc.tenant_id = (
                  SELECT id
                  FROM public.companies
                  WHERE schema_name = %L
                  LIMIT 1
              )
        $sql$, r.schema_name, r.schema_name, r.schema_name);

    END LOOP;
END $$;
