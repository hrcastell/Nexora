-- =============================================================
-- MIGRATION: 17_work_order_payments.sql
-- Tabla de cobros/pagos de órdenes de trabajo.
-- Idempotente — seguro re-ejecutar.
--
-- CÓMO EJECUTAR:
--   Reemplazar {schema_name} por el schema del tenant (ej: hernancius)
-- =============================================================

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_payments (
    id              SERIAL PRIMARY KEY,
    work_order_id   INTEGER       NOT NULL REFERENCES {schema_name}.work_orders(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    currency        VARCHAR(10)   DEFAULT 'CLP',
    payment_method  VARCHAR(60),      -- efectivo | tarjeta | transferencia | cheque | otro
    reference       VARCHAR(120),     -- número de transacción, folio, etc.
    notes           TEXT,
    payment_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    registered_by   INTEGER,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wop_work_order ON {schema_name}.work_order_payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wop_date       ON {schema_name}.work_order_payments(payment_date);

-- payment_status column on work_orders
ALTER TABLE {schema_name}.work_orders
    ADD COLUMN IF NOT EXISTS payment_status   VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS amount_paid      NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_pending   NUMERIC(12,2) DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON {schema_name}.work_order_payments
    TO hernanci_nexoragarage;

GRANT USAGE, SELECT
    ON SEQUENCE {schema_name}.work_order_payments_id_seq
    TO hernanci_nexoragarage;
