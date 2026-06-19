-- IMPORTANT: Replace {schema} with the target tenant schema name before running this script.
-- Example: replace {schema} with hernancius (or any other tenant schema name).

-- Migration 43: dental_diagnoses table per tenant schema
-- Stores clinical diagnoses linked to a consultation, optionally to an odontogram entry.

CREATE TABLE IF NOT EXISTS {schema}.dental_diagnoses (
  id                  SERIAL PRIMARY KEY,
  consultation_id     INTEGER NOT NULL REFERENCES {schema}.dental_consultations(id) ON DELETE CASCADE,
  odontogram_entry_id INTEGER REFERENCES {schema}.dental_odontogram_entries(id) ON DELETE SET NULL,
  diagnosis_code      VARCHAR(20),
  diagnosis_text      VARCHAR(500) NOT NULL,
  severity            VARCHAR(20) DEFAULT 'moderate',
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_diagnoses_consultation ON {schema}.dental_diagnoses(consultation_id);
