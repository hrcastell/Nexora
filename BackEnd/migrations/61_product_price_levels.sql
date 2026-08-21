-- =============================================================
-- MIGRATION: 61_product_price_levels.sql
-- Adds configurable, margin-based reference prices per product.
--
-- Per tenant schema:
--   1. product_price_levels — company-wide price levels shared across all
--      products (e.g. "Público", "Mayorista"), each with a default margin %.
--   2. product_prices — per-product margin % for a given level. Seeded from
--      the level's default_margin_pct the first time a product is opened;
--      editable per product from there. The actual price is never stored —
--      it's always computed as products.average_cost * (1 + margin_pct/100)
--      at read time, so it stays in sync when the cost changes.
--
-- Idempotent (guards every step); safe to re-paste via phpPgAdmin.
-- PostgreSQL 10.23 compatible.
-- =============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name FROM public.companies
    WHERE schema_name IS NOT NULL AND schema_name != 'public'
  LOOP

    IF to_regclass(format('%I.products', r.schema_name)) IS NULL THEN
      RAISE NOTICE 'Skipping %.product_price_levels: products table does not exist', r.schema_name;
      CONTINUE;
    END IF;

    -- 1. Shared price levels
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.product_price_levels (
        id                  SERIAL PRIMARY KEY,
        name                VARCHAR(100)  NOT NULL,
        normalized_name     VARCHAR(120)  NOT NULL,
        default_margin_pct  NUMERIC(6,2)  NOT NULL DEFAULT 0,
        display_order       INTEGER       NOT NULL DEFAULT 0,
        status              VARCHAR(30)   NOT NULL DEFAULT 'active',
        created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_product_price_levels_name UNIQUE (normalized_name)
      )
    $s$, r.schema_name);

    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_product_price_levels_status ON %I.product_price_levels(status)
    $s$, r.schema_name);

    -- 2. Per-product margin for each level
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.product_prices (
        id              SERIAL PRIMARY KEY,
        product_id      INTEGER       NOT NULL REFERENCES %I.products(id) ON DELETE CASCADE,
        price_level_id  INTEGER       NOT NULL REFERENCES %I.product_price_levels(id) ON DELETE RESTRICT,
        margin_pct      NUMERIC(6,2)  NOT NULL DEFAULT 0,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_product_prices_product_level UNIQUE (product_id, price_level_id)
      )
    $s$, r.schema_name, r.schema_name, r.schema_name);

    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON %I.product_prices(product_id)
    $s$, r.schema_name);

  END LOOP;
END $$;
