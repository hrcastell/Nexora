-- =============================================================
-- MIGRATION: 44_inventory_core_module.sql
-- Core 4 — Inventory Core
--
-- Registra el módulo inventory en el catálogo global y
-- crea todas las tablas del módulo en el schema del tenant.
--
-- ESQUEMA DE EJECUCIÓN:
--   Este archivo tiene DOS secciones:
--
--   SECCIÓN A — Ejecutar UNA SOLA VEZ en schema public:
--     Registra módulo + transacciones en module_catalog / module_transactions
--
--   SECCIÓN B — Ejecutar por cada tenant (reemplazar {schema_name}):
--     Crea las tablas del módulo en el schema del tenant
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar sección A y ejecutar
--   Luego reemplazar {schema_name} por el schema real y ejecutar sección B
-- =============================================================

-- —————————————————————————————————————————————————————————————
-- SECCIÓN A — GOBERNANZA GLOBAL (schema public)
-- —————————————————————————————————————————————————————————————

-- A.1 Registrar módulo en module_catalog
INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('inventory', 'Inventario', 'Core operativo de inventario y abastecimiento',
     'boxes', 'Inventario', FALSE, TRUE, FALSE, TRUE, 40, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    version     = EXCLUDED.version,
    status      = EXCLUDED.status;

-- A.2 Registrar transacciones del módulo
DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id FROM public.module_catalog WHERE code = 'inventory';

    INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'inventory_suppliers',          'Proveedores',          'Gestión de proveedores',                       '/inventory/suppliers',          'truck',           1, TRUE, 'activo'),
        (mod_id, 'inventory_warehouses',         'Bodegas',              'Gestión de bodegas y almacenes',               '/inventory/warehouses',         'warehouse',       2, TRUE, 'activo'),
        (mod_id, 'inventory_purchase_documents', 'Documentos de Compra', 'Órdenes y facturas de compra',                 '/inventory/purchase-documents', 'file-text',       3, TRUE, 'activo'),
        (mod_id, 'inventory_receipts',           'Recepciones',          'Recepciones físicas de inventario',            '/inventory/receptions',         'clipboard-check', 4, TRUE, 'activo'),
        (mod_id, 'inventory_stock',              'Stock',                'Consulta y seguimiento de stock por producto', '/inventory/stock',              'boxes',           5, TRUE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        route       = EXCLUDED.route,
        tab_order   = EXCLUDED.tab_order,
        status      = EXCLUDED.status;
END $$;

-- —————————————————————————————————————————————————————————————
-- SECCIÓN B — TABLAS DEL TENANT (reemplazar {schema_name})
-- —————————————————————————————————————————————————————————————

-- B.1 Proveedores (crear PRIMERO, es target de FK)
CREATE TABLE IF NOT EXISTS {schema_name}.suppliers (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    normalized_name      VARCHAR(255) NOT NULL,
    document_type        VARCHAR(50),
    document_number      VARCHAR(80),
    phone                VARCHAR(50),
    mobile               VARCHAR(50),
    email                VARCHAR(150),
    country              VARCHAR(100),
    region_state         VARCHAR(100),
    city                 VARCHAR(100),
    commune_district     VARCHAR(100),
    address              TEXT,
    contact_name         VARCHAR(150),
    payment_term_days    INTEGER      NOT NULL DEFAULT 0,
    notes                TEXT,
    status               VARCHAR(30)  NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- B.2 Bodegas
CREATE TABLE IF NOT EXISTS {schema_name}.warehouses (
    id                   SERIAL PRIMARY KEY,
    code                 VARCHAR(30)  NOT NULL,
    name                 VARCHAR(150) NOT NULL,
    warehouse_type       VARCHAR(30)  NOT NULL DEFAULT 'main',
    country              VARCHAR(100),
    region_state         VARCHAR(100),
    city                 VARCHAR(100),
    commune_district     VARCHAR(100),
    address              TEXT,
    manager_name         VARCHAR(150),
    phone                VARCHAR(50),
    notes                TEXT,
    status               VARCHAR(30)  NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouses_code UNIQUE (code),
    CONSTRAINT chk_warehouses_type CHECK (warehouse_type IN ('main', 'store', 'transit', 'external'))
);

-- B.3 Correlativos internos
CREATE TABLE IF NOT EXISTS {schema_name}.document_sequences (
    id                   SERIAL PRIMARY KEY,
    document_type        VARCHAR(30) NOT NULL,
    prefix               VARCHAR(20) NOT NULL,
    current_number       INTEGER     NOT NULL DEFAULT 0,
    padding              INTEGER     NOT NULL DEFAULT 6,
    reset_policy         VARCHAR(20) NOT NULL DEFAULT 'yearly',
    status               VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    seq_year             INTEGER     NOT NULL,
    CONSTRAINT uq_document_sequences_type UNIQUE (document_type),
    CONSTRAINT chk_document_sequences_type CHECK (document_type IN (
        'purchase_order', 'purchase_invoice', 'dispatch_order', 'stock_count'
    )),
    CONSTRAINT chk_document_sequences_reset_policy CHECK (reset_policy IN ('yearly', 'never'))
);

-- B.4 Extender products con campos de inventario
ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS inventory_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS track_serial BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS track_batch BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS max_stock NUMERIC(12,2) NULL;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS preferred_supplier_id INTEGER NULL;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(30) NULL;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS sale_unit VARCHAR(30) NULL;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS average_cost NUMERIC(14,4) NOT NULL DEFAULT 0;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS last_purchase_cost NUMERIC(14,4) NOT NULL DEFAULT 0;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS requires_expiration BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE {schema_name}.products
    ADD COLUMN IF NOT EXISTS storage_notes TEXT NULL;

-- B.5 FK diferida products -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_products_preferred_supplier'
          AND conrelid = '{schema_name}.products'::regclass
    ) THEN
        ALTER TABLE {schema_name}.products
            ADD CONSTRAINT fk_products_preferred_supplier
            FOREIGN KEY (preferred_supplier_id)
            REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- B.6 Documentos de compra
CREATE TABLE IF NOT EXISTS {schema_name}.purchase_documents (
    id                        SERIAL PRIMARY KEY,
    document_type             VARCHAR(30)   NOT NULL,
    internal_number           VARCHAR(50)   NOT NULL,
    supplier_document_number  VARCHAR(80),
    supplier_id               INTEGER       NOT NULL REFERENCES {schema_name}.suppliers(id) ON DELETE RESTRICT,
    issue_date                DATE          NOT NULL,
    expected_reception_date   DATE,
    due_date                  DATE,
    payment_condition         VARCHAR(20)   NOT NULL DEFAULT 'cash',
    payment_term_days         INTEGER       NOT NULL DEFAULT 0,
    currency                  VARCHAR(10)   NOT NULL DEFAULT 'CLP',
    subtotal                  NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_total            NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    total                     NUMERIC(14,2) NOT NULL DEFAULT 0,
    status                    VARCHAR(30)   NOT NULL DEFAULT 'draft',
    notes                     TEXT,
    created_by                INTEGER,
    created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_purchase_documents_internal_number UNIQUE (internal_number),
    CONSTRAINT chk_purchase_documents_type CHECK (document_type IN ('purchase_order', 'purchase_invoice')),
    CONSTRAINT chk_purchase_documents_payment_condition CHECK (payment_condition IN ('cash', 'credit')),
    CONSTRAINT chk_purchase_documents_status CHECK (status IN (
        'draft', 'issued', 'partially_received', 'received', 'cancelled'
    ))
);

-- B.7 Líneas de documentos de compra
CREATE TABLE IF NOT EXISTS {schema_name}.purchase_document_lines (
    id                     SERIAL PRIMARY KEY,
    purchase_document_id   INTEGER       NOT NULL REFERENCES {schema_name}.purchase_documents(id) ON DELETE CASCADE,
    product_id             INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    product_name_snapshot  VARCHAR(150)  NOT NULL,
    sku_snapshot           VARCHAR(80),
    quantity               NUMERIC(12,2) NOT NULL,
    received_quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_quantity       NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit                   VARCHAR(30),
    unit_cost              NUMERIC(14,4) NOT NULL DEFAULT 0,
    discount_percent       NUMERIC(8,4)  NOT NULL DEFAULT 0,
    tax_percent            NUMERIC(8,4)  NOT NULL DEFAULT 0,
    line_total             NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes                  TEXT,
    CONSTRAINT chk_purchase_document_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_purchase_document_lines_received CHECK (received_quantity >= 0),
    CONSTRAINT chk_purchase_document_lines_pending CHECK (pending_quantity >= 0)
);

-- B.8 Recepciones físicas
CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipts (
    id                    SERIAL PRIMARY KEY,
    receipt_number        VARCHAR(50) NOT NULL,
    purchase_document_id  INTEGER     NOT NULL REFERENCES {schema_name}.purchase_documents(id) ON DELETE RESTRICT,
    warehouse_id          INTEGER     NOT NULL REFERENCES {schema_name}.warehouses(id) ON DELETE RESTRICT,
    reception_date        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supplier_id           INTEGER     NOT NULL REFERENCES {schema_name}.suppliers(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes                 TEXT,
    created_by            INTEGER,
    created_at            TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stock_receipts_number UNIQUE (receipt_number),
    CONSTRAINT chk_stock_receipts_status CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);

-- B.9 Líneas de recepción
CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipt_lines (
    id                         SERIAL PRIMARY KEY,
    stock_receipt_id           INTEGER       NOT NULL REFERENCES {schema_name}.stock_receipts(id) ON DELETE CASCADE,
    purchase_document_line_id  INTEGER       REFERENCES {schema_name}.purchase_document_lines(id) ON DELETE SET NULL,
    product_id                 INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    quantity_received          NUMERIC(12,2) NOT NULL,
    unit_cost                  NUMERIC(14,4) NOT NULL DEFAULT 0,
    unit                       VARCHAR(30),
    batch_number               VARCHAR(120),
    serial_number              VARCHAR(120),
    expiration_date            DATE,
    CONSTRAINT chk_stock_receipt_lines_quantity CHECK (quantity_received > 0)
);

-- B.10 Movimientos de stock (append-only ledger)
CREATE TABLE IF NOT EXISTS {schema_name}.stock_movements (
    id                   SERIAL PRIMARY KEY,
    movement_type        VARCHAR(30)   NOT NULL,
    product_id           INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    warehouse_id         INTEGER       NOT NULL REFERENCES {schema_name}.warehouses(id) ON DELETE RESTRICT,
    related_warehouse_id INTEGER       REFERENCES {schema_name}.warehouses(id) ON DELETE SET NULL,
    reference_table      VARCHAR(80)   NOT NULL,
    reference_id         INTEGER,
    reference_number     VARCHAR(80),
    quantity             NUMERIC(12,2) NOT NULL,
    unit_cost            NUMERIC(14,4) NOT NULL DEFAULT 0,
    total_cost           NUMERIC(14,4) NOT NULL DEFAULT 0,
    movement_date        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signed_quantity      NUMERIC(12,2) NOT NULL,
    notes                TEXT,
    created_by           INTEGER,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_movements_type CHECK (movement_type IN (
        'receipt', 'transfer_out', 'transfer_in', 'adjustment_in',
        'adjustment_out', 'consumption', 'reversal'
    )),
    CONSTRAINT chk_stock_movements_quantity CHECK (quantity > 0)
);

-- B.11 Índices
CREATE INDEX IF NOT EXISTS idx_suppliers_normalized_name            ON {schema_name}.suppliers(normalized_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status                     ON {schema_name}.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_status                    ON {schema_name}.warehouses(status);
CREATE INDEX IF NOT EXISTS idx_document_sequences_status            ON {schema_name}.document_sequences(status);
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier_id       ON {schema_name}.products(preferred_supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_documents_supplier_id       ON {schema_name}.purchase_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_documents_status            ON {schema_name}.purchase_documents(status);
CREATE INDEX IF NOT EXISTS idx_purchase_document_lines_document_id  ON {schema_name}.purchase_document_lines(purchase_document_id);
CREATE INDEX IF NOT EXISTS idx_purchase_document_lines_product_id   ON {schema_name}.purchase_document_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_purchase_document_id  ON {schema_name}.stock_receipts(purchase_document_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_warehouse_id          ON {schema_name}.stock_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_supplier_id           ON {schema_name}.stock_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_status                ON {schema_name}.stock_receipts(status);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_receipt_id       ON {schema_name}.stock_receipt_lines(stock_receipt_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_document_line_id ON {schema_name}.stock_receipt_lines(purchase_document_line_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_product_id       ON {schema_name}.stock_receipt_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id           ON {schema_name}.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id         ON {schema_name}.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_related_warehouse_id ON {schema_name}.stock_movements(related_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse    ON {schema_name}.stock_movements(product_id, warehouse_id);

-- B.12 Trigger de inmutabilidad
CREATE OR REPLACE FUNCTION {schema_name}.trg_stock_movements_immutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'stock_movements is append-only (no UPDATE/DELETE)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_movements_no_mutate ON {schema_name}.stock_movements;

CREATE TRIGGER stock_movements_no_mutate
BEFORE UPDATE OR DELETE ON {schema_name}.stock_movements
FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_stock_movements_immutable();
