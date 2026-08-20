-- Migration 26: dental_consultation_services
-- Adds follow-up/session tracking columns to dental_consultations,
-- updates the status CHECK constraint, and creates dental_consultation_services.
-- PostgreSQL 10.23 multi-tenant. Executes across all active tenant schemas.
-- Run manually via phpPgAdmin.
-- Date: 2026-06-02

DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN
        SELECT ns.nspname
        FROM pg_namespace ns
        INNER JOIN public.companies c ON c.schema_name = ns.nspname
        WHERE c.is_active = TRUE
    LOOP
        -- ----------------------------------------------------------------
        -- 1. Add columns to dental_consultations (idempotent)
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            ALTER TABLE %I.dental_consultations
                ADD COLUMN IF NOT EXISTS requires_follow_up        BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS requires_multiple_sessions BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS estimated_sessions         INTEGER,
                ADD COLUMN IF NOT EXISTS next_session_date          DATE,
                ADD COLUMN IF NOT EXISTS follow_up_notes            TEXT,
                ADD COLUMN IF NOT EXISTS professional_id            INTEGER,
                ADD COLUMN IF NOT EXISTS created_by                 INTEGER,
                ADD COLUMN IF NOT EXISTS updated_by                 INTEGER
        $sql$, s);

        -- ----------------------------------------------------------------
        -- 2. Replace status CHECK constraint with expanded value list
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            ALTER TABLE %I.dental_consultations
                DROP CONSTRAINT IF EXISTS dental_consultations_status_check
        $sql$, s);

        EXECUTE format($sql$
            ALTER TABLE %I.dental_consultations
                ADD CONSTRAINT dental_consultations_status_check
                CHECK (status IN (
                    'draft', 'created', 'in_progress', 'in_treatment',
                    'completed', 'cancelled', 'no_show', 'voided'
                ))
        $sql$, s);

        -- ----------------------------------------------------------------
        -- 3. Create dental_consultation_services
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.dental_consultation_services (
                id                    SERIAL PRIMARY KEY,
                tenant_id             INTEGER       NOT NULL,
                consultation_id       INTEGER       NOT NULL
                    REFERENCES %I.dental_consultations(id) ON DELETE RESTRICT,
                service_id            INTEGER
                    REFERENCES %I.dental_services(id) ON DELETE SET NULL,
                service_name_snapshot VARCHAR(255)  NOT NULL,
                unit_price            NUMERIC(12,2) NOT NULL DEFAULT 0,
                quantity              INTEGER       NOT NULL DEFAULT 1,
                subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
                tooth_reference       VARCHAR(100),
                clinical_notes        TEXT,
                status                VARCHAR(20)   NOT NULL DEFAULT 'active',
                created_at            TIMESTAMP     DEFAULT NOW(),
                updated_at            TIMESTAMP     DEFAULT NOW(),
                created_by            INTEGER,
                CONSTRAINT chk_dcs_quantity CHECK (quantity > 0),
                CONSTRAINT chk_dcs_status   CHECK (status IN ('active', 'voided'))
            )
        $sql$, s, s, s);

        -- ----------------------------------------------------------------
        -- 4. Indexes for dental_consultation_services
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dcs_consultation_id
                ON %I.dental_consultation_services(consultation_id)
        $sql$, s);

        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dcs_service_id
                ON %I.dental_consultation_services(service_id)
        $sql$, s);

        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dcs_tenant_consultation
                ON %I.dental_consultation_services(tenant_id, consultation_id)
        $sql$, s);

    END LOOP;
END $$;
