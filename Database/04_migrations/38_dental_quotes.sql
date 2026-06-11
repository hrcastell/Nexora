-- 38_dental_quotes.sql
-- Creates dental_quotes and dental_quote_items tables in every existing tenant schema.
-- Safe to run multiple times (CREATE ... IF NOT EXISTS).

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name
    FROM public.companies
    WHERE schema_name IS NOT NULL
      AND schema_name != 'public'
  LOOP

    IF to_regclass(format('%I.customers', r.schema_name)) IS NULL
       OR to_regclass(format('%I.dental_consultations', r.schema_name)) IS NULL
       OR to_regclass(format('%I.dental_treatments', r.schema_name)) IS NULL THEN
      RAISE NOTICE 'Skipping %.dental_quotes: required dental base tables do not exist', r.schema_name;
      CONTINUE;
    END IF;

    -- Sequence for quote number generation
    EXECUTE format($s$
      CREATE SEQUENCE IF NOT EXISTS %I.dental_quote_number_seq START 1
    $s$, r.schema_name);

    -- dental_quotes
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.dental_quotes (
          id                  SERIAL PRIMARY KEY,
          tenant_id           VARCHAR(255) NOT NULL,
          customer_id         INTEGER      NOT NULL REFERENCES %I.customers(id) ON DELETE RESTRICT,
          quote_number        VARCHAR(20)  NOT NULL,
          quote_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
          valid_until         DATE,
          status              VARCHAR(30)  NOT NULL DEFAULT 'draft'
              CONSTRAINT chk_dental_quote_status CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
          total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
          discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
          final_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
          notes               TEXT,
          conditions_text     TEXT,
          professional_id     INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
          accepted_at         TIMESTAMPTZ,
          accepted_by_name    VARCHAR(255),
          acceptance_notes    TEXT,
          rejected_at         TIMESTAMPTZ,
          rejection_reason    TEXT,
          consultation_id     INTEGER REFERENCES %I.dental_consultations(id) ON DELETE SET NULL,
          converted_at        TIMESTAMPTZ,
          created_at          TIMESTAMPTZ DEFAULT NOW(),
          updated_at          TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(tenant_id, quote_number)
      )
    $s$, r.schema_name, r.schema_name, r.schema_name);

    -- dental_quote_items
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.dental_quote_items (
          id                        SERIAL PRIMARY KEY,
          tenant_id                 VARCHAR(255) NOT NULL,
          quote_id                  INTEGER      NOT NULL REFERENCES %I.dental_quotes(id) ON DELETE CASCADE,
          treatment_id              INTEGER REFERENCES %I.dental_treatments(id) ON DELETE SET NULL,
          treatment_name_snapshot   VARCHAR(255) NOT NULL,
          description               TEXT,
          tooth_reference           VARCHAR(50),
          unit_price                NUMERIC(12,2) NOT NULL DEFAULT 0,
          quantity                  INTEGER       NOT NULL DEFAULT 1,
          subtotal                  NUMERIC(12,2) NOT NULL DEFAULT 0,
          sort_order                INTEGER       NOT NULL DEFAULT 0
      )
    $s$, r.schema_name, r.schema_name, r.schema_name);

    -- Indexes
    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_dental_quotes_tenant_customer
          ON %I.dental_quotes(tenant_id, customer_id)
    $s$, r.schema_name);

    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_dental_quote_items_tenant_quote
          ON %I.dental_quote_items(tenant_id, quote_id)
    $s$, r.schema_name);

  END LOOP;
END $$;
