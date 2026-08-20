-- IMPORTANT: Replace {schema} with the target tenant schema name before running this script.
-- Example: replace {schema} with hernancius (or any other tenant schema name).

-- Migration 42: Dental odontogram entries and attachments
-- PostgreSQL 10.23 compatible

CREATE TABLE IF NOT EXISTS {schema}.dental_odontogram_entries (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES {schema}.customers(id) ON DELETE CASCADE,
  consultation_id INTEGER NOT NULL REFERENCES {schema}.dental_consultations(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  surface VARCHAR(20),
  finding_type VARCHAR(50) NOT NULL,
  finding_status VARCHAR(30) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'normal',
  observation TEXT,
  procedure_suggestion_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {schema}.dental_odontogram_attachments (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES {schema}.dental_odontogram_entries(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(200),
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odontogram_patient ON {schema}.dental_odontogram_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_odontogram_consultation ON {schema}.dental_odontogram_entries(consultation_id);
