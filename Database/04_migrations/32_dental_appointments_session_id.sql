-- Migration 32: Add session_id to dental_appointments
-- Links each appointment created from a session back to its source session row.
-- Required for automatic appointment updates when session dates are modified.
-- PostgreSQL 10.23 multi-tenant. Run manually via phpPgAdmin.
-- Date: 2026-06-04

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
        -- Add session_id column if it doesn't exist
        EXECUTE format($sql$
            ALTER TABLE %I.dental_appointments
            ADD COLUMN IF NOT EXISTS session_id INTEGER
        $sql$, s);

        -- Index for fast lookup by session_id
        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_da_session_id
                ON %I.dental_appointments(session_id)
        $sql$, s);

    END LOOP;
END $$;
