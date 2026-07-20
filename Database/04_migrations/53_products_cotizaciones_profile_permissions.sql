-- =============================================================
-- MIGRATION: 53_products_cotizaciones_profile_permissions.sql
-- Products Catalog Transversal — Phase 1 (per tenant schema)
--
-- One-time backfill of {schema_name}.profile_transaction_permissions
-- for the two new transaction codes seeded in migration 51
-- ('products' under module `products`, 'quotes' under module
-- `cotizaciones') so EXISTING admin profiles can see the new nodes
-- immediately, without waiting for a module (re)enable event.
--
-- Grants full CRUD to the two administrative profiles that already
-- receive full access to every other business-transaction code at
-- company-creation time (see BackEnd/controllers/companyController.js
-- seedTenantExtended -> txMatrix.acceso_total / txMatrix.admin_empresa):
--   - acceso_total  (global, super_admin-scoped)
--   - admin_empresa (tenant admin)
--
-- Going forward (new companies, or modules enabled/re-enabled after
-- this migration), BackEnd/controllers/companyModulesController.js's
-- seedDefaultProfilePermissionsForModule is the equivalent live path
-- for admin_empresa (Phase 2 task 2.5 wires it for these two new
-- modules — not part of this migration).
--
-- Idempotent (ON CONFLICT DO NOTHING). Additive only — never touches
-- existing rows for other transaction codes.
-- PostgreSQL 10.23 compatible. Safe to paste once per existing tenant
-- schema via phpPgAdmin (replace {schema_name} with the real schema,
-- e.g. hernancius).
-- =============================================================

DO $$
DECLARE
    v_profile_id INTEGER;
    v_tx_code    VARCHAR;
BEGIN
    FOREACH v_tx_code IN ARRAY ARRAY['products', 'quotes']
    LOOP
        FOR v_profile_id IN
            SELECT id FROM {schema_name}.profiles WHERE code IN ('acceso_total', 'admin_empresa')
        LOOP
            INSERT INTO {schema_name}.profile_transaction_permissions
                (profile_id, transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
            VALUES
                (v_profile_id, v_tx_code, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
            ON CONFLICT (profile_id, transaction_code) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

-- Verify the result:
-- SELECT p.code AS perfil, ptp.transaction_code, ptp.can_view, ptp.can_create, ptp.can_edit, ptp.can_delete
-- FROM {schema_name}.profile_transaction_permissions ptp
-- JOIN {schema_name}.profiles p ON p.id = ptp.profile_id
-- WHERE ptp.transaction_code IN ('products', 'quotes')
-- ORDER BY p.code, ptp.transaction_code;
