-- IMPORTANT: Replace {schema} with the target tenant schema name before running this script.
-- Example: replace {schema} with hernancius (or any other tenant schema name).

-- Migration 40: dental_anamnesis table
-- One anamnesis record per consultation (UNIQUE constraint enables upsert)

CREATE TABLE IF NOT EXISTS {schema}.dental_anamnesis (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES {schema}.dental_consultations(id) ON DELETE CASCADE,
  -- Personal/systemic history
  has_diabetes BOOLEAN DEFAULT FALSE,
  has_hypertension BOOLEAN DEFAULT FALSE,
  has_heart_disease BOOLEAN DEFAULT FALSE,
  has_respiratory_disease BOOLEAN DEFAULT FALSE,
  has_kidney_disease BOOLEAN DEFAULT FALSE,
  has_epilepsy BOOLEAN DEFAULT FALSE,
  has_hepatitis BOOLEAN DEFAULT FALSE,
  has_hiv BOOLEAN DEFAULT FALSE,
  other_systemic_conditions TEXT,
  -- Allergies
  has_penicillin_allergy BOOLEAN DEFAULT FALSE,
  has_aspirin_allergy BOOLEAN DEFAULT FALSE,
  has_latex_allergy BOOLEAN DEFAULT FALSE,
  has_anesthesia_allergy BOOLEAN DEFAULT FALSE,
  other_allergies TEXT,
  -- Current medications
  current_medications TEXT,
  takes_anticoagulants BOOLEAN DEFAULT FALSE,
  takes_bisphosphonates BOOLEAN DEFAULT FALSE,
  -- Dental history
  previous_dental_treatments TEXT,
  previous_complications TEXT,
  last_dental_visit DATE,
  -- Habits
  smokes BOOLEAN DEFAULT FALSE,
  alcohol_consumption VARCHAR(20),
  bruxism BOOLEAN DEFAULT FALSE,
  -- Notes
  additional_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(consultation_id)
);
