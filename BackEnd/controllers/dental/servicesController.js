const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Compute final_price based on price_mode.
 */
function computeFinalPrice(price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price) {
    if (price_mode === 'manual') {
        return parseFloat(manual_price) || 0;
    }
    // calculated
    const base = (parseFloat(supplies_cost) || 0) + (parseFloat(labor_cost) || 0);
    const taxFactor = 1 + (parseFloat(tax_rate) || 0);
    const profitFactor = 1 + (parseFloat(profit_margin) || 0);
    return Math.round(base * taxFactor * profitFactor);
}

/**
 * GET /dental/services
 * Query: ?active=true
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { active } = req.query;

        const params = [companyId];
        const conditions = ['ds.tenant_id = $1'];

        if (active === 'true') {
            conditions.push('ds.is_active = TRUE');
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const result = await db.query(
            `SELECT ds.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'treatment_id', dst.treatment_id,
                                'quantity', dst.quantity,
                                'treatment_name', dt.name
                            )
                        ) FILTER (WHERE dst.treatment_id IS NOT NULL),
                        '[]'
                    ) AS treatments
             FROM ${schema}.dental_services ds
             LEFT JOIN ${schema}.dental_service_treatments dst ON dst.service_id = ds.id
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dst.treatment_id
             ${where}
             GROUP BY ds.id
             ORDER BY ds.name ASC`,
            params
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('servicesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar servicios' });
    }
};

/**
 * POST /dental/services
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
            duration_minutes = null,
            is_active = true
        } = req.body;

        if (!name) return res.status(400).json({ error: 'name es requerido' });

        const validModes = ['manual', 'calculated'];
        if (!validModes.includes(price_mode)) {
            return res.status(400).json({ error: `price_mode debe ser uno de: ${validModes.join(', ')}` });
        }

        const final_price = computeFinalPrice(price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price);

        const result = await db.query(
            `INSERT INTO ${schema}.dental_services
             (tenant_id, name, description, price_mode, supplies_cost, labor_cost, tax_rate, profit_margin, manual_price, final_price, duration_minutes, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [companyId, name, description, price_mode,
             parseFloat(supplies_cost) || 0,
             parseFloat(labor_cost) || 0,
             parseFloat(tax_rate) || 0,
             parseFloat(profit_margin) || 0,
             parseFloat(manual_price) || 0,
             final_price,
             duration_minutes,
             is_active]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('servicesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear servicio' });
    }
};

/**
 * GET /dental/services/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT ds.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'treatment_id', dst.treatment_id,
                                'quantity', dst.quantity,
                                'treatment_name', dt.name
                            )
                        ) FILTER (WHERE dst.treatment_id IS NOT NULL),
                        '[]'
                    ) AS treatments
             FROM ${schema}.dental_services ds
             LEFT JOIN ${schema}.dental_service_treatments dst ON dst.service_id = ds.id
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dst.treatment_id
             WHERE ds.id = $1 AND ds.tenant_id = $2
             GROUP BY ds.id`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SERVICE_NOT_FOUND', error: 'Servicio no encontrado' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('servicesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener servicio' });
    }
};

/**
 * PATCH /dental/services/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Fetch current values to recompute price if needed
        const current = await db.query(
            `SELECT * FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SERVICE_NOT_FOUND', error: 'Servicio no encontrado' });
        }

        const svc = current.rows[0];
        const {
            name,
            description,
            price_mode,
            supplies_cost,
            labor_cost,
            tax_rate,
            profit_margin,
            manual_price,
            duration_minutes,
            is_active
        } = req.body;

        const newPriceMode     = price_mode     !== undefined ? price_mode     : svc.price_mode;
        const newSuppliesCost  = supplies_cost  !== undefined ? supplies_cost  : svc.supplies_cost;
        const newLaborCost     = labor_cost      !== undefined ? labor_cost     : svc.labor_cost;
        const newTaxRate       = tax_rate        !== undefined ? tax_rate       : svc.tax_rate;
        const newProfitMargin  = profit_margin   !== undefined ? profit_margin  : svc.profit_margin;
        const newManualPrice   = manual_price    !== undefined ? manual_price   : svc.manual_price;

        const newFinalPrice = computeFinalPrice(newPriceMode, newSuppliesCost, newLaborCost, newTaxRate, newProfitMargin, newManualPrice);

        const result = await db.query(
            `UPDATE ${schema}.dental_services
             SET name             = COALESCE($1, name),
                 description      = COALESCE($2, description),
                 price_mode       = $3,
                 supplies_cost    = $4,
                 labor_cost       = $5,
                 tax_rate         = $6,
                 profit_margin    = $7,
                 manual_price     = $8,
                 final_price      = $9,
                 duration_minutes = COALESCE($10, duration_minutes),
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
                duration_minutes !== undefined ? duration_minutes : null,
                is_active !== undefined ? is_active : null,
                req.params.id,
                companyId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('servicesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar servicio' });
    }
};

/**
 * DELETE /dental/services/:id
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Check if referenced by consultations or charges
        const inUseConsultation = await db.query(
            `SELECT 1 FROM ${schema}.dental_consultations WHERE service_id = $1 LIMIT 1`,
            [req.params.id]
        );
        const inUseCharge = await db.query(
            `SELECT 1 FROM ${schema}.dental_charges WHERE service_id = $1 LIMIT 1`,
            [req.params.id]
        );

        if (inUseConsultation.rows.length > 0 || inUseCharge.rows.length > 0) {
            return res.status(409).json({
                code: 'DENTAL_SERVICE_IN_USE',
                error: 'El servicio está referenciado en consultas o cobros y no puede eliminarse'
            });
        }

        const result = await db.query(
            `DELETE FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2 RETURNING id`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SERVICE_NOT_FOUND', error: 'Servicio no encontrado' });
        }

        res.json({ message: 'Servicio eliminado' });
    } catch (err) {
        console.error('servicesController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar servicio' });
    }
};

/**
 * POST /dental/services/:id/treatments
 * Replace service treatments. Body: { treatments: [{treatment_id, quantity}] }
 */
exports.assignTreatments = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { treatments = [] } = req.body;

        // Verify service exists
        const svc = await db.query(
            `SELECT id FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (svc.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SERVICE_NOT_FOUND', error: 'Servicio no encontrado' });
        }

        // Delete existing
        await db.query(
            `DELETE FROM ${schema}.dental_service_treatments WHERE service_id = $1`,
            [req.params.id]
        );

        if (treatments.length > 0) {
            const values = treatments.map((t, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ');
            const params = [req.params.id];
            for (const t of treatments) {
                params.push(t.treatment_id, t.quantity || 1);
            }
            await db.query(
                `INSERT INTO ${schema}.dental_service_treatments (service_id, treatment_id, quantity) VALUES ${values}`,
                params
            );
        }

        // Return updated service with treatments
        const result = await db.query(
            `SELECT ds.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'treatment_id', dst.treatment_id,
                                'quantity', dst.quantity,
                                'treatment_name', dt.name
                            )
                        ) FILTER (WHERE dst.treatment_id IS NOT NULL),
                        '[]'
                    ) AS treatments
             FROM ${schema}.dental_services ds
             LEFT JOIN ${schema}.dental_service_treatments dst ON dst.service_id = ds.id
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dst.treatment_id
             WHERE ds.id = $1 AND ds.tenant_id = $2
             GROUP BY ds.id`,
            [req.params.id, companyId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('servicesController.assignTreatments error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al asignar tratamientos al servicio' });
    }
};
