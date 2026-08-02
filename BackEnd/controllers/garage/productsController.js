const db = require('../../config/db');
const { resolveSchema }        = require('../../utils/tenantResolver');
const { normalizeCatalogText, normalizeSku } = require('../../utils/normalizeText');
const { isModuleActive } = require('../../utils/moduleState');

// Field Write-Authority (spec: Field Write-Authority domain; design §2, ADR-2).
// Cost/purchase-derived fields are LOCKED once Inventory is active for the
// company — only a confirmed stock receipt (stockReceiptsController.confirm)
// may change them. When Inventory is NOT active, Garage keeps free write
// access to ALL fields including these (cost-visibility exception, spec
// scenario "Garage edits cost field while Inventory inactive").
const LOCKED_INVENTORY_FIELDS = ['average_cost', 'last_purchase_cost', 'inventory_enabled'];

/**
 * Returns the offending locked field names present in the request body when
 * Inventory is active, or null when the write is allowed.
 */
function lockedFieldsOffending(body, invActive) {
    if (!invActive) return null;
    const offending = LOCKED_INVENTORY_FIELDS.filter((field) => field in body);
    return offending.length ? offending : null;
}

/**
 * Resolves the 14 inventory-block column values in the exact order consumed
 * by the INSERT/UPDATE statements below (inventory_enabled, track_serial,
 * track_batch, allow_negative_stock, reorder_point, max_stock,
 * preferred_supplier_id, purchase_unit, sale_unit, conversion_factor,
 * average_cost, last_purchase_cost, requires_expiration, storage_notes).
 *
 * When Inventory is active, the 3 LOCKED fields are never derived from
 * `body` (their presence there was already rejected upstream by
 * lockedFieldsOffending) — instead they preserve `current` (the existing row
 * value on update, or the safe default on create). This matters: without it,
 * a PUT payload that simply omits `average_cost` would silently reset it to
 * 0 on every save, defeating the lock the moment Inventory is enabled.
 */
function resolveInventoryValues(body, { invActive, current = null }) {
    const boolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
    const numeric = (value, fallback = 0) => value === undefined || value === '' || value === null ? fallback : Number(value);
    const nullableNumeric = (value) => value === undefined || value === '' || value === null ? null : Number(value);

    const inventoryEnabled = invActive ? (current ? current.inventory_enabled === true : false) : boolean(body.inventory_enabled);
    const averageCost      = invActive ? (current ? Number(current.average_cost) : 0) : numeric(body.average_cost);
    const lastPurchaseCost = invActive ? (current ? Number(current.last_purchase_cost) : 0) : numeric(body.last_purchase_cost);

    return [
        inventoryEnabled, boolean(body.track_serial), boolean(body.track_batch),
        boolean(body.allow_negative_stock), numeric(body.reorder_point), nullableNumeric(body.max_stock),
        nullableNumeric(body.preferred_supplier_id), body.purchase_unit || null, body.sale_unit || null,
        numeric(body.conversion_factor, 1), averageCost, lastPurchaseCost,
        boolean(body.requires_expiration), body.storage_notes || null
    ];
}

/**
 * Resolves the product_type_id to persist: the given value when present,
 * otherwise the schema's 'Consumible' catalog row — preserves the old
 * DEFAULT 'consumable' behavior now that the column is a real FK instead
 * of a free-text default.
 */
async function resolveProductTypeId(schema, value) {
    if (value !== undefined && value !== null && value !== '') return Number(value);
    const consumible = await db.query(
        `SELECT id FROM ${schema}.product_types WHERE normalized_name = 'consumible' LIMIT 1`
    );
    return consumible.rows[0]?.id ?? null;
}

/**
 * GET /garage/products
 * Query: ?q=, ?status=active|inactive|all, ?product_type_id=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, status = 'active', product_type_id, page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            params.push(status);
            conditions.push(`p.status = $${params.length}`);
        }
        if (product_type_id) {
            params.push(product_type_id);
            conditions.push(`p.product_type_id = $${params.length}`);
        }
        if (q) {
            params.push(`%${normalizeCatalogText(q)}%`);
            conditions.push(`p.normalized_name ILIKE $${params.length}`);
        }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT p.*, pt.name AS product_type_name
             FROM ${schema}.products p
             LEFT JOIN ${schema}.product_types pt ON pt.id = p.product_type_id
             ${where}
             ORDER BY p.name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(`SELECT COUNT(*) FROM ${schema}.products p ${where}`, countParams);

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
        const result = await db.query(
            `SELECT p.*, pt.name AS product_type_name
             FROM ${schema}.products p
             LEFT JOIN ${schema}.product_types pt ON pt.id = p.product_type_id
             WHERE p.id = $1`,
            [req.params.id]
        );
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

        const { schema, companyId } = await resolveSchema(req);
        const invActive = await isModuleActive(companyId, 'inventory');
        const offending = lockedFieldsOffending(req.body, invActive);
        if (offending) {
            return res.status(422).json({
                error: 'Campos gestionados por Inventario. Solo cambian mediante una recepción de stock confirmada.',
                fields: offending
            });
        }

        const { name, sku, description, product_type_id, unit = 'unidad', reference_price = 0, currency = 'CLP' } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized = normalizeCatalogText(name);
        const normalizedSku = sku ? normalizeSku(sku) : null;
        const resolvedTypeId = await resolveProductTypeId(schema, product_type_id);

        const existing = await db.query(`SELECT id FROM ${schema}.products WHERE normalized_name = $1`, [normalized]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un producto con ese nombre', id: existing.rows[0].id });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.products (
                name, normalized_name, sku, description, product_type_id, unit, reference_price, currency,
                inventory_enabled, track_serial, track_batch, allow_negative_stock, reorder_point, max_stock,
                preferred_supplier_id, purchase_unit, sale_unit, conversion_factor, average_cost,
                last_purchase_cost, requires_expiration, storage_notes
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
            [name.trim(), normalized, normalizedSku, description || null, resolvedTypeId, unit, Number(reference_price), currency,
             ...resolveInventoryValues(req.body, { invActive, current: null })]
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

        const { schema, companyId } = await resolveSchema(req);
        const invActive = await isModuleActive(companyId, 'inventory');
        const offending = lockedFieldsOffending(req.body, invActive);
        if (offending) {
            return res.status(422).json({
                error: 'Campos gestionados por Inventario. Solo cambian mediante una recepción de stock confirmada.',
                fields: offending
            });
        }

        const { name, sku, description, product_type_id, unit, reference_price, currency } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        const normalized    = normalizeCatalogText(name);
        const normalizedSku = sku ? normalizeSku(sku) : null;
        const resolvedTypeId = await resolveProductTypeId(schema, product_type_id);

        const dupCheck = await db.query(
            `SELECT id FROM ${schema}.products WHERE normalized_name = $1 AND id <> $2`,
            [normalized, req.params.id]
        );
        if (dupCheck.rows.length > 0) return res.status(409).json({ error: 'Ya existe otro producto con ese nombre' });

        let current = null;
        if (invActive) {
            const currentRes = await db.query(
                `SELECT inventory_enabled, average_cost, last_purchase_cost FROM ${schema}.products WHERE id = $1`,
                [req.params.id]
            );
            if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
            current = currentRes.rows[0];
        }

        const result = await db.query(
            `UPDATE ${schema}.products SET name=$1, normalized_name=$2, sku=$3, description=$4,
             product_type_id=$5, unit=$6, reference_price=$7, currency=$8,
             inventory_enabled=$9, track_serial=$10, track_batch=$11, allow_negative_stock=$12,
             reorder_point=$13, max_stock=$14, preferred_supplier_id=$15, purchase_unit=$16,
             sale_unit=$17, conversion_factor=$18, average_cost=$19, last_purchase_cost=$20,
             requires_expiration=$21, storage_notes=$22, updated_at=CURRENT_TIMESTAMP
             WHERE id=$23 RETURNING *`,
            [name.trim(), normalized, normalizedSku, description || null,
             resolvedTypeId, unit || 'unidad', Number(reference_price || 0), currency || 'CLP',
             ...resolveInventoryValues(req.body, { invActive, current }), req.params.id]
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

/**
 * DELETE /garage/products/:id
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);

        // Pre-check the tables whose FK to products blocks deletion
        // (ON DELETE RESTRICT, or no ON DELETE clause which defaults to it)
        // so a raw DB FK-violation never bubbles up to the client.
        const [inUseTemplates, inUsePurchaseLines, inUseReceiptLines, inUseMovements] = await Promise.all([
            db.query(`SELECT 1 FROM ${schema}.service_template_products WHERE product_id = $1 LIMIT 1`, [req.params.id]),
            db.query(`SELECT 1 FROM ${schema}.purchase_document_lines WHERE product_id = $1 LIMIT 1`, [req.params.id]),
            db.query(`SELECT 1 FROM ${schema}.stock_receipt_lines WHERE product_id = $1 LIMIT 1`, [req.params.id]),
            db.query(`SELECT 1 FROM ${schema}.stock_movements WHERE product_id = $1 LIMIT 1`, [req.params.id])
        ]);

        if ([inUseTemplates, inUsePurchaseLines, inUseReceiptLines, inUseMovements].some(r => r.rows.length > 0)) {
            return res.status(409).json({ error: 'El producto está en uso y no puede eliminarse' });
        }

        const result = await db.query(`DELETE FROM ${schema}.products WHERE id = $1 RETURNING id`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        res.json({ message: 'Producto eliminado' });
    } catch (err) {
        console.error('productsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar producto' });
    }
};
