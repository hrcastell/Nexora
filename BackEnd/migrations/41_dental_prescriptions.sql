-- IMPORTANT: Replace {schema} with the target tenant schema name before running this script.
-- Example: replace {schema} with hernancius (or any other tenant schema name).

-- Migration 41: dental_prescriptions table
-- Multiple prescriptions per consultation

CREATE TABLE IF NOT EXISTS {schema}.dental_prescriptions (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES {schema}.dental_consultations(id) ON DELETE CASCADE,
  medication   VARCHAR(200) NOT NULL,
  dosage       VARCHAR(100) NOT NULL,
  frequency    VARCHAR(100) NOT NULL,
  duration     VARCHAR(100) NOT NULL,
  route        VARCHAR(50),
  instructions TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_consultation ON {schema}.dental_prescriptions(consultation_id);
