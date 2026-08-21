-- Migration 27: dental_consultation_sessions
-- Creates the session tracking table for multi-session dental consultations.
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
        -- 1. Create dental_consultation_sessions
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.dental_consultation_sessions (
                id              SERIAL PRIMARY KEY,
                tenant_id       INTEGER      NOT NULL,
                consultation_id INTEGER      NOT NULL
                    REFERENCES %I.dental_consultations(id) ON DELETE RESTRICT,
                session_number  INTEGER      NOT NULL,
                session_date    TIMESTAMP    NOT NULL DEFAULT NOW(),
                professional_id INTEGER,
                status          VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
                notes           TEXT,
                evolution       TEXT,
                next_session_date DATE,
                created_at      TIMESTAMP    DEFAULT NOW(),
                updated_at      TIMESTAMP    DEFAULT NOW(),
                CONSTRAINT chk_dcse_status CHECK (status IN (
                    'scheduled', 'in_progress', 'completed', 'cancelled'
                )),
                CONSTRAINT uq_dcse_tenant_consultation_session
                    UNIQUE (tenant_id, consultation_id, session_number)
            )
        $sql$, s, s);

        -- ----------------------------------------------------------------
        -- 2. Indexes
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dcse_consultation_id
                ON %I.dental_consultation_sessions(consultation_id)
        $sql$, s);

        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dcse_tenant_id
                ON %I.dental_consultation_sessions(tenant_id)
        $sql$, s);

    END LOOP;
END $$;
