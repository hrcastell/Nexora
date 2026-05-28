-- =============================================================
-- MIGRATION: 15_vehicle_ownership_transfer.sql
-- Agrega tabla de historial de traspaso de propietario de vehículo.
-- Idempotente — seguro re-ejecutar.
--
-- CÓMO EJECUTAR:
--   Reemplazar {schema_name} por el schema del tenant (ej: hernancius)
-- =============================================================

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_ownership_transfers (
    id              SERIAL PRIMARY KEY,
    vehicle_id      INTEGER      NOT NULL REFERENCES {schema_name}.vehicles(id) ON DELETE CASCADE,
    previous_customer_id INTEGER  REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    new_customer_id INTEGER       NOT NULL REFERENCES {schema_name}.customers(id),
    transfer_reason TEXT,
    transferred_by  INTEGER,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vot_vehicle  ON {schema_name}.vehicle_ownership_transfers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vot_customer ON {schema_name}.vehicle_ownership_transfers(new_customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON {schema_name}.vehicle_ownership_transfers
    TO hernanci_nexoragarage;

GRANT USAGE, SELECT
    ON SEQUENCE {schema_name}.vehicle_ownership_transfers_id_seq
    TO hernanci_nexoragarage;
