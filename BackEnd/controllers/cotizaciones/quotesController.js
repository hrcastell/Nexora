const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { allocateNumber } = require('../../services/inventory/sequenceService');
const { getNextNumber } = require('../../services/treasury/sequenceService');

// Lifecycle (spec: Cotizaciones Module domain — Quote lifecycle requirement;
// design §6): draft -> sent -> accepted|rejected -> paid -> converted.
// `paid` is ONLY reachable via the Treasury settle hook
// (paymentApplicationsControllerFactory.js -> quotePaymentService), and
// `converted` ONLY via a confirmed stock receipt on the auto-generated
// purchase document (stockReceiptsController.confirm) — neither is a
// directly-callable action here, by design (no direct-to-customer bypass).
const TRANSITIONS = {
    send:   { from: ['draft'], to: 'sent' },
    accept: { from: ['sent'],  to: 'accepted' },
    reject: { from: ['sent'],  to: 'rejected' }
};

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
    return Math.round(number(value) * 100) / 100;
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

/**
 * Resolves a quote_lines row's input, application-computed — no PG10
 * generated columns (design §5). Two modes:
 *  - is_non_stocked=false ("stocked" line): requires product_id, snapshots
 *    name/sku from the product, unit_price defaults to reference_price.
 *  - is_non_stocked=true (tercerizado/drop-ship line, spec: Quote line
 *    sourcing requirement): requires supplier_id + supplier_cost;
 *    product_id is OPTIONAL (may reference an existing non-inventory
 *    product, or be absent — the product gets resolved/created later by the
 *    purchase flow); unit_price = supplier_cost * (1 + margin_pct/100).
 */
async function resolveLineInput(client, schema, body) {
    const isNonStocked = body.is_non_stocked === true || body.is_non_stocked === 'true';
    const quantity = number(body.quantity, -1);
    if (!(quantity > 0)) throw createError('quantity debe ser mayor que cero', 400);

    let product = null;
    if (body.product_id) {
        const productRes = await client.query(
            `SELECT id, name, sku, reference_price FROM ${schema}.products WHERE id = $1`,
            [body.product_id]
        );
        if (!productRes.rows.length) throw createError('Producto no encontrado', 400);
        product = productRes.rows[0];
    }

    if (isNonStocked) {
        if (!body.supplier_id) throw createError('supplier_id es requerido para líneas tercerizadas', 400);
        const supplierCost = number(body.supplier_cost, -1);
        if (!(supplierCost >= 0)) throw createError('supplier_cost debe ser un valor válido', 400);
        const marginPct = number(body.margin_pct, 0);
        const unitPrice = round2(supplierCost * (1 + marginPct / 100));
        return {
            productId: product ? product.id : null,
            productNameSnapshot: product ? product.name : (body.product_name || null),
            skuSnapshot: product ? product.sku : (body.sku || null),
            supplierId: Number(body.supplier_id),
            supplierCost, marginPct, unitPrice, quantity,
            subtotal: round2(unitPrice * quantity),
            isNonStocked: true
        };
    }

    if (!product) throw createError('product_id es requerido para líneas de stock', 400);
    const unitPrice = body.unit_price !== undefined && body.unit_price !== ''
        ? number(body.unit_price, 0)
        : Number(product.reference_price || 0);
    return {
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        supplierId: body.supplier_id ? Number(body.supplier_id) : null,
        supplierCost: number(body.supplier_cost, 0),
        marginPct: number(body.margin_pct, 0),
        unitPrice, quantity,
        subtotal: round2(unitPrice * quantity),
        isNonStocked: false
    };
}

async function lockQuote(client, schema, quoteId) {
    const result = await client.query(`SELECT * FROM ${schema}.quotes WHERE id = $1 FOR UPDATE`, [quoteId]);
    if (!result.rows.length) throw createError('Cotización no encontrada', 404);
    return result.rows[0];
}

async function recalcTotals(client, schema, quoteId, discountAmount = null) {
    const linesRes = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS subtotal FROM ${schema}.quote_lines WHERE quote_id = $1`,
        [quoteId]
    );
    const subtotal = round2(linesRes.rows[0].subtotal);
    const quoteRes = await client.query(`SELECT discount_amount FROM ${schema}.quotes WHERE id = $1`, [quoteId]);
    const discount = discountAmount !== null ? round2(discountAmount) : round2(quoteRes.rows[0].discount_amount);
    const finalAmount = round2(subtotal - discount);
    await client.query(
        `UPDATE ${schema}.quotes SET subtotal = $1, discount_amount = $2, final_amount = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [subtotal, discount, finalAmount, quoteId]
    );
    return { subtotal, discount, finalAmount };
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status, customer_id } = req.query;
        const params = [];
        const conditions = [];
        if (status) { params.push(status); conditions.push(`q.status = $${params.length}`); }
        if (customer_id) { params.push(customer_id); conditions.push(`q.customer_id = $${params.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(
            `SELECT q.*, c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name
             FROM ${schema}.quotes q
             LEFT JOIN ${schema}.customers c ON c.id = q.customer_id
             ${where}
             ORDER BY q.created_at DESC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('quotesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar cotizaciones' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const header = await db.query(
            `SELECT q.*, c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name
             FROM ${schema}.quotes q
             LEFT JOIN ${schema}.customers c ON c.id = q.customer_id
             WHERE q.id = $1`,
            [req.params.id]
        );
        if (!header.rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });
        const lines = await db.query(
            `SELECT ql.*, s.name AS supplier_name FROM ${schema}.quote_lines ql
             LEFT JOIN ${schema}.suppliers s ON s.id = ql.supplier_id
             WHERE ql.quote_id = $1 ORDER BY ql.id ASC`,
            [req.params.id]
        );
        res.json({ ...header.rows[0], lines: lines.rows });
    } catch (err) {
        console.error('quotesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener cotización' });
    }
};

exports.create = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const quoteNumber = await allocateNumber(client, schema, 'quote');
        const result = await client.query(
            `INSERT INTO ${schema}.quotes (quote_number, customer_id, valid_until, notes, created_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [quoteNumber, req.body.customer_id || null, req.body.valid_until || null, req.body.notes || null, req.user.id]
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear cotización' });
    } finally {
        client.release();
    }
};

exports.update = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const quote = await lockQuote(client, schema, req.params.id);
        if (quote.status !== 'draft') throw createError('Solo se pueden editar cotizaciones en estado draft', 409);
        await client.query(
            `UPDATE ${schema}.quotes SET customer_id = $1, valid_until = $2, notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [req.body.customer_id ?? quote.customer_id, req.body.valid_until ?? quote.valid_until, req.body.notes ?? quote.notes, quote.id]
        );
        const discountAmount = req.body.discount_amount !== undefined ? req.body.discount_amount : null;
        await recalcTotals(client, schema, quote.id, discountAmount);
        const updated = await client.query(`SELECT * FROM ${schema}.quotes WHERE id = $1`, [quote.id]);
        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar cotización' });
    } finally {
        client.release();
    }
};

exports.addLine = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const quote = await lockQuote(client, schema, req.params.id);
        if (quote.status !== 'draft') throw createError('Solo se pueden editar líneas de cotizaciones en estado draft', 409);
        const line = await resolveLineInput(client, schema, req.body);
        const inserted = await client.query(
            `INSERT INTO ${schema}.quote_lines
             (quote_id, product_id, product_name_snapshot, sku_snapshot, supplier_id, supplier_cost, margin_pct, unit_price, quantity, subtotal, is_non_stocked)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [quote.id, line.productId, line.productNameSnapshot, line.skuSnapshot, line.supplierId,
             line.supplierCost, line.marginPct, line.unitPrice, line.quantity, line.subtotal, line.isNonStocked]
        );
        await recalcTotals(client, schema, quote.id);
        await client.query('COMMIT');
        res.status(201).json(inserted.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.addLine error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar línea' });
    } finally {
        client.release();
    }
};

exports.updateLine = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const quote = await lockQuote(client, schema, req.params.id);
        if (quote.status !== 'draft') throw createError('Solo se pueden editar líneas de cotizaciones en estado draft', 409);
        const existing = await client.query(
            `SELECT * FROM ${schema}.quote_lines WHERE id = $1 AND quote_id = $2 FOR UPDATE`,
            [req.params.lineId, quote.id]
        );
        if (!existing.rows.length) throw createError('Línea no encontrada', 404);
        const line = await resolveLineInput(client, schema, req.body);
        const updated = await client.query(
            `UPDATE ${schema}.quote_lines SET product_id=$1, product_name_snapshot=$2, sku_snapshot=$3, supplier_id=$4,
             supplier_cost=$5, margin_pct=$6, unit_price=$7, quantity=$8, subtotal=$9, is_non_stocked=$10, updated_at=CURRENT_TIMESTAMP
             WHERE id=$11 RETURNING *`,
            [line.productId, line.productNameSnapshot, line.skuSnapshot, line.supplierId, line.supplierCost,
             line.marginPct, line.unitPrice, line.quantity, line.subtotal, line.isNonStocked, req.params.lineId]
        );
        await recalcTotals(client, schema, quote.id);
        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.updateLine error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar línea' });
    } finally {
        client.release();
    }
};

exports.deleteLine = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const quote = await lockQuote(client, schema, req.params.id);
        if (quote.status !== 'draft') throw createError('Solo se pueden editar líneas de cotizaciones en estado draft', 409);
        const deleted = await client.query(
            `DELETE FROM ${schema}.quote_lines WHERE id = $1 AND quote_id = $2 RETURNING id`,
            [req.params.lineId, quote.id]
        );
        if (!deleted.rows.length) throw createError('Línea no encontrada', 404);
        await recalcTotals(client, schema, quote.id);
        await client.query('COMMIT');
        res.json({ id: Number(req.params.lineId), deleted: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.deleteLine error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar línea' });
    } finally {
        client.release();
    }
};

/**
 * Generic lifecycle-transition handler for send/reject (accept has its own
 * handler below because it also creates the treasury_documents row).
 * Rejects invalid jumps (e.g. draft -> converted) with 409, per spec
 * scenario "Quote lifecycle enforcement".
 */
function makeTransitionHandler(action, extraFields) {
    return async (req, res) => {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const client = await db.getClient();
        try {
            const { schema } = await resolveSchema(req);
            const transition = TRANSITIONS[action];
            await client.query('BEGIN');
            const quote = await lockQuote(client, schema, req.params.id);
            if (!transition.from.includes(quote.status)) {
                throw createError(`Transición inválida: no se puede pasar de '${quote.status}' a '${transition.to}'`, 409);
            }
            if (action === 'send') {
                const lines = await client.query(`SELECT COUNT(*) count FROM ${schema}.quote_lines WHERE quote_id = $1`, [quote.id]);
                if (Number(lines.rows[0].count) === 0) throw createError('La cotización requiere al menos una línea antes de enviarse', 400);
            }
            const fields = extraFields ? extraFields(req.body) : { assignments: '', values: [] };
            const result = await client.query(
                `UPDATE ${schema}.quotes SET status = $1, updated_at = CURRENT_TIMESTAMP${fields.assignments} WHERE id = $${fields.values.length + 2} RETURNING *`,
                [transition.to, ...fields.values, quote.id]
            );
            await client.query('COMMIT');
            res.json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`quotesController.${action} error:`, err.message);
            res.status(err.statusCode || 500).json({ error: err.message || `Error al procesar la transición ${action}` });
        } finally {
            client.release();
        }
    };
}

exports.send = makeTransitionHandler('send');

exports.reject = makeTransitionHandler('reject', (body) => ({
    assignments: ', rejected_at = CURRENT_TIMESTAMP, rejection_reason = $2',
    values: [body.rejection_reason || body.reason || null]
}));

/**
 * POST /cotizaciones/quotes/:id/accept
 * sent -> accepted. Also creates the treasury_documents row that becomes
 * the payment source of truth (spec: Treasury Integration for Quote Payment
 * domain — "An app-only flag MUST NOT be used"; design §6, corrected FK per
 * tasks' flagged ambiguity: quotes.treasury_document_id, not a nonexistent
 * treasury_collections table).
 *
 * Requires req.body.counterparty_id: an ACTIVE treasury_counterparties row.
 * There is no automatic customers -> treasury_counterparties linking
 * anywhere in this codebase (every other treasury document creation flow
 * — documentsController.create, paymentApplicationsControllerFactory —
 * also requires an explicit, pre-existing counterparty_id), so the
 * Cotizaciones "accept" screen must let the user pick/confirm which
 * treasury counterparty this quote's customer maps to (Phase 4 needs this).
 */
exports.accept = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!isPositiveInteger(req.body.counterparty_id)) {
        return res.status(400).json({ error: 'counterparty_id debe ser un entero positivo (contraparte de Tesorería asociada a este cliente)' });
    }
    const client = await db.getClient();
    try {
        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        const quote = await lockQuote(client, schema, req.params.id);
        if (!TRANSITIONS.accept.from.includes(quote.status)) {
            throw createError(`Transición inválida: no se puede pasar de '${quote.status}' a 'accepted'`, 409);
        }
        const counterparty = await client.query(
            `SELECT id FROM ${schema}.treasury_counterparties WHERE id = $1 AND status = 'active'`,
            [req.body.counterparty_id]
        );
        if (!counterparty.rows.length) throw createError('Contraparte activa no encontrada', 404);

        const internalNumber = await getNextNumber(client, schema, companyId, 'sale_invoice');
        const docResult = await client.query(
            `INSERT INTO ${schema}.treasury_documents
             (tenant_id, document_type, direction, internal_number, counterparty_id, origin_core, origin_table, origin_id,
              issue_date, currency, subtotal, tax_total, discount_total, total_amount, balance_amount, status, created_by)
             VALUES ($1,'sale_invoice','receivable',$2,$3,'cotizaciones','quotes',$4,CURRENT_DATE,'CLP',$5,0,0,$5,$5,'open',$6)
             RETURNING id`,
            [companyId, internalNumber, req.body.counterparty_id, quote.id, Number(quote.final_amount), req.user.id]
        );

        const updated = await client.query(
            `UPDATE ${schema}.quotes SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP,
             accepted_by_name = $1, acceptance_notes = $2, treasury_document_id = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 RETURNING *`,
            [req.body.accepted_by_name || null, req.body.acceptance_notes || null, docResult.rows[0].id, quote.id]
        );
        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('quotesController.accept error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al aceptar cotización' });
    } finally {
        client.release();
    }
};
