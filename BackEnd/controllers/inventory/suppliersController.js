const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { normalizeCatalogText } = require('../../utils/normalizeText');

const FIELDS = [
    'name', 'document_type', 'document_number', 'phone', 'mobile', 'email', 'country',
    'region_state', 'city', 'commune_district', 'address', 'contact_name',
    'payment_term_days', 'notes'
];

function valuesFrom(body, normalizedName) {
    return [
        body.name.trim(), normalizedName, ...FIELDS.slice(1).map((field) =>
            field === 'payment_term_days' ? Number(body[field] || 0) : (body[field] || null)
        )
    ];
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status = 'active', q } = req.query;
        const params = [];
        const conditions = [];
        if (status !== 'all') { params.push(status); conditions.push(`status = $${params.length}`); }
        if (q) { params.push(`%${normalizeCatalogText(q)}%`); conditions.push(`normalized_name ILIKE $${params.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`SELECT * FROM ${schema}.suppliers ${where} ORDER BY name ASC`, params);
        res.json(result.rows);
    } catch (err) {
        console.error('suppliersController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar proveedores' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT * FROM ${schema}.suppliers WHERE id = $1`, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('suppliersController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener proveedor' });
    }
};

exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!req.body.name?.trim()) return res.status(400).json({ error: 'name es requerido' });
        const { schema } = await resolveSchema(req);
        const normalizedName = normalizeCatalogText(req.body.name);
        const existing = await db.query(`SELECT id FROM ${schema}.suppliers WHERE normalized_name = $1`, [normalizedName]);
        if (existing.rows.length) return res.status(409).json({ error: 'Ya existe un proveedor con ese nombre', id: existing.rows[0].id });
        const result = await db.query(
            `INSERT INTO ${schema}.suppliers (${['name', 'normalized_name', ...FIELDS.slice(1)].join(', ')})
             VALUES (${Array.from({ length: FIELDS.length + 1 }, (_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
            valuesFrom(req.body, normalizedName)
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('suppliersController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear proveedor' });
    }
};

exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!req.body.name?.trim()) return res.status(400).json({ error: 'name es requerido' });
        const { schema } = await resolveSchema(req);
        const normalizedName = normalizeCatalogText(req.body.name);
        const duplicate = await db.query(`SELECT id FROM ${schema}.suppliers WHERE normalized_name = $1 AND id <> $2`, [normalizedName, req.params.id]);
        if (duplicate.rows.length) return res.status(409).json({ error: 'Ya existe otro proveedor con ese nombre' });
        const fields = ['name', 'normalized_name', ...FIELDS.slice(1)];
        const sets = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const params = [...valuesFrom(req.body, normalizedName), req.params.id];
        const result = await db.query(`UPDATE ${schema}.suppliers SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`, params);
        if (!result.rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('suppliersController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar proveedor' });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ error: 'status debe ser active o inactive' });
        const { schema } = await resolveSchema(req);
        const result = await db.query(`UPDATE ${schema}.suppliers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [req.body.status, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('suppliersController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado del proveedor' });
    }
};
