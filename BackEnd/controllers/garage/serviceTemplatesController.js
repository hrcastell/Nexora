const db = require('../../config/db');
const { resolveSchema }      = require('../../utils/tenantResolver');
const { normalizeCatalogText } = require('../../utils/normalizeText');

/**
 * GET /garage/service-templates
 * Query: ?q=, ?status=active|inactive|all, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, status = 'active', page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') { params.push(status); conditions.push(`status = $${params.length}`); }
        if (q) { params.push(`%${normalizeCatalogText(q)}%`); conditions.push(`normalized_name ILIKE $${params.length}`); }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT * FROM ${schema}.service_templates ${where}
             ORDER BY name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );
        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(`SELECT COUNT(*) FROM ${schema}.service_templates ${where}`, countParams);
        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('serviceTemplatesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar servicios' });
    }
};

/**
 * GET /garage/service-templates/:id
 * Incluye los productos asociados.
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const tmpl = await db.query(`SELECT * FROM ${schema}.service_templates WHERE id = $1`, [req.params.id]);
        if (tmpl.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });

        const products = await db.query(
            `SELECT stp.*, p.name AS product_name, p.unit AS product_unit
             FROM ${schema}.service_template_products stp
             JOIN ${schema}.products p ON p.id = stp.product_id
             WHERE stp.service_template_id = $1
             ORDER BY stp.id ASC`,
            [req.params.id]
        );

        res.json({ ...tmpl.rows[0], products: products.rows });
    } catch (err) {
        console.error('serviceTemplatesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener servicio' });
    }
};

/**
 * POST /garage/service-templates
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { name, description, estimated_hours = 0, suggested_role, suggested_specialty, base_labor_rate, currency = 'CLP' } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized = normalizeCatalogText(name);
        const existing = await db.query(`SELECT id FROM ${schema}.service_templates WHERE normalized_name = $1`, [normalized]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Ya existe un servicio con ese nombre', id: existing.rows[0].id });

        const result = await db.query(
            `INSERT INTO ${schema}.service_templates (name, normalized_name, description, estimated_hours, suggested_role, suggested_specialty, base_labor_rate, currency)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [name.trim(), normalized, description || null, Number(estimated_hours), suggested_role || null, suggested_specialty || null, base_labor_rate ? Number(base_labor_rate) : null, currency]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('serviceTemplatesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear servicio' });
    }
};

/**
 * PUT /garage/service-templates/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { name, description, estimated_hours, suggested_role, suggested_specialty, base_labor_rate, currency } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });
        const normalized = normalizeCatalogText(name);

        const dupCheck = await db.query(`SELECT id FROM ${schema}.service_templates WHERE normalized_name = $1 AND id <> $2`, [normalized, req.params.id]);
        if (dupCheck.rows.length > 0) return res.status(409).json({ error: 'Ya existe otro servicio con ese nombre' });

        const result = await db.query(
            `UPDATE ${schema}.service_templates SET name=$1, normalized_name=$2, description=$3, estimated_hours=$4,
             suggested_role=$5, suggested_specialty=$6, base_labor_rate=$7, currency=$8, updated_at=CURRENT_TIMESTAMP
             WHERE id=$9 RETURNING *`,
            [name.trim(), normalized, description || null, Number(estimated_hours || 0), suggested_role || null,
             suggested_specialty || null, base_labor_rate ? Number(base_labor_rate) : null, currency || 'CLP', req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('serviceTemplatesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar servicio' });
    }
};

/**
 * PATCH /garage/service-templates/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active o inactive' });

        const result = await db.query(
            `UPDATE ${schema}.service_templates SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('serviceTemplatesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

// ─── PRODUCTOS DE PLANTILLA ───────────────────────────────────

/**
 * POST /garage/service-templates/:id/products
 */
exports.addProduct = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { product_id, quantity = 1, unit, reference_unit_price = 0 } = req.body;

        if (!product_id) return res.status(400).json({ error: 'product_id es requerido' });

        const tmplCheck = await db.query(`SELECT id FROM ${schema}.service_templates WHERE id = $1`, [req.params.id]);
        if (tmplCheck.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });

        const prodCheck = await db.query(`SELECT id, unit FROM ${schema}.products WHERE id = $1`, [product_id]);
        if (prodCheck.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        const result = await db.query(
            `INSERT INTO ${schema}.service_template_products (service_template_id, product_id, quantity, unit, reference_unit_price)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [req.params.id, product_id, Number(quantity), unit || prodCheck.rows[0].unit || null, Number(reference_unit_price)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('serviceTemplatesController.addProduct error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar producto al servicio' });
    }
};

/**
 * DELETE /garage/service-templates/:id/products/:productId
 */
exports.removeProduct = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const result = await db.query(
            `DELETE FROM ${schema}.service_template_products WHERE id = $1 AND service_template_id = $2 RETURNING id`,
            [req.params.productId, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado en el servicio' });
        res.json({ message: 'Producto eliminado del servicio' });
    } catch (err) {
        console.error('serviceTemplatesController.removeProduct error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar producto del servicio' });
    }
};
