-- =============================================================
-- MIGRATION: 48_treasury_collections_core_module.sql
-- Core 6 - Treasury and Collections
--
-- Section A runs once in public. Section B runs once per tenant
-- after replacing {schema_name} with the target tenant schema.
-- PostgreSQL 10.23 compatible and safe to re-run.
-- =============================================================

-- =============================================================
-- SECTION A - GLOBAL GOVERNANCE (public schema)
-- =============================================================

INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('treasury_collections', 'Tesorería y Cobranza',
     'Gestión de tesorería, cuentas por cobrar y cuentas por pagar',
     'wallet', 'Tesorería', FALSE, TRUE, FALSE, TRUE, 60, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    version = EXCLUDED.version,
    status = EXCLUDED.status;

DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id
    FROM public.module_catalog
    WHERE code = 'treasury_collections';

    INSERT INTO public.module_transactions
        (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'treasury_dashboard', 'Tesorería', 'Resumen de tesorería', '/treasury', 'wallet', 1, TRUE, 'activo'),
        (mod_id, 'treasury_settings', 'Configuración', 'Contrapartes, condiciones de pago y cajas', '/treasury/settings', 'settings', 2, TRUE, 'activo'),
        (mod_id, 'treasury_cash_sessions', 'Sesiones de Caja', 'Apertura, movimientos y cierre de caja', '/treasury/cash-sessions', 'cash-register', 3, TRUE, 'activo'),
        (mod_id, 'treasury_receivables', 'Cuentas por Cobrar', 'Documentos pendientes de cobro', '/treasury/receivables', 'file-text', 4, TRUE, 'activo'),
        (mod_id, 'treasury_payables', 'Cuentas por Pagar', 'Documentos pendientes de pago', '/treasury/payables', 'file-minus', 5, TRUE, 'activo'),
        (mod_id, 'treasury_receipts', 'Recibos', 'Registro y aplicación de cobros', '/treasury/receipts', 'arrow-down-circle', 6, TRUE, 'activo'),
        (mod_id, 'treasury_disbursements', 'Pagos Emitidos', 'Registro y aplicación de pagos', '/treasury/disbursements', 'arrow-up-circle', 7, TRUE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        route = EXCLUDED.route,
        tab_order = EXCLUDED.tab_order,
        status = EXCLUDED.status;
END;
$$;

-- =============================================================
-- SECTION B - TENANT TABLES (replace {schema_name})
-- =============================================================

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_counterparties (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    counterparty_type VARCHAR(20) NOT NULL,
    customer_id INTEGER,
    supplier_id INTEGER,
    name_snapshot VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    document_number VARCHAR(80),
    phone VARCHAR(50),
    email VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_counterparties_document UNIQUE (tenant_id, document_number),
    CONSTRAINT chk_treasury_counterparties_type CHECK (counterparty_type IN ('customer', 'supplier', 'both'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_payment_terms (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    term_type VARCHAR(20) NOT NULL,
    days_due INTEGER NOT NULL DEFAULT 0,
    installments_count INTEGER NOT NULL DEFAULT 1,
    grace_days INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_payment_terms_code UNIQUE (code),
    CONSTRAINT chk_treasury_payment_terms_type CHECK (term_type IN ('cash', 'credit', 'installments'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_sequences (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    document_type VARCHAR(50) NOT NULL,
    seq_year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_treasury_document_sequences UNIQUE (tenant_id, document_type, seq_year)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_registers (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_cash_registers_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    cash_register_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_cash_registers(id) ON DELETE RESTRICT,
    employee_id INTEGER NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE RESTRICT,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    closed_at TIMESTAMP,
    expected_amount NUMERIC(14,2),
    counted_amount NUMERIC(14,2),
    difference_amount NUMERIC(14,2),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    CONSTRAINT chk_treasury_cash_sessions_status CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_movements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    cash_session_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL,
    reference_table VARCHAR(80),
    reference_id INTEGER,
    amount NUMERIC(14,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
    signed_amount NUMERIC(14,2) NOT NULL,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_treasury_cash_movements_type CHECK (movement_type IN (
        'sale_in', 'payment_out', 'deposit_out', 'withdrawal_out', 'adjustment_in', 'adjustment_out'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_documents (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    document_type VARCHAR(30) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    internal_number VARCHAR(50) NOT NULL,
    external_number VARCHAR(80),
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    origin_core VARCHAR(50),
    origin_table VARCHAR(80),
    origin_id INTEGER,
    issue_date DATE NOT NULL,
    due_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL,
    balance_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_documents_internal_number UNIQUE (tenant_id, internal_number),
    CONSTRAINT chk_treasury_documents_type CHECK (document_type IN (
        'sale_invoice', 'sale_note', 'purchase_invoice', 'debit_note', 'credit_note', 'installment_plan', 'internal_charge'
    )),
    CONSTRAINT chk_treasury_documents_direction CHECK (direction IN ('receivable', 'payable')),
    CONSTRAINT chk_treasury_documents_status CHECK (status IN ('draft', 'open', 'partially_applied', 'settled', 'void'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_lines (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE CASCADE,
    line_number INTEGER,
    description TEXT,
    quantity NUMERIC(12,2),
    unit_price NUMERIC(14,4),
    line_total NUMERIC(14,2)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_installments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE CASCADE,
    installment_number INTEGER,
    due_date DATE,
    amount NUMERIC(14,2),
    balance_amount NUMERIC(14,2),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    CONSTRAINT chk_treasury_installments_status CHECK (status IN ('pending', 'partially_applied', 'settled'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    receipt_number VARCHAR(50) NOT NULL,
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    receipt_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cash_session_id INTEGER REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    total_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_receipts_number UNIQUE (tenant_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipt_applications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    receipt_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_receipts(id) ON DELETE CASCADE,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE RESTRICT,
    installment_id INTEGER REFERENCES {schema_name}.treasury_installments(id) ON DELETE RESTRICT,
    applied_amount NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    disbursement_number VARCHAR(50) NOT NULL,
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cash_session_id INTEGER REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    total_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_disbursements_number UNIQUE (tenant_id, disbursement_number)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursement_applications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    disbursement_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_disbursements(id) ON DELETE CASCADE,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE RESTRICT,
    installment_id INTEGER REFERENCES {schema_name}.treasury_installments(id) ON DELETE RESTRICT,
    applied_amount NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_treasury_counterparties_document_number ON {schema_name}.treasury_counterparties(document_number);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_cash_register_id ON {schema_name}.treasury_cash_sessions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_employee_id ON {schema_name}.treasury_cash_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_status ON {schema_name}.treasury_cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_movements_cash_session_id ON {schema_name}.treasury_cash_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_counterparty_id ON {schema_name}.treasury_documents(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_status ON {schema_name}.treasury_documents(status);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_direction ON {schema_name}.treasury_documents(direction);
CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_document_id ON {schema_name}.treasury_document_lines(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_installments_document_id ON {schema_name}.treasury_installments(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_installments_status ON {schema_name}.treasury_installments(status);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_counterparty_id ON {schema_name}.treasury_receipts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_cash_session_id ON {schema_name}.treasury_receipts(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_receipt_id ON {schema_name}.treasury_receipt_applications(receipt_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_document_id ON {schema_name}.treasury_receipt_applications(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_installment_id ON {schema_name}.treasury_receipt_applications(installment_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursements_counterparty_id ON {schema_name}.treasury_disbursements(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursements_cash_session_id ON {schema_name}.treasury_disbursements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_disbursement_id ON {schema_name}.treasury_disbursement_applications(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_document_id ON {schema_name}.treasury_disbursement_applications(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_installment_id ON {schema_name}.treasury_disbursement_applications(installment_id);

CREATE OR REPLACE FUNCTION {schema_name}.trg_treasury_cash_movements_immutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'treasury_cash_movements is append-only (no UPDATE/DELETE)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS treasury_cash_movements_no_mutate ON {schema_name}.treasury_cash_movements;

CREATE TRIGGER treasury_cash_movements_no_mutate
BEFORE UPDATE OR DELETE ON {schema_name}.treasury_cash_movements
FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_treasury_cash_movements_immutable();
