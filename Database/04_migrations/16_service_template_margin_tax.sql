-- =============================================================
-- MIGRATION: 16_service_template_margin_tax.sql
-- Agrega columnas margin_pct e tax_pct a service_templates.
-- Idempotente — seguro re-ejecutar.
--
-- CÓMO EJECUTAR:
--   Reemplazar {schema_name} por el schema del tenant (ej: hernancius)
-- =============================================================

ALTER TABLE {schema_name}.service_templates
    ADD COLUMN IF NOT EXISTS margin_pct  NUMERIC(6,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct     NUMERIC(6,2) DEFAULT 0;

-- Also add to work_order_services for snapshot at time of assignment
ALTER TABLE {schema_name}.work_order_services
    ADD COLUMN IF NOT EXISTS margin_pct  NUMERIC(6,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct     NUMERIC(6,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount    NUMERIC(12,2) DEFAULT 0;
