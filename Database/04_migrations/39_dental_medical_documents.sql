-- 39_dental_medical_documents.sql
-- Medical Documents: Informes, Constancias, Recetas por consulta/paciente

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name FROM public.companies
    WHERE schema_name IS NOT NULL AND schema_name != 'public'
  LOOP

    -- Sequence for auto-numbering documents
    EXECUTE format($s$
      CREATE SEQUENCE IF NOT EXISTS %I.dental_medical_doc_number_seq START 1
    $s$, r.schema_name);

    -- Main table
    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.dental_medical_documents (
        id                    SERIAL PRIMARY KEY,
        tenant_id             VARCHAR(255) NOT NULL,
        customer_id           INTEGER NOT NULL
                                REFERENCES %I.customers(id) ON DELETE RESTRICT,
        consultation_id       INTEGER
                                REFERENCES %I.dental_consultations(id) ON DELETE SET NULL,
        document_type         VARCHAR(30) NOT NULL
                                CONSTRAINT chk_doc_type CHECK (
                                  document_type IN (''medical_report'', ''medical_certificate'', ''prescription'')
                                ),
        document_number       VARCHAR(20) NOT NULL,
        document_date         DATE NOT NULL DEFAULT CURRENT_DATE,
        title                 VARCHAR(255),
        content               TEXT,
        professional_name     VARCHAR(255),
        professional_license  VARCHAR(100),
        professional_specialty VARCHAR(100),
        created_by            INTEGER,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_doc_number_%s UNIQUE (tenant_id, document_number)
      )
    $s$, r.schema_name, r.schema_name, r.schema_name, r.schema_name);

    -- Indexes
    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_dental_medical_docs_customer
        ON %I.dental_medical_documents (tenant_id, customer_id)
    $s$, r.schema_name);

    EXECUTE format($s$
      CREATE INDEX IF NOT EXISTS idx_dental_medical_docs_consultation
        ON %I.dental_medical_documents (tenant_id, consultation_id)
    $s$, r.schema_name);

  END LOOP;
END $$;
