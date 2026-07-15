-- Migration 50: treasury_documents_payment_term
-- Adds optional payment terms and notes to tenant financial documents.
-- PostgreSQL 10.23 compatible. Safe to run manually in phpPgAdmin.

ALTER TABLE {schema_name}.treasury_documents
    ADD COLUMN IF NOT EXISTS payment_term_id INTEGER NULL;

ALTER TABLE {schema_name}.treasury_documents
    ADD COLUMN IF NOT EXISTS notes TEXT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_treasury_documents_payment_term'
          AND conrelid = '{schema_name}.treasury_documents'::regclass
    ) THEN
        ALTER TABLE {schema_name}.treasury_documents
            ADD CONSTRAINT fk_treasury_documents_payment_term
            FOREIGN KEY (payment_term_id)
            REFERENCES {schema_name}.treasury_payment_terms(id) ON DELETE SET NULL;
    END IF;
END;
$$;
