const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { normalizeCatalogText } = require('../../utils/normalizeText');

/**
 * GET /garage/product-price-levels
 * Query: ?status=active|inactive|all
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status = 'active' } = req.query;

        const params = [];
        let where = '';
        if (status !== 'all') {
            params.push(status);
            where = `WHERE status = $${params.length}`;
        }

        const result = await db.query(
            `SELECT * FROM ${schema}.product_price_levels ${where} ORDER BY display_order ASC, name ASC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('productPriceLevelsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar niveles de precio' });
    }
};

/**
 * POST /garage/product-price-levels
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, default_margin_pct = 0, display_order = 0 } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized = normalizeCatalogText(name);
        const existing = await db.query(`SELECT id FROM ${schema}.product_price_levels WHERE normalized_name = $1`, [normalized]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un nivel de precio con ese nombre', id: existing.rows[0].id });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.product_price_levels (name, normalized_name, default_margin_pct, display_order)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name.trim(), normalized, Number(default_margin_pct) || 0, Number(display_order) || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('productPriceLevelsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear nivel de precio' });
    }
};

/**
 * PUT /garage/product-price-levels/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, default_margin_pct, display_order } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized = normalizeCatalogText(name);
        const dupCheck = await db.query(
            `SELECT id FROM ${schema}.product_price_levels WHERE normalized_name = $1 AND id <> $2`,
            [normalized, req.params.id]
        );
        if (dupCheck.rows.length > 0) return res.status(409).json({ error: 'Ya existe otro nivel de precio con ese nombre' });

        const result = await db.query(
            `UPDATE ${schema}.product_price_levels
             SET name = $1, normalized_name = $2, default_margin_pct = $3, display_order = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [name.trim(), normalized, Number(default_margin_pct) || 0, Number(display_order) || 0, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nivel de precio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('productPriceLevelsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar nivel de precio' });
    }
};

/**
 * PATCH /garage/product-price-levels/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active o inactive' });

        const result = await db.query(
            `UPDATE ${schema}.product_price_levels SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nivel de precio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('productPriceLevelsController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};
