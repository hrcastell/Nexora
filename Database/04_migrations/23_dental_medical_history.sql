-- Migration 23: dental_medical_history
-- Creates the dental_medical_history table in the hernancius schema and all tenant schemas.
-- Run manually via phpPgAdmin. Replace {schema} with the actual schema name for each tenant.

-- For the master schema (hernancius) and any existing tenant schema:
CREATE TABLE IF NOT EXISTS hernancius.dental_medical_history (
    id                   SERIAL PRIMARY KEY,
    tenant_id            INTEGER NOT NULL,
    customer_id          INTEGER NOT NULL,
    entry_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    blood_type           VARCHAR(10),
    medical_background   TEXT,
    allergies            TEXT,
    current_medications  TEXT,
    chronic_conditions   TEXT,
    dental_observations  TEXT,
    notes                TEXT,
    created_by           INTEGER,
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_med_history_tenant_customer
    ON hernancius.dental_medical_history(tenant_id, customer_id);
