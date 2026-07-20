-- =============================================================
-- MIGRATION: 52_quotes_tables.sql
-- Products Catalog Transversal — Phase 1 (per tenant schema)
--
-- Creates the Cotizaciones module's own tenant tables: `quotes` and
-- `quote_lines`. These are DISTINCT from `dental_quotes` /
-- `dental_quote_items` (migration 38) — no shared table, no reuse of
-- Dental's schema or controllers (per spec: Independence from Dental
-- Quotes).
--
-- Design note (flagged ambiguity, resolved): the original design draft
-- referenced a `treasury_collections` table for the payment FK. That
-- table does not exist in this codebase. The real tenant schema has
-- `treasury_documents` (status incl. 'settled') + `treasury_receipt_
-- applications`, with origin_core/origin_table/origin_id columns
-- already present for linking. This migration uses
-- `quotes.treasury_document_id` FK -> treasury_documents(id) instead.
--
-- Part A: quotes
-- Part B: quote_lines
--
-- Additive only. No ALTER to the existing `products` table.
-- PostgreSQL 10.23 compatible. Safe to paste once per existing tenant
-- schema via phpPgAdmin (replace {schema_name} with the real schema,
-- e.g. hernancius). Also applied going forward to new companies via
-- BackEnd/templates/tenant_schema.sql.
-- =============================================================

-- —————————————————————————————————————————————————————————————
-- PART A — {schema_name}.quotes
-- —————————————————————————————————————————————————————————————

CREATE TABLE IF NOT EXISTS {schema_name}.quotes (
    id                             SERIAL PRIMARY KEY,
    quote_number                   VARCHAR(50)   NOT NULL,
    customer_id                    INTEGER       REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    status                         VARCHAR(30)   NOT NULL DEFAULT 'draft',
    valid_until                    DATE,
    subtotal                       NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount                NUMERIC(14,2) NOT NULL DEFAULT 0,
    final_amount                   NUMERIC(14,2) NOT NULL DEFAULT 0,
    accepted_at                    TIMESTAMP,
    accepted_by_name               VARCHAR(150),
    acceptance_notes               TEXT,
    rejected_at                    TIMESTAMP,
    rejection_reason               TEXT,
    treasury_document_id           INTEGER       REFERENCES {schema_name}.treasury_documents(id) ON DELETE SET NULL,
    paid_at                        TIMESTAMP,
    converted_at                   TIMESTAMP,
    converted_purchase_document_id INTEGER       REFERENCES {schema_name}.purchase_documents(id) ON DELETE SET NULL,
    notes                          TEXT,
    created_by                     INTEGER,
    created_at                     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_quotes_number UNIQUE (quote_number),
    CONSTRAINT chk_quotes_status CHECK (status IN (
        'draft', 'sent', 'accepted', 'rejected', 'expired', 'paid', 'converted'
    ))
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id            ON {schema_name}.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status                 ON {schema_name}.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_treasury_document_id   ON {schema_name}.quotes(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_purchase_doc ON {schema_name}.quotes(converted_purchase_document_id);

-- —————————————————————————————————————————————————————————————
-- PART B — {schema_name}.quote_lines
-- —————————————————————————————————————————————————————————————

CREATE TABLE IF NOT EXISTS {schema_name}.quote_lines (
    id                     SERIAL PRIMARY KEY,
    quote_id               INTEGER       NOT NULL REFERENCES {schema_name}.quotes(id) ON DELETE CASCADE,
    product_id             INTEGER       REFERENCES {schema_name}.products(id) ON DELETE SET NULL,
    product_name_snapshot  VARCHAR(150),
    sku_snapshot           VARCHAR(80),
    supplier_id            INTEGER       REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL,
    supplier_cost          NUMERIC(14,4) NOT NULL DEFAULT 0,
    margin_pct             NUMERIC(8,4)  NOT NULL DEFAULT 0,
    unit_price             NUMERIC(14,4) NOT NULL DEFAULT 0,
    quantity               NUMERIC(12,2) NOT NULL DEFAULT 1,
    subtotal               NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_non_stocked         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quote_lines_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id    ON {schema_name}.quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_id  ON {schema_name}.quote_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_supplier_id ON {schema_name}.quote_lines(supplier_id);
