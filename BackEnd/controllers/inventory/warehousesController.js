const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const FIELDS = ['code', 'name', 'warehouse_type', 'country', 'region_state', 'city', 'commune_district', 'address', 'manager_name', 'phone', 'notes'];
const VALID_TYPES = ['main', 'store', 'transit', 'external'];

function valuesFrom(body) {
    return FIELDS.map((field) => {
        if (field === 'code' || field === 'name') return body[field].trim();
        if (field === 'warehouse_type') return body[field] || 'main';
        return body[field] || null;
    });
}

function validate(body, res) {
    if (!body.code?.trim() || !body.name?.trim()) { res.status(400).json({ error: 'code y name son requeridos' }); return false; }
    if (body.warehouse_type && !VALID_TYPES.includes(body.warehouse_type)) { res.status(400).json({ error: 'warehouse_type inválido' }); return false; }
    return true;
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status = 'active', q } = req.query;
        const params = [];
        const conditions = [];
        if (status !== 'all') { params.push(status); conditions.push(`status = $${params.length}`); }
        if (q) { params.push(`%${q.trim()}%`); conditions.push(`(code ILIKE $${params.length} OR name ILIKE $${params.length})`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`SELECT * FROM ${schema}.warehouses ${where} ORDER BY name ASC`, params);
        res.json(result.rows);
    } catch (err) {
        console.error('warehousesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar bodegas' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT * FROM ${schema}.warehouses WHERE id = $1`, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('warehousesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener bodega' });
    }
};

exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!validate(req.body, res)) return;
        const { schema } = await resolveSchema(req);
        const code = req.body.code.trim();
        const duplicate = await db.query(`SELECT id FROM ${schema}.warehouses WHERE code = $1`, [code]);
        if (duplicate.rows.length) return res.status(409).json({ error: 'Ya existe una bodega con ese código', id: duplicate.rows[0].id });
        const result = await db.query(`INSERT INTO ${schema}.warehouses (${FIELDS.join(', ')}) VALUES (${FIELDS.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, valuesFrom(req.body));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('warehousesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear bodega' });
    }
};

exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!validate(req.body, res)) return;
        const { schema } = await resolveSchema(req);
        const code = req.body.code.trim();
        const duplicate = await db.query(`SELECT id FROM ${schema}.warehouses WHERE code = $1 AND id <> $2`, [code, req.params.id]);
        if (duplicate.rows.length) return res.status(409).json({ error: 'Ya existe otra bodega con ese código' });
        const params = [...valuesFrom(req.body), req.params.id];
        const sets = FIELDS.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const result = await db.query(`UPDATE ${schema}.warehouses SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`, params);
        if (!result.rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('warehousesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar bodega' });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ error: 'status debe ser active o inactive' });
        const { schema } = await resolveSchema(req);
        const result = await db.query(`UPDATE ${schema}.warehouses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [req.body.status, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('warehousesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado de la bodega' });
    }
};
