const db = require('../../config/db');
const { resolveSchema }        = require('../../utils/tenantResolver');
const { normalizeCatalogText, normalizeSku } = require('../../utils/normalizeText');

function inventoryValues(body) {
    const boolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
    const numeric = (value, fallback = 0) => value === undefined || value === '' || value === null ? fallback : Number(value);
    const nullableNumeric = (value) => value === undefined || value === '' || value === null ? null : Number(value);
    return [
        boolean(body.inventory_enabled), boolean(body.track_serial), boolean(body.track_batch),
        boolean(body.allow_negative_stock), numeric(body.reorder_point), nullableNumeric(body.max_stock),
        nullableNumeric(body.preferred_supplier_id), body.purchase_unit || null, body.sale_unit || null,
        numeric(body.conversion_factor, 1), numeric(body.average_cost), numeric(body.last_purchase_cost),
        boolean(body.requires_expiration), body.storage_notes || null
    ];
}

/**
 * GET /garage/products
 * Query: ?q=, ?status=active|inactive|all, ?product_type=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, status = 'active', product_type, page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (product_type) {
            params.push(product_type);
            conditions.push(`product_type = $${params.length}`);
        }
        if (q) {
            params.push(`%${normalizeCatalogText(q)}%`);
            conditions.push(`normalized_name ILIKE $${params.length}`);
        }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT * FROM ${schema}.products ${where}
             ORDER BY name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(`SELECT COUNT(*) FROM ${schema}.products ${where}`, countParams);

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('productsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar productos' });
    }
};

/**
 * GET /garage/products/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT * FROM ${schema}.products WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('productsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener producto' });
    }
};

/**
 * POST /garage/products
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, sku, description, product_type = 'consumable', unit = 'unidad', reference_price = 0, currency = 'CLP' } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized = normalizeCatalogText(name);
        const normalizedSku = sku ? normalizeSku(sku) : null;

        const existing = await db.query(`SELECT id FROM ${schema}.products WHERE normalized_name = $1`, [normalized]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un producto con ese nombre', id: existing.rows[0].id });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.products (
                name, normalized_name, sku, description, product_type, unit, reference_price, currency,
                inventory_enabled, track_serial, track_batch, allow_negative_stock, reorder_point, max_stock,
                preferred_supplier_id, purchase_unit, sale_unit, conversion_factor, average_cost,
                last_purchase_cost, requires_expiration, storage_notes
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
            [name.trim(), normalized, normalizedSku, description || null, product_type, unit, Number(reference_price), currency, ...inventoryValues(req.body)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('productsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear producto' });
    }
};

/**
 * PUT /garage/products/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, sku, description, product_type, unit, reference_price, currency } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized    = normalizeCatalogText(name);
        const normalizedSku = sku ? normalizeSku(sku) : null;

        const dupCheck = await db.query(
            `SELECT id FROM ${schema}.products WHERE normalized_name = $1 AND id <> $2`,
            [normalized, req.params.id]
        );
        if (dupCheck.rows.length > 0) return res.status(409).json({ error: 'Ya existe otro producto con ese nombre' });

        const result = await db.query(
            `UPDATE ${schema}.products SET name=$1, normalized_name=$2, sku=$3, description=$4,
             product_type=$5, unit=$6, reference_price=$7, currency=$8,
             inventory_enabled=$9, track_serial=$10, track_batch=$11, allow_negative_stock=$12,
             reorder_point=$13, max_stock=$14, preferred_supplier_id=$15, purchase_unit=$16,
             sale_unit=$17, conversion_factor=$18, average_cost=$19, last_purchase_cost=$20,
             requires_expiration=$21, storage_notes=$22, updated_at=CURRENT_TIMESTAMP
             WHERE id=$23 RETURNING *`,
            [name.trim(), normalized, normalizedSku, description || null,
             product_type || 'consumable', unit || 'unidad', Number(reference_price || 0), currency || 'CLP',
             ...inventoryValues(req.body), req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('productsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar producto' });
    }
};

/**
 * PATCH /garage/products/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active o inactive' });

        const result = await db.query(
            `UPDATE ${schema}.products SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('productsController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};
