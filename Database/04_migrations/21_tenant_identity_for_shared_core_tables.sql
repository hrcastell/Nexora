-- =============================================================
-- MIGRATION: 21_tenant_identity_for_shared_core_tables.sql
-- Adds tenant_id to shared tenant-schema tables used by multiple cores.
--
-- RATIONALE:
-- - Business cores are autonomous, but customers is a dominant shared table
--   when a company enables more than one core.
-- - Dental controllers and dental domain tables scope records by tenant_id.
-- - Existing tenant templates used schema isolation but omitted tenant_id on
--   shared tables, causing architecture drift and runtime 500 errors.
--
-- HOW TO RUN:
-- Replace {schema_name} with the tenant schema and {company_id} with the
-- public.companies.id for that schema, then execute once per tenant.
-- =============================================================

ALTER TABLE {schema_name}.customers
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

UPDATE {schema_name}.customers
SET tenant_id = {company_id}
WHERE tenant_id IS NULL;

ALTER TABLE {schema_name}.customers
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tenant
    ON {schema_name}.customers(tenant_id);

ALTER TABLE {schema_name}.employees
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

UPDATE {schema_name}.employees
SET tenant_id = {company_id}
WHERE tenant_id IS NULL;

ALTER TABLE {schema_name}.employees
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_tenant
    ON {schema_name}.employees(tenant_id);

ALTER TABLE {schema_name}.dental_patient_profiles
    ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS notes TEXT;
