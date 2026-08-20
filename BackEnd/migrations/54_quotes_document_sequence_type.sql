-- =============================================================
-- MIGRATION: 54_quotes_document_sequence_type.sql
-- Products Catalog Transversal — Phase 3 (per-tenant schema)
--
-- Widens {schema}.document_sequences.chk_document_sequences_type to
-- include 'quote', so Cotizaciones can reuse the existing
-- document_sequences / allocateNumber() correlative pattern (same
-- mechanism as purchase_order/purchase_invoice/dispatch_order/
-- stock_count) instead of inventing independent numbering.
--
-- Resolves the gap flagged in migration 52 / Batch 1 apply-progress:
-- quote_number had no generation logic and document_sequences did not
-- accept a quote/cotizacion type.
--
-- Additive/expand-only (DROP+ADD CONSTRAINT only, no data touched).
-- PostgreSQL 10.23 compatible. Safe to paste once PER EXISTING TENANT
-- SCHEMA via phpPgAdmin (replace {schema_name} with the real schema,
-- e.g. hernancius).
-- =============================================================

ALTER TABLE {schema_name}.document_sequences
    DROP CONSTRAINT IF EXISTS chk_document_sequences_type;

ALTER TABLE {schema_name}.document_sequences
    ADD CONSTRAINT chk_document_sequences_type CHECK (document_type IN (
        'purchase_order', 'purchase_invoice', 'dispatch_order', 'stock_count', 'quote'
    ));
