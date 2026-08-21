const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { allocateNumber } = require('../../services/inventory/sequenceService');
const { getNextNumber } = require('../../services/treasury/sequenceService');

// Lifecycle (spec: Cotizaciones Module domain — Quote lifecycle requirement;
// design §6): manual free-form status field — draft, sent ("por aprobar"),
// rejected, and expired can all move to any other one of those four states
// (including into 'accepted'). Once a quote reaches 'accepted' it is
// PERMANENTLY LOCKED: no further manual status change is allowed, matching
// the product decision that approval is final. `paid` is ONLY reachable via
// the Treasury settle hook (paymentApplicationsControllerFactory.js ->
// quotePaymentService), and `converted` ONLY via a confirmed stock receipt
// on the auto-generated purchase document (stockReceiptsController.confirm)
// — neither is a directly-callable action here, by design (no
// direct-to-customer bypass); both are downstream of 'accepted' so they
// inherit its lock automatically.
const UNLOCKED_STATUSES = ['draft', 'sent', 'rejected', 'expired'];

const TRANSITIONS = {
    send:   { from: UNLOCKED_STATUSES, to: 'sent' },
    accept: { from: UNLOCKED_STATUSES, to: 'accepted' },
    reject: { from: UNLOCKED_STATUSES, to: 'rejected' },
    draft:  { from: UNLOCKED_STATUSES, to: 'draft' },
    expire: { from: UNLOCKED_STATUSES, to: 'expired' }
};

/**
 * Auto-expires quotes whose validity date has passed while still awaiting a
 * decision (draft or sent). Runs opportunistically on every read instead of
 * a scheduled job — Bluehost shared hosting has no persistent cron/worker
 * runtime available to this app, so "automatic" here means self-healing on
 * next access rather than a background sweep.
 */
async function expireOverdueQuotes(schema) {
    await db.query(
        `UPDATE ${schema}.quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE status IN ('draft', 'sent') AND valid_until IS NOT NULL AND valid_until < CURRENT_DATE`
    );
}

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

    if (!product) {
        // Manual/free-text line: no catalog product, no supplier — e.g. a
        // labor line ("Instalación de software") that isn't meant to be
        // stocked or sourced from a supplier, so it must NOT go through the
        // isNonStocked=true path (that triggers purchase-document generation
        // on acceptance). Requires an explicit name + price since there's no
        // product to snapshot/default from.
        if (!body.product_name) throw createError('Selecciona un producto o indica una descripción para la línea', 400);
        const unitPrice = number(body.unit_price, -1);
        if (!(unitPrice >= 0)) throw createError('unit_price es requerido para líneas manuales', 400);
        return {
            productId: null,
            productNameSnapshot: body.product_name,
            skuSnapshot: body.sku || null,
            supplierId: null,
            supplierCost: 0,
            marginPct: 0,
            unitPrice, quantity,
            subtotal: round2(unitPrice * quantity),
            isNonStocked: false
        };
    }
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

function sanitizeDiscountType(value, fallback = 'fixed') {
    return value === 'percentage' ? 'percentage' : (value === 'fixed' ? 'fixed' : fallback);
}

/**
 * Discount is either a flat currency amount or a percentage of the
 * subtotal, per discount_type — never both, never applied blindly as a
 * flat subtraction regardless of type (that was the pre-fix bug).
 */
function computeDiscountValue(subtotal, discountAmount, discountType) {
    return discountType === 'percentage'
        ? round2(subtotal * (round2(discountAmount) / 100))
        : round2(discountAmount);
}

/**
 * Recomputes subtotal from lines and re-derives discount/tax/final_amount.
 * `overrides` lets a caller change discount/tax settings in the same pass
 * (update()); omitted/undefined fields fall back to the currently stored
 * value, matching the previous single-field discountAmount behavior.
 */
async function recalcTotals(client, schema, quoteId, overrides = {}) {
    const linesRes = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS subtotal FROM ${schema}.quote_lines WHERE quote_id = $1`,
        [quoteId]
    );
    const subtotal = round2(linesRes.rows[0].subtotal);

    const quoteRes = await client.query(
        `SELECT discount_amount, discount_type, tax_enabled, tax_rate FROM ${schema}.quotes WHERE id = $1`,
        [quoteId]
    );
    const current = quoteRes.rows[0];

    const discountAmount = overrides.discountAmount !== undefined && overrides.discountAmount !== null
        ? round2(overrides.discountAmount)
        : round2(current.discount_amount);
    const discountType = overrides.discountType !== undefined && overrides.discountType !== null
        ? sanitizeDiscountType(overrides.discountType, current.discount_type)
        : current.discount_type;
    const taxEnabled = overrides.taxEnabled !== undefined && overrides.taxEnabled !== null
        ? Boolean(overrides.taxEnabled)
        : current.tax_enabled;
    const taxRate = overrides.taxRate !== undefined && overrides.taxRate !== null
        ? round2(overrides.taxRate)
        : round2(current.tax_rate);

    const discountValue = computeDiscountValue(subtotal, discountAmount, discountType);
    const afterDiscount = Math.max(0, round2(subtotal - discountValue));
    const taxAmount = taxEnabled ? round2(afterDiscount * (taxRate / 100)) : 0;
    const finalAmount = round2(afterDiscount + taxAmount);

    await client.query(
        `UPDATE ${schema}.quotes
         SET subtotal = $1, discount_amount = $2, discount_type = $3,
             tax_enabled = $4, tax_rate = $5, tax_amount = $6, final_amount = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [subtotal, discountAmount, discountType, taxEnabled, taxRate, taxAmount, finalAmount, quoteId]
    );
    return { subtotal, discountAmount, discountType, taxEnabled, taxRate, taxAmount, finalAmount };
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        await expireOverdueQuotes(schema);
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
        await expireOverdueQuotes(schema);
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

/**
 * GET /cotizaciones/quotes/:id/print
 */
exports.getPrintData = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        await expireOverdueQuotes(schema);

        const header = await db.query(
            `SELECT q.*,
                    c.first_name      AS customer_first_name,
                    c.last_name       AS customer_last_name,
                    c.document_type   AS customer_document_type,
                    c.document_number AS customer_document_number,
                    c.phone           AS customer_phone,
                    c.email           AS customer_email,
                    c.address         AS customer_address,
                    c.city            AS customer_city
             FROM ${schema}.quotes q
             LEFT JOIN ${schema}.customers c ON c.id = q.customer_id
             WHERE q.id = $1`,
            [req.params.id]
        );
        if (!header.rows.length) return res.status(404).json({ error: 'Cotización no encontrada' });
        const quoteRow = header.rows[0];

        const lines = await db.query(
            `SELECT ql.*, s.name AS supplier_name FROM ${schema}.quote_lines ql
             LEFT JOIN ${schema}.suppliers s ON s.id = ql.supplier_id
             WHERE ql.quote_id = $1 ORDER BY ql.id ASC`,
            [req.params.id]
        );

        const configResult = await db.query(`SELECT * FROM ${schema}.config_company LIMIT 1`);

        const customer = {
            first_name:      quoteRow.customer_first_name,
            last_name:       quoteRow.customer_last_name,
            document_type:   quoteRow.customer_document_type,
            document_number: quoteRow.customer_document_number,
            phone:           quoteRow.customer_phone,
            email:           quoteRow.customer_email,
            address:         quoteRow.customer_address,
            city:            quoteRow.customer_city,
        };

        res.json({
            data: {
                quote: quoteRow,
                lines: lines.rows,
                customer,
                config: configResult.rows[0] || {},
            }
        });
    } catch (err) {
        console.error('quotesController.getPrintData error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener datos de impresión' });
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
            `INSERT INTO ${schema}.quotes
             (quote_number, customer_id, valid_until, notes, discount_amount, discount_type, tax_enabled, tax_rate, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [quoteNumber, req.body.customer_id || null, req.body.valid_until || null, req.body.notes || null,
             req.body.discount_amount !== undefined ? round2(req.body.discount_amount) : 0,
             sanitizeDiscountType(req.body.discount_type),
             Boolean(req.body.tax_enabled),
             req.body.tax_rate !== undefined ? round2(req.body.tax_rate) : 19,
             req.user.id]
        );
        await recalcTotals(client, schema, result.rows[0].id);
        const created = await client.query(`SELECT * FROM ${schema}.quotes WHERE id = $1`, [result.rows[0].id]);
        await client.query('COMMIT');
        res.status(201).json(created.rows[0]);
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
        await recalcTotals(client, schema, quote.id, {
            discountAmount: req.body.discount_amount,
            discountType: req.body.discount_type,
            taxEnabled: req.body.tax_enabled,
            taxRate: req.body.tax_rate
        });
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

exports.revertToDraft = makeTransitionHandler('draft');

exports.expire = makeTransitionHandler('expire');

/**
 * POST /cotizaciones/quotes/:id/accept
 * Any unlocked status (draft/sent/rejected/expired) -> accepted, a
 * permanent lock — see TRANSITIONS/UNLOCKED_STATUSES above. Also creates
 * the treasury_documents row that becomes
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

        const discountTotal = computeDiscountValue(Number(quote.subtotal), Number(quote.discount_amount), quote.discount_type);
        const internalNumber = await getNextNumber(client, schema, companyId, 'sale_invoice');
        const docResult = await client.query(
            `INSERT INTO ${schema}.treasury_documents
             (tenant_id, document_type, direction, internal_number, counterparty_id, origin_core, origin_table, origin_id,
              issue_date, currency, subtotal, tax_total, discount_total, total_amount, balance_amount, status, created_by)
             VALUES ($1,'sale_invoice','receivable',$2,$3,'cotizaciones','quotes',$4,CURRENT_DATE,'CLP',$5,$6,$7,$8,$8,'open',$9)
             RETURNING id`,
            [companyId, internalNumber, req.body.counterparty_id, quote.id,
             Number(quote.subtotal), Number(quote.tax_amount), discountTotal, Number(quote.final_amount), req.user.id]
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
