-- 37_dental_consultation_attachments.sql
-- Creates dental_consultation_attachments table in every existing tenant schema.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name
    FROM public.companies
    WHERE schema_name IS NOT NULL
      AND schema_name != 'public'
  LOOP
    IF to_regclass(format('%I.dental_consultations', r.schema_name)) IS NULL THEN
      RAISE NOTICE 'Skipping %.dental_consultation_attachments: dental_consultations table does not exist', r.schema_name;
      CONTINUE;
    END IF;

    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.dental_consultation_attachments (
          id               SERIAL PRIMARY KEY,
          tenant_id        VARCHAR(255) NOT NULL,
          consultation_id  INTEGER      NOT NULL REFERENCES %I.dental_consultations(id) ON DELETE CASCADE,
          file_url         TEXT         NOT NULL,
          file_name        VARCHAR(255) NOT NULL,
          file_type        VARCHAR(100),
          file_size_bytes  INTEGER,
          category         VARCHAR(50)  DEFAULT 'general'
              CONSTRAINT chk_dca_category CHECK (category IN ('xray','lab_result','prescription','consent','referral','general')),
          description      TEXT,
          uploaded_by      INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
          created_at       TIMESTAMPTZ  DEFAULT NOW()
      )
    $s$, r.schema_name, r.schema_name);

    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_dental_consultation_attachments_tenant_consultation
          ON %I.dental_consultation_attachments(tenant_id, consultation_id)
    $s$, r.schema_name);
  END LOOP;
END $$;
