-- =============================================================
-- MIGRATION: 68_quotes_discount_type_and_tax.sql
-- Cotizaciones: discount can now be a fixed amount OR a percentage
-- (discount_type), and quotes can optionally carry IVA/tax (tax_enabled +
-- adjustable tax_rate, with tax_amount stored like the other computed
-- totals columns).
--
-- Self-contained per-tenant migration (DO $$ ... FOR r IN SELECT
-- schema_name FROM public.companies ... $$), picked up automatically by
-- BackEnd/migrations/runner.js. Idempotent — safe to re-run.
-- PostgreSQL 10.23 compatible.
-- =============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name FROM public.companies
    WHERE schema_name IS NOT NULL AND schema_name != 'public'
  LOOP

    IF to_regclass(format('%I.quotes', r.schema_name)) IS NULL THEN
      RAISE NOTICE 'Skipping %.quotes: table does not exist', r.schema_name;
      CONTINUE;
    END IF;

    EXECUTE format($s$
      ALTER TABLE %I.quotes
        ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20)  NOT NULL DEFAULT 'fixed',
        ADD COLUMN IF NOT EXISTS tax_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tax_rate      NUMERIC(6,3) NOT NULL DEFAULT 19,
        ADD COLUMN IF NOT EXISTS tax_amount    NUMERIC(14,2) NOT NULL DEFAULT 0
    $s$, r.schema_name);

    -- Postgres 10 has no ADD CONSTRAINT IF NOT EXISTS; nested exception
    -- block is the standard idiom used elsewhere in this migration set.
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I.quotes ADD CONSTRAINT chk_quotes_discount_type CHECK (discount_type IN (''fixed'', ''percentage''))',
        r.schema_name
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

  END LOOP;
END $$;
