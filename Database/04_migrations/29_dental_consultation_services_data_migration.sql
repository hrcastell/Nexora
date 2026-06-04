-- Migration 29: dental_consultation_services_data_migration
-- Backfills dental_consultation_services from existing consultations that
-- already have a service_id set. Idempotent — skips rows already migrated.
-- PostgreSQL 10.23 multi-tenant. Executes across all active tenant schemas.
-- Run manually via phpPgAdmin. Requires migration 26 to be applied first.
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
        EXECUTE format($sql$
            INSERT INTO %I.dental_consultation_services (
                tenant_id,
                consultation_id,
                service_id,
                service_name_snapshot,
                unit_price,
                quantity,
                subtotal,
                status
            )
            SELECT
                dc.tenant_id,
                dc.id,
                dc.service_id,
                COALESCE(ds.name, 'Servicio migrado'),
                COALESCE(ds.final_price, dc.total_amount, 0),
                1,
                COALESCE(ds.final_price, dc.total_amount, 0),
                'active'
            FROM %I.dental_consultations dc
            LEFT JOIN %I.dental_services ds ON ds.id = dc.service_id
            WHERE dc.service_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM %I.dental_consultation_services dcs
                  WHERE dcs.consultation_id = dc.id
                    AND dcs.service_id = dc.service_id
              )
        $sql$, s, s, s, s);

    END LOOP;
END $$;
