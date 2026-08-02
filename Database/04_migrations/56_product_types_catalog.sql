-- =============================================================
-- MIGRATION: 56_product_types_catalog.sql
-- Converts products.product_type from a hardcoded free-text VARCHAR
-- (consumable/part/tool/other) into a proper catalog table, matching
-- the existing vehicle_* catalog pattern (id/name/normalized_name/status)
-- used by widgets_garage_catalog_combobox.vue.
--
-- Per tenant schema:
--   1. Create product_types (same shape as vehicle_types/vehicle_brands).
--   2. Seed the 4 existing hardcoded values as real rows.
--   3. Add products.product_type_id FK (ON DELETE RESTRICT — deleting a
--      type in use must be blocked, not silently null out products).
--   4. Backfill product_type_id from the old product_type code, then
--      drop the old column.
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
      RAISE NOTICE 'Skipping %.product_types: products table does not exist', r.schema_name;
      CONTINUE;
    END IF;

    -- 1. Catalog table
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.product_types (
        id              SERIAL PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        normalized_name VARCHAR(120) NOT NULL UNIQUE,
        status          VARCHAR(30)  DEFAULT 'active',
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    $s$, r.schema_name);

    -- 2. Seed the 4 existing hardcoded values
    EXECUTE format($s$
      INSERT INTO %I.product_types (name, normalized_name) VALUES
        ('Consumible', 'consumible'),
        ('Repuesto', 'repuesto'),
        ('Herramienta', 'herramienta'),
        ('Otro', 'otro')
      ON CONFLICT (normalized_name) DO NOTHING
    $s$, r.schema_name);

    -- 3. FK column on products
    EXECUTE format($s$
      ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS product_type_id INTEGER
        REFERENCES %I.product_types(id) ON DELETE RESTRICT
    $s$, r.schema_name, r.schema_name);

    -- 4. Backfill from the old free-text column, then drop it. Guarded so
    -- re-running this migration after the column is already gone is a no-op.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = r.schema_name AND table_name = 'products' AND column_name = 'product_type'
    ) THEN
      EXECUTE format($s$
        UPDATE %I.products p SET product_type_id = pt.id
        FROM %I.product_types pt
        WHERE p.product_type_id IS NULL
          AND pt.normalized_name = CASE lower(trim(p.product_type))
            WHEN 'consumable' THEN 'consumible'
            WHEN 'part'       THEN 'repuesto'
            WHEN 'tool'       THEN 'herramienta'
            ELSE 'otro'
          END
      $s$, r.schema_name, r.schema_name);

      EXECUTE format('ALTER TABLE %I.products DROP COLUMN product_type', r.schema_name);
    END IF;

  END LOOP;
END $$;
