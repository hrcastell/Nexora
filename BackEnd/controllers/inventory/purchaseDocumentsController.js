const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { allocateNumber } = require('../../services/inventory/sequenceService');

const DOCUMENT_TYPES = ['purchase_order', 'purchase_invoice'];
const EDITABLE_STATUSES = ['draft'];

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function validateHeader(body, res) {
    if (!DOCUMENT_TYPES.includes(body.document_type)) {
        res.status(400).json({ error: 'document_type inválido' });
        return false;
    }
    if (!body.supplier_id || !body.issue_date) {
        res.status(400).json({ error: 'supplier_id e issue_date son requeridos' });
        return false;
    }
    if (body.payment_condition && !['cash', 'credit'].includes(body.payment_condition)) {
        res.status(400).json({ error: 'payment_condition inválida' });
        return false;
    }
    return true;
}

async function buildLines(client, schema, lines) {
    if (!Array.isArray(lines) || !lines.length) {
        const error = new Error('El documento requiere al menos una línea');
        error.statusCode = 400;
        throw error;
    }
    const built = [];
    for (const line of lines) {
        const quantity = number(line.quantity, -1);
        const unitCost = number(line.unit_cost, -1);
        if (!line.product_id || quantity <= 0 || unitCost < 0) {
            const error = new Error('Cada línea requiere product_id, quantity > 0 y unit_cost >= 0');
            error.statusCode = 400;
            throw error;
        }
        const product = await client.query(
            `SELECT id, name, sku, unit, inventory_enabled FROM ${schema}.products WHERE id = $1`,
            [line.product_id]
        );
        if (!product.rows.length || !product.rows[0].inventory_enabled) {
            const error = new Error('El producto no existe o no tiene inventario habilitado');
            error.statusCode = 400;
            throw error;
        }
        const discount = number(line.discount_percent);
        const tax = number(line.tax_percent);
        const gross = quantity * unitCost;
        const lineTotal = line.line_total === undefined ? gross * (1 - discount / 100) * (1 + tax / 100) : number(line.line_total);
        built.push({
            productId: product.rows[0].id, productName: product.rows[0].name, sku: product.rows[0].sku,
            quantity, unit: line.unit || product.rows[0].unit, unitCost, discount, tax, lineTotal,
            notes: line.notes || null
        });
    }
    return built;
}

function totals(lines) {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
    const discountTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitCost * line.discount / 100), 0);
    const taxTotal = lines.reduce((sum, line) => sum + ((line.quantity * line.unitCost * (1 - line.discount / 100)) * line.tax / 100), 0);
    return { subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
}

async function insertLines(client, schema, documentId, lines) {
    for (const line of lines) {
        await client.query(
            `INSERT INTO ${schema}.purchase_document_lines
             (purchase_document_id, product_id, product_name_snapshot, sku_snapshot, quantity, pending_quantity,
              unit, unit_cost, discount_percent, tax_percent, line_total, notes)
             VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11)`,
            [documentId, line.productId, line.productName, line.sku, line.quantity, line.unit, line.unitCost,
             line.discount, line.tax, line.lineTotal, line.notes]
        );
    }
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status, supplier_id, document_type } = req.query;
        const params = [];
        const conditions = [];
        if (status) { params.push(status); conditions.push(`pd.status = $${params.length}`); }
        if (supplier_id) { params.push(supplier_id); conditions.push(`pd.supplier_id = $${params.length}`); }
        if (document_type) { params.push(document_type); conditions.push(`pd.document_type = $${params.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`SELECT pd.*, s.name AS supplier_name FROM ${schema}.purchase_documents pd JOIN ${schema}.suppliers s ON s.id = pd.supplier_id ${where} ORDER BY pd.created_at DESC`, params);
        res.json(result.rows);
    } catch (err) { res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar documentos de compra' }); }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const header = await db.query(`SELECT pd.*, s.name AS supplier_name FROM ${schema}.purchase_documents pd JOIN ${schema}.suppliers s ON s.id = pd.supplier_id WHERE pd.id = $1`, [req.params.id]);
        if (!header.rows.length) return res.status(404).json({ error: 'Documento de compra no encontrado' });
        const lines = await db.query(`SELECT * FROM ${schema}.purchase_document_lines WHERE purchase_document_id = $1 ORDER BY id`, [req.params.id]);
        res.json({ ...header.rows[0], lines: lines.rows });
    } catch (err) { res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener documento de compra' }); }
};

exports.create = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!validateHeader(req.body, res)) return;
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const lines = await buildLines(client, schema, req.body.lines);
        const calculated = totals(lines);
        const internalNumber = await allocateNumber(client, schema, req.body.document_type);
        const result = await client.query(
            `INSERT INTO ${schema}.purchase_documents
             (document_type, internal_number, supplier_document_number, supplier_id, issue_date, expected_reception_date,
              due_date, payment_condition, payment_term_days, currency, subtotal, discount_total, tax_total, total, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
            [req.body.document_type, internalNumber, req.body.supplier_document_number || null, req.body.supplier_id,
             req.body.issue_date, req.body.expected_reception_date || null, req.body.due_date || null,
             req.body.payment_condition || 'cash', number(req.body.payment_term_days), req.body.currency || 'CLP',
             calculated.subtotal, calculated.discountTotal, calculated.taxTotal, calculated.total, req.body.notes || null, req.user.id]
        );
        await insertLines(client, schema, result.rows[0].id, lines);
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) { await client.query('ROLLBACK'); res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear documento de compra' }); }
    finally { client.release(); }
};

exports.update = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!validateHeader(req.body, res)) return;
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        const locked = await client.query(`SELECT status FROM ${schema}.purchase_documents WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!locked.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Documento de compra no encontrado' }); }
        if (!EDITABLE_STATUSES.includes(locked.rows[0].status)) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Solo se pueden editar documentos draft' }); }
        const lines = await buildLines(client, schema, req.body.lines);
        const calculated = totals(lines);
        const result = await client.query(`UPDATE ${schema}.purchase_documents SET supplier_document_number=$1, supplier_id=$2, issue_date=$3, expected_reception_date=$4, due_date=$5, payment_condition=$6, payment_term_days=$7, currency=$8, subtotal=$9, discount_total=$10, tax_total=$11, total=$12, notes=$13, updated_at=NOW() WHERE id=$14 RETURNING *`, [req.body.supplier_document_number || null, req.body.supplier_id, req.body.issue_date, req.body.expected_reception_date || null, req.body.due_date || null, req.body.payment_condition || 'cash', number(req.body.payment_term_days), req.body.currency || 'CLP', calculated.subtotal, calculated.discountTotal, calculated.taxTotal, calculated.total, req.body.notes || null, req.params.id]);
        await client.query(`DELETE FROM ${schema}.purchase_document_lines WHERE purchase_document_id = $1`, [req.params.id]);
        await insertLines(client, schema, req.params.id, lines);
        await client.query('COMMIT'); res.json(result.rows[0]);
    } catch (err) { await client.query('ROLLBACK'); res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar documento de compra' }); }
    finally { client.release(); }
};

exports.changeStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { status } = req.body;
        const { schema } = await resolveSchema(req);
        const result = await db.query(`UPDATE ${schema}.purchase_documents SET status = $1, updated_at = NOW() WHERE id = $2 AND ((status = 'draft' AND $1 IN ('issued', 'cancelled')) OR (status = 'issued' AND $1 = 'cancelled')) RETURNING *`, [status, req.params.id]);
        if (!result.rows.length) return res.status(409).json({ error: 'Transición de estado no permitida' });
        res.json(result.rows[0]);
    } catch (err) { res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' }); }
};
