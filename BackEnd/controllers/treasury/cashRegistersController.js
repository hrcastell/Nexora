const { createCatalogController } = require('../../controllers/hr/catalogControllerFactory');

const base = createCatalogController('treasury_cash_registers', 'caja');

async function save(req, res, isUpdate) {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    if (!req.body.code?.trim() || !req.body.name?.trim()) return res.status(400).json({ error: 'code y name son requeridos' });
    const { schema, companyId } = await require('../../utils/tenantResolver').resolveSchema(req);
    const db = require('../../config/db');
    const values = [companyId, req.body.code.trim(), req.body.name.trim(), req.body.location?.trim() || null];
    const query = isUpdate
        ? `UPDATE ${schema}.treasury_cash_registers SET tenant_id = $1, code = $2, name = $3, location = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`
        : `INSERT INTO ${schema}.treasury_cash_registers (tenant_id, code, name, location) VALUES ($1, $2, $3, $4) RETURNING *`;
    try {
        const result = await db.query(query, isUpdate ? [...values, req.params.id] : values);
        if (!result.rows.length) return res.status(404).json({ error: 'Caja no encontrada' });
        res.status(isUpdate ? 200 : 201).json(result.rows[0]);
    } catch (err) {
        console.error('cashRegistersController.save error:', err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una caja con este código' });
        res.status(err.statusCode || 500).json({ error: err.message || `No fue posible ${isUpdate ? 'actualizar' : 'crear'} la caja` });
    }
}

module.exports = { ...base, create: (req, res) => save(req, res, false), update: (req, res) => save(req, res, true) };
