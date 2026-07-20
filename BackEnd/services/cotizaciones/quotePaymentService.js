const db = require('../../config/db');
const { allocateNumber } = require('../../services/inventory/sequenceService');
const { buildLines, totals, insertLines } = require('../../controllers/inventory/purchaseDocumentsController');

/**
 * markQuotePaidAndGenerateDraftPO(schema, quoteId, treasuryDocumentId)
 *
 * Called from paymentApplicationsControllerFactory.js controller.apply()
 * when a treasury_documents row with origin_core='cotizaciones' settles
 * (spec: Treasury Integration for Quote Payment domain — "Quote marked
 * paid" scenario; design §6, ADR-4). This is a plain service call, not a DB
 * trigger, so it stays testable and Bluehost-safe.
 *
 * 1. Sets quotes.status='paid' + paid_at + treasury_document_id.
 * 2. Groups the quote's non-stocked (`is_non_stocked=true`) lines by
 *    supplier_id and auto-generates ONE `purchase_documents` draft PER
 *    supplier group, pre-filled from each line's supplier/cost data, reusing
 *    the exact same resolve-or-create line-building logic a manually-created
 *    purchase document uses (purchaseDocumentsController.buildLines — spec:
 *    Tercerizador Fulfillment domain — "Auto-generate draft purchase on
 *    paid quote"). The draft is NOT auto-issued; a human must review and
 *    confirm/issue it (design §6 — fork 4, not fully automatic), and it
 *    must then flow through a real stock receipt before the quote can reach
 *    `converted` (stockReceiptsController.confirm carries that hook).
 *
 * KNOWN LIMITATION (flagged for verify): `quotes.converted_purchase_document_id`
 * is a single FK column (migration 52's schema), so when a quote has
 * non-stocked lines from MORE THAN ONE supplier, only the FIRST generated
 * purchase document is linked back to the quote for the eventual
 * paid -> converted auto-transition. All draft POs ARE created correctly
 * (grouped/costed per supplier); only the automatic `converted` status flip
 * is guaranteed for the common single-supplier-per-quote case. Multi-supplier
 * tercerizador quotes will need either a schema follow-up (e.g. a join
 * table or an origin_quote_id column on purchase_documents) or a manual
 * status update once every supplier's goods have been received.
 */
async function markQuotePaidAndGenerateDraftPO(schema, quoteId, treasuryDocumentId) {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const quoteRes = await client.query(`SELECT * FROM ${schema}.quotes WHERE id = $1 FOR UPDATE`, [quoteId]);
        if (!quoteRes.rows.length) {
            await client.query('ROLLBACK');
            return { skipped: true, reason: `quote ${quoteId} not found in schema ${schema}` };
        }
        const quote = quoteRes.rows[0];

        // Idempotency guard: the settle hook could theoretically fire more
        // than once for the same document (defensive, not expected in
        // normal operation) — only 'accepted' quotes may become 'paid'.
        if (quote.status !== 'accepted') {
            await client.query('ROLLBACK');
            return { skipped: true, reason: `quote ${quoteId} status is '${quote.status}', expected 'accepted'` };
        }

        await client.query(
            `UPDATE ${schema}.quotes SET status = 'paid', treasury_document_id = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [treasuryDocumentId, quoteId]
        );

        const nonStockedLinesRes = await client.query(
            `SELECT * FROM ${schema}.quote_lines WHERE quote_id = $1 AND is_non_stocked = TRUE AND supplier_id IS NOT NULL`,
            [quoteId]
        );
        const nonStockedLines = nonStockedLinesRes.rows;

        if (!nonStockedLines.length) {
            await client.query('COMMIT');
            return { paid: true, purchaseDocuments: [] };
        }

        const bySupplier = new Map();
        for (const line of nonStockedLines) {
            if (!bySupplier.has(line.supplier_id)) bySupplier.set(line.supplier_id, []);
            bySupplier.get(line.supplier_id).push(line);
        }

        const createdPurchaseDocuments = [];
        let firstPurchaseDocumentId = null;
        for (const [supplierId, supplierLines] of bySupplier.entries()) {
            const rawLines = supplierLines.map((line) => ({
                product_id: line.product_id || undefined,
                new_product: line.product_id ? undefined : {
                    name: line.product_name_snapshot || `Ítem cotización ${quote.quote_number}`,
                    sku: line.sku_snapshot
                },
                quantity: Number(line.quantity),
                unit_cost: Number(line.supplier_cost),
                notes: `Generado automáticamente desde cotización ${quote.quote_number} (línea #${line.id})`
            }));
            const builtLines = await buildLines(client, schema, rawLines);
            const calculated = totals(builtLines);
            const internalNumber = await allocateNumber(client, schema, 'purchase_order');
            const poResult = await client.query(
                `INSERT INTO ${schema}.purchase_documents
                 (document_type, internal_number, supplier_id, issue_date, currency, subtotal, discount_total, tax_total, total, notes, status)
                 VALUES ('purchase_order',$1,$2,CURRENT_DATE,'CLP',$3,$4,$5,$6,$7,'draft') RETURNING *`,
                [internalNumber, supplierId, calculated.subtotal, calculated.discountTotal, calculated.taxTotal, calculated.total,
                 `Borrador generado automáticamente al pagarse la cotización ${quote.quote_number}`]
            );
            await insertLines(client, schema, poResult.rows[0].id, builtLines);
            createdPurchaseDocuments.push(poResult.rows[0]);
            if (!firstPurchaseDocumentId) firstPurchaseDocumentId = poResult.rows[0].id;
        }

        if (firstPurchaseDocumentId) {
            await client.query(
                `UPDATE ${schema}.quotes SET converted_purchase_document_id = $1 WHERE id = $2`,
                [firstPurchaseDocumentId, quoteId]
            );
        }

        await client.query('COMMIT');
        return { paid: true, purchaseDocuments: createdPurchaseDocuments };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { markQuotePaidAndGenerateDraftPO };
