-- Migration 35: dental_rename_service_to_treatment
-- Phase 1 of Dental Module Overhaul v2.
-- Renames dental_services to dental_treatments (billable catalog).
-- Eliminates the old dental_treatments clinical-catalog entity and its join tables.
-- Renames service_id columns to treatment_id throughout.
-- Renames dental_consultation_services to dental_consultation_treatments.
-- Updates public.module_transactions codes.
--
-- PostgreSQL 10.23 multi-tenant. All steps are idempotent (safe to run twice).
-- Run manually via phpPgAdmin.
-- Date: 2026-06-10

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION A: Tenant-schema DDL changes
-- ─────────────────────────────────────────────────────────────────────────────

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

        -- ── 1. Drop old join tables that link the OLD clinical-catalog dental_treatments ──

        -- dental_consultation_treatments (B.7 from migration 20 — old join: consultation ↔ clinical treatment)
        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_consultation_treatments'
                ) THEN
                    -- Only drop if it still references the OLD dental_treatments (by checking FK to dental_treatments, not dental_services)
                    -- We detect this by checking if a column named 'treatment_id' references dental_treatments (not dental_services)
                    -- The safest approach: drop it only if dental_services still exists (meaning the rename hasn't happened yet)
                    -- and the table has a column service_id or treatment_id pointing at dental_treatments catalog
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = %L
                          AND table_name = 'dental_consultation_treatments'
                          AND column_name = 'service_id'
                    ) THEN
                        -- This is the OLD join table from migration 20 (has service_id col)
                        DROP TABLE IF EXISTS %I.dental_consultation_treatments;
                    END IF;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name, r.schema_name);

        -- dental_service_treatments (B.4 from migration 20 — join: service ↔ clinical treatment)
        EXECUTE format($s$
            DROP TABLE IF EXISTS %I.dental_service_treatments
        $s$, r.schema_name);

        -- ── 2. Drop the OLD dental_treatments clinical catalog table ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                -- Only drop if dental_services still exists (rename not yet done).
                -- If both dental_treatments and dental_services exist, dental_treatments is still the OLD catalog.
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_treatments'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_services'
                ) THEN
                    DROP TABLE IF EXISTS %I.dental_treatments;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name, r.schema_name);

        -- ── 3. Rename dental_services → dental_treatments ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_services'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_treatments'
                ) THEN
                    ALTER TABLE %I.dental_services RENAME TO dental_treatments;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name, r.schema_name);

        -- ── 4. Add new columns to dental_treatments (idempotent via IF NOT EXISTS) ──

        EXECUTE format($s$
            ALTER TABLE %I.dental_treatments
                ADD COLUMN IF NOT EXISTS category                    VARCHAR(100),
                ADD COLUMN IF NOT EXISTS procedure_code              VARCHAR(50),
                ADD COLUMN IF NOT EXISTS requires_follow_up          BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS requires_multiple_sessions  BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS contraindications           TEXT,
                ADD COLUMN IF NOT EXISTS post_treatment_instructions TEXT
        $s$, r.schema_name);

        -- ── 5. Rename service_id → treatment_id on dental_consultations ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L
                      AND table_name = 'dental_consultations'
                      AND column_name = 'service_id'
                ) THEN
                    ALTER TABLE %I.dental_consultations RENAME COLUMN service_id TO treatment_id;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 6. Rename service_id → treatment_id on dental_appointments ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L
                      AND table_name = 'dental_appointments'
                      AND column_name = 'service_id'
                ) THEN
                    ALTER TABLE %I.dental_appointments RENAME COLUMN service_id TO treatment_id;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 7. Rename service_id → treatment_id on dental_charges ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L
                      AND table_name = 'dental_charges'
                      AND column_name = 'service_id'
                ) THEN
                    ALTER TABLE %I.dental_charges RENAME COLUMN service_id TO treatment_id;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 8. Rename dental_consultation_services → dental_consultation_treatments ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_consultation_services'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %L AND table_name = 'dental_consultation_treatments'
                ) THEN
                    ALTER TABLE %I.dental_consultation_services RENAME TO dental_consultation_treatments;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name, r.schema_name);

        -- ── 9. Rename service_id → treatment_id on dental_consultation_treatments ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L
                      AND table_name = 'dental_consultation_treatments'
                      AND column_name = 'service_id'
                ) THEN
                    ALTER TABLE %I.dental_consultation_treatments RENAME COLUMN service_id TO treatment_id;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 10. Rename service_name_snapshot → treatment_name_snapshot on dental_consultation_treatments ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %L
                      AND table_name = 'dental_consultation_treatments'
                      AND column_name = 'service_name_snapshot'
                ) THEN
                    ALTER TABLE %I.dental_consultation_treatments RENAME COLUMN service_name_snapshot TO treatment_name_snapshot;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 11. Update index names where possible (drop old, recreate) ──

        EXECUTE format($s$
            DO $inner$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = %L AND indexname = 'idx_dcs_service_id') THEN
                    DROP INDEX IF EXISTS %I.idx_dcs_service_id;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = %L AND indexname = 'idx_dcs_consultation_id') THEN
                    -- Keep this index name as-is (still valid, consultation_id column unchanged)
                    NULL;
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name, r.schema_name);

        EXECUTE format($s$
            CREATE INDEX IF NOT EXISTS idx_dct_treatment_id
                ON %I.dental_consultation_treatments(treatment_id)
        $s$, r.schema_name);

    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION B: Public schema — update module_transactions codes
-- ─────────────────────────────────────────────────────────────────────────────

-- Rename dental_services transaction to dental_treatments
UPDATE public.module_transactions
SET code  = REPLACE(code,  'service', 'treatment'),
    name  = REPLACE(name,  'Servicios', 'Tratamientos'),
    route = REPLACE(route, '/services', '/treatments')
WHERE module_code = 'dental_core'
  AND code LIKE '%service%';

-- Also handle the column via module_id join (for older schemas where module_code column may not exist)
UPDATE public.module_transactions mt
SET code  = REPLACE(mt.code,  'service', 'treatment'),
    name  = REPLACE(mt.name,  'Servicios', 'Tratamientos'),
    route = REPLACE(mt.route, '/services', '/treatments')
FROM public.module_catalog mc
WHERE mt.module_id = mc.id
  AND mc.code = 'dental_core'
  AND mt.code LIKE '%service%';
