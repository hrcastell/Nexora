-- Migration 33: Add session_id column, index, and FK constraint on dental_appointments
-- Supersedes migration 32: self-contained and fully idempotent.
-- Safe to run even if migration 32 was already applied.
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
        -- Step 1: Add column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = s
              AND table_name   = 'dental_appointments'
              AND column_name  = 'session_id'
        ) THEN
            EXECUTE format($sql$
                ALTER TABLE %I.dental_appointments
                ADD COLUMN session_id INTEGER
            $sql$, s);
        END IF;

        -- Step 2: Create index if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = s
              AND tablename  = 'dental_appointments'
              AND indexname  = 'idx_da_session_id'
        ) THEN
            EXECUTE format($sql$
                CREATE INDEX idx_da_session_id
                ON %I.dental_appointments(session_id)
            $sql$, s);
        END IF;

        -- Step 3: Add FK constraint only if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint con
            INNER JOIN pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = s
              AND rel.relname = 'dental_appointments'
              AND con.conname = 'dental_appointments_session_id_fkey'
        ) THEN
            EXECUTE format($sql$
                ALTER TABLE %I.dental_appointments
                ADD CONSTRAINT dental_appointments_session_id_fkey
                FOREIGN KEY (session_id)
                REFERENCES %I.dental_consultation_sessions(id)
                ON DELETE SET NULL
            $sql$, s, s);
        END IF;

    END LOOP;
END $$;
