const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Compute final_price based on price_mode.
 */
function computeFinalPrice(price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price) {
    if (price_mode === 'manual') {
        return parseFloat(manual_price) || 0;
    }
    // calculated — tax_rate and profit_margin arrive as percentages (e.g. 21 = 21%)
    const base = (parseFloat(supplies_cost) || 0) + (parseFloat(labor_cost) || 0);
    const taxFactor = 1 + (parseFloat(tax_rate) || 0) / 100;
    const profitFactor = 1 + (parseFloat(profit_margin) || 0) / 100;
    return Math.round(base * taxFactor * profitFactor);
}

/**
 * GET /dental/treatments
 * Query: ?active=true
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { active } = req.query;

        const params = [companyId];
        const conditions = ['dt.tenant_id = $1'];

        if (active === 'true') {
            conditions.push('dt.is_active = TRUE');
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const result = await db.query(
            `SELECT dt.*
             FROM ${schema}.dental_treatments dt
             ${where}
             ORDER BY dt.name ASC`,
            params
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('treatmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar tratamientos') });
    }
};

/**
 * POST /dental/treatments
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            name,
            description = null,
            price_mode = 'manual',
            supplies_cost = 0,
            labor_cost = 0,
            tax_rate = 0,
            profit_margin = 0,
            manual_price = 0,
            estimated_duration_minutes = null,
            is_active = true
        } = req.body;

        if (!name) return res.status(400).json({ error: 'name es requerido' });

        const validModes = ['manual', 'calculated'];
        if (!validModes.includes(price_mode)) {
            return res.status(400).json({ error: `price_mode debe ser uno de: ${validModes.join(', ')}` });
        }

        const final_price = computeFinalPrice(price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price);

        const result = await db.query(
            `INSERT INTO ${schema}.dental_treatments
             (tenant_id, name, description, price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price, final_price, estimated_duration_minutes, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [companyId, name, description, price_mode,
             parseFloat(supplies_cost) || 0,
             parseFloat(labor_cost) || 0,
             parseFloat(tax_rate) || 0,
             parseFloat(profit_margin) || 0,
             parseFloat(manual_price) || 0,
             final_price,
             estimated_duration_minutes,
             is_active]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('treatmentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear tratamiento') });
    }
};

/**
 * GET /dental/treatments/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT dt.*
             FROM ${schema}.dental_treatments dt
             WHERE dt.id = $1 AND dt.tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('treatmentsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener tratamiento') });
    }
};

/**
 * PATCH /dental/treatments/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Fetch current values to recompute price if needed
        const current = await db.query(
            `SELECT * FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
        }

        const trt = current.rows[0];
        const {
            name,
            description,
            price_mode,
            supplies_cost,
            labor_cost,
            tax_rate,
            profit_margin,
            manual_price,
            estimated_duration_minutes,
            is_active
        } = req.body;

        const newPriceMode     = price_mode     !== undefined ? price_mode     : trt.price_mode;
        const newSuppliesCost  = supplies_cost  !== undefined ? supplies_cost  : trt.supplies_cost;
        const newLaborCost     = labor_cost      !== undefined ? labor_cost     : trt.labor_cost;
        const newTaxRate       = tax_rate        !== undefined ? tax_rate       : trt.tax_rate;
        const newProfitMargin  = profit_margin   !== undefined ? profit_margin  : trt.profit_margin;
        const newManualPrice   = manual_price    !== undefined ? manual_price   : trt.manual_price;

        const newFinalPrice = computeFinalPrice(newPriceMode, newSuppliesCost, newLaborCost, newTaxRate, newProfitMargin, newManualPrice);

        const result = await db.query(
            `UPDATE ${schema}.dental_treatments
             SET name             = COALESCE($1, name),
                 description      = COALESCE($2, description),
                 price_mode       = $3,
                 supplies_cost    = $4,
                 labor_cost       = $5,
                 tax_rate         = $6,
                 profit_margin    = $7,
                 manual_price     = $8,
                 final_price      = $9,
                 estimated_duration_minutes = COALESCE($10, estimated_duration_minutes),
                 is_active        = COALESCE($11, is_active),
                 updated_at       = CURRENT_TIMESTAMP
             WHERE id = $12 AND tenant_id = $13
             RETURNING *`,
            [
                name || null,
                description !== undefined ? description : null,
                newPriceMode,
                parseFloat(newSuppliesCost) || 0,
                parseFloat(newLaborCost) || 0,
                parseFloat(newTaxRate) || 0,
                parseFloat(newProfitMargin) || 0,
                parseFloat(newManualPrice) || 0,
                newFinalPrice,
                estimated_duration_minutes !== undefined ? estimated_duration_minutes : null,
                is_active !== undefined ? is_active : null,
                req.params.id,
                companyId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('treatmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar tratamiento') });
    }
};

/**
 * DELETE /dental/treatments/:id
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Check if referenced by consultations or charges
        const inUseConsultation = await db.query(
            `SELECT 1 FROM ${schema}.dental_consultations WHERE treatment_id = $1 AND tenant_id = $2 LIMIT 1`,
            [req.params.id, companyId]
        );
        const inUseCharge = await db.query(
            `SELECT 1 FROM ${schema}.dental_charges WHERE treatment_id = $1 AND tenant_id = $2 LIMIT 1`,
            [req.params.id, companyId]
        );

        if (inUseConsultation.rows.length > 0 || inUseCharge.rows.length > 0) {
            return res.status(409).json({
                code: 'DENTAL_TREATMENT_IN_USE',
                error: 'El tratamiento está referenciado en consultas o cobros y no puede eliminarse'
            });
        }

        const result = await db.query(
            `DELETE FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2 RETURNING id`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
        }

        res.json({ message: 'Tratamiento eliminado' });
    } catch (err) {
        console.error('treatmentsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar tratamiento') });
    }
};
