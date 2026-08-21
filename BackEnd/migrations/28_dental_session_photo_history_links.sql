-- Migration 28: dental_session_photo_history_links
-- Adds session_id FK to dental_consultation_photos and dental_clinical_history_entries
-- so both tables can be linked to a specific consultation session.
-- PostgreSQL 10.23 multi-tenant. Executes across all active tenant schemas.
-- Run manually via phpPgAdmin. Requires migration 27 to be applied first.
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
        -- 1. Link photos to sessions
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            ALTER TABLE %I.dental_consultation_photos
                ADD COLUMN IF NOT EXISTS session_id INTEGER
                    REFERENCES %I.dental_consultation_sessions(id) ON DELETE SET NULL
        $sql$, s, s);

        -- ----------------------------------------------------------------
        -- 2. Link clinical history entries to sessions
        -- ----------------------------------------------------------------
        EXECUTE format($sql$
            ALTER TABLE %I.dental_clinical_history_entries
                ADD COLUMN IF NOT EXISTS session_id INTEGER
                    REFERENCES %I.dental_consultation_sessions(id) ON DELETE SET NULL
        $sql$, s, s);

    END LOOP;
END $$;
