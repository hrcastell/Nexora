const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const TYPES = ['customer', 'supplier', 'both'];
const STATUSES = ['active', 'inactive'];

function valuesFrom(body, companyId) {
    return [
        companyId,
        body.counterparty_type,
        body.customer_id || null,
        body.supplier_id || null,
        body.name_snapshot.trim(),
        body.document_type?.trim() || null,
        body.document_number?.trim() || null,
        body.phone?.trim() || null,
        body.email?.trim() || null
    ];
}

function validate(body, res) {
    if (!TYPES.includes(body.counterparty_type)) {
        res.status(400).json({ error: 'counterparty_type debe ser customer, supplier o both' });
        return false;
    }
    if (!body.name_snapshot?.trim()) {
        res.status(400).json({ error: 'name_snapshot es requerido' });
        return false;
    }
    return true;
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, type, status = 'active' } = req.query;
        const params = [];
        const conditions = [];
        if (type) {
            if (!TYPES.includes(type)) return res.status(400).json({ error: 'type debe ser customer, supplier o both' });
            params.push(type);
            conditions.push(`counterparty_type = $${params.length}`);
        }
        if (status !== 'all') {
            if (!STATUSES.includes(status)) return res.status(400).json({ error: 'status debe ser active, inactive o all' });
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (q?.trim()) {
            params.push(`%${q.trim()}%`);
            conditions.push(`(name_snapshot ILIKE $${params.length} OR document_number ILIKE $${params.length})`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`SELECT * FROM ${schema}.treasury_counterparties ${where} ORDER BY name_snapshot ASC`, params);
        res.json(result.rows);
    } catch (err) {
        console.error('counterpartiesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar las contrapartes' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT * FROM ${schema}.treasury_counterparties WHERE id = $1`, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Contraparte no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('counterpartiesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible obtener la contraparte' });
    }
};

exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!validate(req.body, res)) return;
        const { schema, companyId } = await resolveSchema(req);
        const values = valuesFrom(req.body, companyId);
        const result = await db.query(
            `INSERT INTO ${schema}.treasury_counterparties
                (tenant_id, counterparty_type, customer_id, supplier_id, name_snapshot, document_type, document_number, phone, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('counterpartiesController.create error:', err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una contraparte con ese número de documento' });
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible crear la contraparte' });
    }
};

exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!validate(req.body, res)) return;
        const { schema, companyId } = await resolveSchema(req);
        const values = valuesFrom(req.body, companyId);
        const result = await db.query(
            `UPDATE ${schema}.treasury_counterparties
                SET tenant_id = $1, counterparty_type = $2, customer_id = $3, supplier_id = $4,
                    name_snapshot = $5, document_type = $6, document_number = $7, phone = $8, email = $9,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $10 RETURNING *`,
            [...values, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Contraparte no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('counterpartiesController.update error:', err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una contraparte con ese número de documento' });
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible actualizar la contraparte' });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'status debe ser active o inactive' });
        const { schema } = await resolveSchema(req);
        const result = await db.query(`UPDATE ${schema}.treasury_counterparties SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [req.body.status, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Contraparte no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('counterpartiesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible cambiar el estado de la contraparte' });
    }
};
