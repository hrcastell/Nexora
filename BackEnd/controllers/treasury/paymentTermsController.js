const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { createCatalogController } = require('../../controllers/hr/catalogControllerFactory');

const base = createCatalogController('treasury_payment_terms', 'condición de pago');
const NUMERIC_FIELDS = ['days_due', 'installments_count', 'grace_days'];

function integerValue(body, field, defaultValue) {
    const value = body[field] === undefined || body[field] === '' ? defaultValue : Number(body[field]);
    return Number.isInteger(value) && value >= 0 ? value : null;
}

function validateDetails(body, res) {
    if (!['cash', 'credit', 'installments'].includes(body.term_type)) {
        res.status(400).json({ error: 'term_type debe ser cash, credit o installments' });
        return false;
    }
    if (NUMERIC_FIELDS.some((field) => integerValue(body, field, field === 'installments_count' ? 1 : 0) === null)) {
        res.status(400).json({ error: 'days_due, installments_count y grace_days deben ser enteros no negativos' });
        return false;
    }
    return true;
}

function paymentTermValues(body, companyId) {
    return [
        companyId,
        body.code.trim(),
        body.name.trim(),
        body.term_type,
        integerValue(body, 'days_due', 0),
        integerValue(body, 'installments_count', 1),
        integerValue(body, 'grace_days', 0)
    ];
}

async function save(req, res, isUpdate) {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!req.body.code?.trim() || !req.body.name?.trim()) return res.status(400).json({ error: 'code y name son requeridos' });
    if (!validateDetails(req.body, res)) return;
    const { schema, companyId } = await resolveSchema(req);
    const values = paymentTermValues(req.body, companyId);
    const query = isUpdate
        ? `UPDATE ${schema}.treasury_payment_terms
              SET tenant_id = $1, code = $2, name = $3, term_type = $4, days_due = $5,
                  installments_count = $6, grace_days = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 RETURNING *`
        : `INSERT INTO ${schema}.treasury_payment_terms
              (tenant_id, code, name, term_type, days_due, installments_count, grace_days)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    try {
        const result = await db.query(query, isUpdate ? [...values, req.params.id] : values);
        if (!result.rows.length) return res.status(404).json({ error: 'Condición de pago no encontrada' });
        res.status(isUpdate ? 200 : 201).json(result.rows[0]);
    } catch (err) {
        console.error('paymentTermsController.save error:', err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una condición de pago con este código' });
        res.status(err.statusCode || 500).json({ error: err.message || `No fue posible ${isUpdate ? 'actualizar' : 'crear'} la condición de pago` });
    }
}

module.exports = { ...base, create: (req, res) => save(req, res, false), update: (req, res) => save(req, res, true) };
