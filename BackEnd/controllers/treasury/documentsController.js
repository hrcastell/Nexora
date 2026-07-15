const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { getNextNumber } = require('../../services/treasury/sequenceService');

const DIRECTIONS = ['receivable', 'payable'];
const DOCUMENT_TYPES = ['sale_invoice', 'sale_note', 'purchase_invoice', 'debit_note', 'credit_note', 'installment_plan', 'internal_charge'];
const EDITABLE_FIELDS = ['external_number', 'counterparty_id', 'issue_date', 'due_date', 'currency'];

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function amount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function directionFor(req) {
    const direction = req.treasuryDirection || req.query.direction;
    if (!DIRECTIONS.includes(direction)) throw createError('direction debe ser receivable o payable', 400);
    return direction;
}

function requireWritable(req, res) {
    if (req.user && req.user.read_only) {
        res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        return false;
    }
    return true;
}

function validateCreate(body, direction) {
    if (!DOCUMENT_TYPES.includes(body.document_type)) throw createError('document_type inválido', 400);
    if (!isPositiveInteger(body.counterparty_id)) throw createError('counterparty_id debe ser un entero positivo', 400);
    if (!body.issue_date) throw createError('issue_date es requerido', 400);
    const totalAmount = amount(body.total_amount);
    if (totalAmount === null || totalAmount <= 0) throw createError('total_amount debe ser mayor que cero', 400);
    if (body.direction && body.direction !== direction) throw createError('La dirección del documento no coincide con la ruta', 400);
    if (body.origin_core || body.origin_table || body.origin_id) throw createError('Solo se permite la carga manual de documentos en esta etapa', 400);
    return totalAmount;
}

function validateLine(body) {
    if (!body.description || !body.description.trim()) throw createError('description es requerida', 400);
    const quantity = amount(body.quantity);
    const unitPrice = amount(body.unit_price);
    const lineTotal = amount(body.line_total);
    if (quantity === null || quantity <= 0 || unitPrice === null || lineTotal === null) {
        throw createError('quantity, unit_price y line_total deben ser valores válidos', 400);
    }
    return { quantity, unitPrice, lineTotal };
}

function validateInstallment(body) {
    if (!isPositiveInteger(body.installment_number)) throw createError('installment_number debe ser un entero positivo', 400);
    const installmentAmount = amount(body.amount);
    if (installmentAmount === null || installmentAmount <= 0) throw createError('amount debe ser mayor que cero', 400);
    if (!body.due_date) throw createError('due_date es requerida', 400);
    return installmentAmount;
}

async function findDocument(client, schema, id, direction, lock) {
    const result = await client.query(
        `SELECT * FROM ${schema}.treasury_documents
         WHERE id = $1 AND direction = $2${lock ? ' FOR UPDATE' : ''}`,
        [id, direction]
    );
    if (!result.rows.length) throw createError('Documento financiero no encontrado', 404);
    return result.rows[0];
}

exports.list = async (req, res) => {
    try {
        const direction = directionFor(req);
        const { schema } = await resolveSchema(req);
        const { status, counterparty_id, q } = req.query;
        const params = [direction];
        const conditions = ['d.direction = $1'];
        if (status) {
            params.push(status);
            conditions.push(`d.status = $${params.length}`);
        }
        if (counterparty_id) {
            if (!isPositiveInteger(counterparty_id)) return res.status(400).json({ error: 'counterparty_id debe ser un entero positivo' });
            params.push(counterparty_id);
            conditions.push(`d.counterparty_id = $${params.length}`);
        }
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            conditions.push(`(d.internal_number ILIKE $${params.length} OR d.external_number ILIKE $${params.length} OR c.name_snapshot ILIKE $${params.length})`);
        }
        const result = await db.query(
            `SELECT d.*, c.name_snapshot AS counterparty_name
             FROM ${schema}.treasury_documents d
             JOIN ${schema}.treasury_counterparties c ON c.id = d.counterparty_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY d.issue_date DESC, d.id DESC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('documentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar los documentos financieros' });
    }
};

exports.getById = async (req, res) => {
    try {
        const direction = directionFor(req);
        const { schema } = await resolveSchema(req);
        const header = await db.query(
            `SELECT d.*, c.name_snapshot AS counterparty_name
             FROM ${schema}.treasury_documents d
             JOIN ${schema}.treasury_counterparties c ON c.id = d.counterparty_id
             WHERE d.id = $1 AND d.direction = $2`,
            [req.params.id, direction]
        );
        if (!header.rows.length) return res.status(404).json({ error: 'Documento financiero no encontrado' });
        const [lines, installments] = await Promise.all([
            db.query(`SELECT * FROM ${schema}.treasury_document_lines WHERE treasury_document_id = $1 ORDER BY line_number ASC, id ASC`, [req.params.id]),
            db.query(`SELECT * FROM ${schema}.treasury_installments WHERE treasury_document_id = $1 ORDER BY installment_number ASC, id ASC`, [req.params.id])
        ]);
        res.json({ ...header.rows[0], lines: lines.rows, installments: installments.rows });
    } catch (err) {
        console.error('documentsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible obtener el documento financiero' });
    }
};

exports.create = async (req, res) => {
    if (!requireWritable(req, res)) return;
    const client = await db.getClient();
    try {
        const direction = directionFor(req);
        const totalAmount = validateCreate(req.body, direction);
        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        const counterparty = await client.query(`SELECT id FROM ${schema}.treasury_counterparties WHERE id = $1 AND status = 'active'`, [req.body.counterparty_id]);
        if (!counterparty.rows.length) throw createError('Contraparte activa no encontrada', 404);
        const internalNumber = await getNextNumber(client, schema, companyId, req.body.document_type);
        const result = await client.query(
            `INSERT INTO ${schema}.treasury_documents
             (tenant_id, document_type, direction, internal_number, external_number, counterparty_id,
              issue_date, due_date, currency, subtotal, tax_total, discount_total, total_amount, balance_amount, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, 'open', $14)
             RETURNING *`,
            [companyId, req.body.document_type, direction, internalNumber, req.body.external_number || null,
                req.body.counterparty_id, req.body.issue_date, req.body.due_date || null, req.body.currency || 'CLP',
                amount(req.body.subtotal) || 0, amount(req.body.tax_total) || 0, amount(req.body.discount_total) || 0,
                totalAmount, req.user.id]
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('documentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible crear el documento financiero' });
    } finally {
        client.release();
    }
};

exports.update = async (req, res) => {
    if (!requireWritable(req, res)) return;
    const client = await db.getClient();
    try {
        const direction = directionFor(req);
        if (Object.prototype.hasOwnProperty.call(req.body, 'total_amount')) throw createError('total_amount es inmutable después de crear el documento', 400);
        if (Object.prototype.hasOwnProperty.call(req.body, 'balance_amount') || Object.prototype.hasOwnProperty.call(req.body, 'status')) {
            throw createError('balance_amount y status solo pueden cambiar mediante aplicaciones', 400);
        }
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');
        await findDocument(client, schema, req.params.id, direction, true);
        const fields = EDITABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
        if (!fields.length) throw createError('No se enviaron campos editables para actualizar', 400);
        if (fields.includes('counterparty_id') && !isPositiveInteger(req.body.counterparty_id)) throw createError('counterparty_id debe ser un entero positivo', 400);
        if (fields.includes('counterparty_id')) {
            const counterparty = await client.query(`SELECT id FROM ${schema}.treasury_counterparties WHERE id = $1 AND status = 'active'`, [req.body.counterparty_id]);
            if (!counterparty.rows.length) throw createError('Contraparte activa no encontrada', 404);
        }
        const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
        const values = fields.map((field) => req.body[field] || null);
        values.push(req.params.id, direction);
        const result = await client.query(
            `UPDATE ${schema}.treasury_documents
             SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${values.length - 1} AND direction = $${values.length}
             RETURNING *`,
            values
        );
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('documentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible actualizar el documento financiero' });
    } finally {
        client.release();
    }
};

exports.listLines = async (req, res) => {
    try {
        const direction = directionFor(req);
        const { schema } = await resolveSchema(req);
        const document = await db.query(`SELECT id FROM ${schema}.treasury_documents WHERE id = $1 AND direction = $2`, [req.params.id, direction]);
        if (!document.rows.length) return res.status(404).json({ error: 'Documento financiero no encontrado' });
        const result = await db.query(`SELECT * FROM ${schema}.treasury_document_lines WHERE treasury_document_id = $1 ORDER BY line_number ASC, id ASC`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('documentsController.listLines error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar las líneas del documento' });
    }
};

exports.createLine = async (req, res) => {
    if (!requireWritable(req, res)) return;
    const client = await db.getClient();
    try {
        const direction = directionFor(req);
        const line = validateLine(req.body);
        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        await findDocument(client, schema, req.params.id, direction, true);
        const lineNumber = isPositiveInteger(req.body.line_number) ? Number(req.body.line_number) : null;
        const result = await client.query(
            `INSERT INTO ${schema}.treasury_document_lines
             (tenant_id, treasury_document_id, line_number, description, quantity, unit_price, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [companyId, req.params.id, lineNumber, req.body.description.trim(), line.quantity, line.unitPrice, line.lineTotal]
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('documentsController.createLine error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible crear la línea del documento' });
    } finally {
        client.release();
    }
};

exports.listInstallments = async (req, res) => {
    try {
        const direction = directionFor(req);
        const { schema } = await resolveSchema(req);
        const document = await db.query(`SELECT id FROM ${schema}.treasury_documents WHERE id = $1 AND direction = $2`, [req.params.id, direction]);
        if (!document.rows.length) return res.status(404).json({ error: 'Documento financiero no encontrado' });
        const result = await db.query(`SELECT * FROM ${schema}.treasury_installments WHERE treasury_document_id = $1 ORDER BY installment_number ASC, id ASC`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('documentsController.listInstallments error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar las cuotas del documento' });
    }
};

exports.createInstallment = async (req, res) => {
    if (!requireWritable(req, res)) return;
    const client = await db.getClient();
    try {
        const direction = directionFor(req);
        const installmentAmount = validateInstallment(req.body);
        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        const document = await findDocument(client, schema, req.params.id, direction, true);
        const totals = await client.query(
            `SELECT COALESCE(SUM(amount), 0) AS planned_amount
             FROM ${schema}.treasury_installments WHERE treasury_document_id = $1`,
            [document.id]
        );
        if (Number(totals.rows[0].planned_amount) + installmentAmount > Number(document.total_amount)) {
            throw createError('Las cuotas no pueden superar el total del documento', 400);
        }
        const result = await client.query(
            `INSERT INTO ${schema}.treasury_installments
             (tenant_id, treasury_document_id, installment_number, due_date, amount, balance_amount, status)
             VALUES ($1, $2, $3, $4, $5, $5, 'pending') RETURNING *`,
            [companyId, document.id, req.body.installment_number, req.body.due_date, installmentAmount]
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('documentsController.createInstallment error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible crear la cuota del documento' });
    } finally {
        client.release();
    }
};
