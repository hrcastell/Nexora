-- Migration 24: Add currency column to config_company
-- Applies to all active tenant schemas. Run manually via phpPgAdmin.

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
        EXECUTE format(
            'ALTER TABLE %I.config_company ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT ''USD''',
            s
        );
    END LOOP;
END $$;
