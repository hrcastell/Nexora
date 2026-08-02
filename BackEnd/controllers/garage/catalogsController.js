const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { normalizeCatalogText } = require('../../utils/normalizeText');

const VALID_CATALOG_TYPES = [
    'vehicle_types',
    'vehicle_body_types',
    'vehicle_brands',
    'vehicle_models',
    'vehicle_colors',
    'vehicle_transmissions',
    'vehicle_fuel_types',
    'product_types'
];

// Tables that hold a hard (ON DELETE RESTRICT) reference to a catalog row,
// keyed by catalog type. Checked before a hard delete so the DB never
// throws a raw FK-violation error — the caller gets a clear message
// instead. Catalog types not listed here have no known blocking reference.
const CATALOG_USAGE_CHECKS = {
    product_types: [{ table: 'products', column: 'product_type_id' }]
};

function validateType(type, res) {
    if (!VALID_CATALOG_TYPES.includes(type)) {
        res.status(400).json({ error: `Tipo de catálogo inválido: ${type}. Válidos: ${VALID_CATALOG_TYPES.join(', ')}` });
        return false;
    }
    return true;
}

/**
 * GET /garage/catalogs/:type
 * Lista todos los valores de un catálogo.
 * Query: ?status=active|inactive|all, ?q=busqueda, ?brand_id=N (solo para vehicle_models)
 */
exports.list = async (req, res) => {
    try {
        const { type } = req.params;
        if (!validateType(type, res)) return;

        const { schema } = await resolveSchema(req);
        const { status = 'active', q, brand_id } = req.query;

        let whereClause = '';
        const params = [];

        if (status !== 'all') {
            params.push(status);
            whereClause = `WHERE status = $${params.length}`;
        }

        if (q) {
            params.push(`%${normalizeCatalogText(q)}%`);
            const condition = `normalized_name ILIKE $${params.length}`;
            whereClause += whereClause ? ` AND ${condition}` : `WHERE ${condition}`;
        }

        if (type === 'vehicle_models' && brand_id) {
            params.push(brand_id);
            const condition = `brand_id = $${params.length}`;
            whereClause += whereClause ? ` AND ${condition}` : `WHERE ${condition}`;
        }

        const result = await db.query(
            `SELECT * FROM ${schema}.${type} ${whereClause} ORDER BY name ASC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('catalogsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar catálogo' });
    }
};

/**
 * POST /garage/catalogs/:type
 * Crea un nuevo valor en el catálogo con normalización y deduplicación.
 */
exports.create = async (req, res) => {
    try {
        const { type } = req.params;
        if (!validateType(type, res)) return;

        const { schema } = await resolveSchema(req);
        const { name, brand_id, hex_color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El campo name es requerido' });
        }

        const normalized = normalizeCatalogText(name);

        // Verificar duplicado
        let dupQuery, dupParams;
        if (type === 'vehicle_models' && brand_id) {
            dupQuery = `SELECT id FROM ${schema}.${type} WHERE normalized_name = $1 AND brand_id = $2`;
            dupParams = [normalized, brand_id];
        } else {
            dupQuery = `SELECT id FROM ${schema}.${type} WHERE normalized_name = $1`;
            dupParams = [normalized];
        }

        const existing = await db.query(dupQuery, dupParams);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un valor con ese nombre en el catálogo', id: existing.rows[0].id });
        }

        let insertQuery, insertParams;
        if (type === 'vehicle_models') {
            if (!brand_id) return res.status(400).json({ error: 'brand_id es requerido para vehicle_models' });
            insertQuery = `INSERT INTO ${schema}.${type} (name, normalized_name, brand_id) VALUES ($1, $2, $3) RETURNING *`;
            insertParams = [name.trim(), normalized, brand_id];
        } else if (type === 'vehicle_colors') {
            insertQuery = `INSERT INTO ${schema}.${type} (name, normalized_name, hex_color) VALUES ($1, $2, $3) RETURNING *`;
            insertParams = [name.trim(), normalized, hex_color || null];
        } else {
            insertQuery = `INSERT INTO ${schema}.${type} (name, normalized_name) VALUES ($1, $2) RETURNING *`;
            insertParams = [name.trim(), normalized];
        }

        const result = await db.query(insertQuery, insertParams);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('catalogsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear valor de catálogo' });
    }
};

/**
 * PUT /garage/catalogs/:type/:id
 * Actualiza el nombre de un valor del catálogo.
 */
exports.update = async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!validateType(type, res)) return;

        const { schema } = await resolveSchema(req);
        const { name, hex_color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El campo name es requerido' });
        }

        const normalized = normalizeCatalogText(name);

        // Verificar duplicado excluyendo el propio registro
        const dupCheck = await db.query(
            `SELECT id FROM ${schema}.${type} WHERE normalized_name = $1 AND id <> $2`,
            [normalized, id]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe otro valor con ese nombre en el catálogo' });
        }

        let updateQuery = `UPDATE ${schema}.${type} SET name = $1, normalized_name = $2, updated_at = CURRENT_TIMESTAMP`;
        const params = [name.trim(), normalized];

        if (type === 'vehicle_colors' && hex_color !== undefined) {
            params.push(hex_color);
            updateQuery += `, hex_color = $${params.length}`;
        }

        params.push(id);
        updateQuery += ` WHERE id = $${params.length} RETURNING *`;

        const result = await db.query(updateQuery, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Valor no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('catalogsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar catálogo' });
    }
};

/**
 * PATCH /garage/catalogs/:type/:id/status
 * Activa o desactiva un valor del catálogo.
 */
exports.toggleStatus = async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!validateType(type, res)) return;

        const { schema } = await resolveSchema(req);
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'status debe ser active o inactive' });
        }

        const result = await db.query(
            `UPDATE ${schema}.${type} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Valor no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('catalogsController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

/**
 * DELETE /garage/catalogs/:type/:id
 * Hard-deletes a catalog value, after checking it isn't referenced by any
 * row listed in CATALOG_USAGE_CHECKS for this type.
 */
exports.remove = async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!validateType(type, res)) return;
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);

        const checks = CATALOG_USAGE_CHECKS[type] || [];
        for (const check of checks) {
            const inUse = await db.query(
                `SELECT 1 FROM ${schema}.${check.table} WHERE ${check.column} = $1 LIMIT 1`,
                [id]
            );
            if (inUse.rows.length > 0) {
                return res.status(409).json({ error: 'Este valor está en uso y no puede eliminarse' });
            }
        }

        const result = await db.query(`DELETE FROM ${schema}.${type} WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Valor no encontrado' });

        res.json({ message: 'Valor eliminado' });
    } catch (err) {
        console.error('catalogsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar valor de catálogo' });
    }
};
