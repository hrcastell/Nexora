const { createCatalogController } = require('../../controllers/hr/catalogControllerFactory');

const base = createCatalogController('treasury_payment_terms', 'condición de pago');

function validateDetails(body, res) {
    if (!['cash', 'credit', 'installments'].includes(body.term_type)) {
        res.status(400).json({ error: 'term_type debe ser cash, credit o installments' });
        return false;
    }
    const numericFields = ['days_due', 'installments_count', 'grace_days'];
    if (numericFields.some((field) => Number(body[field] || 0) < 0)) {
        res.status(400).json({ error: 'Los valores numéricos no pueden ser negativos' });
        return false;
    }
    return true;
}

function paymentTermValues(body) {
    return [
        body.code.trim(), body.name.trim(), body.term_type,
        Number(body.days_due || 0), Number(body.installments_count || 1), Number(body.grace_days || 0)
    ];
}

async function save(req, res, isUpdate) {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!req.body.code?.trim() || !req.body.name?.trim()) return res.status(400).json({ error: 'code y name son requeridos' });
    if (!validateDetails(req.body, res)) return;
    const { schema } = await require('../../utils/tenantResolver').resolveSchema(req);
    const db = require('../../config/db');
    const values = paymentTermValues(req.body);
    const query = isUpdate
        ? `UPDATE ${schema}.treasury_payment_terms SET code = $1, name = $2, term_type = $3, days_due = $4, installments_count = $5, grace_days = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *`
        : `INSERT INTO ${schema}.treasury_payment_terms (code, name, term_type, days_due, installments_count, grace_days) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
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
