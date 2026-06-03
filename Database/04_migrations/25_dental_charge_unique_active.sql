-- Migration 25: Prevent duplicate active charges per consultation
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
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_charge
             ON %I.dental_charges (consultation_id)
             WHERE status != ''cancelled''',
            s
        );
    END LOOP;
END $$;
