const db = require('../../config/db');
const { resolveSchema }                              = require('../../utils/tenantResolver');
const { recalculateTotals, recalculateServiceTotals } = require('../../utils/calculateWorkOrderTotals');

/**
 * GET /garage/work-orders/:id/services
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT wos.*,
                    e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.work_order_services wos
             LEFT JOIN ${schema}.employees e ON e.id = wos.assigned_employee_id
             WHERE wos.work_order_id = $1
             ORDER BY wos.id ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('workOrderServicesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar servicios' });
    }
};

/**
 * GET /garage/work-orders/:id/services/:serviceId
 * Incluye productos del servicio.
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const svc = await db.query(
            `SELECT wos.*, e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.work_order_services wos
             LEFT JOIN ${schema}.employees e ON e.id = wos.assigned_employee_id
             WHERE wos.id = $1 AND wos.work_order_id = $2`,
            [req.params.serviceId, req.params.id]
        );
        if (svc.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado en la orden' });

        const products = await db.query(
            `SELECT * FROM ${schema}.work_order_service_products WHERE work_order_service_id = $1 ORDER BY id ASC`,
            [req.params.serviceId]
        );

        res.json({ ...svc.rows[0], products: products.rows });
    } catch (err) {
        console.error('workOrderServicesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener servicio' });
    }
};

/**
 * POST /garage/work-orders/:id/services
 * Agrega un servicio a la orden. Si se especifica service_template_id, copia datos de la plantilla.
 * Si se especifica assigned_employee_id, hace snapshot de la tarifa activa.
 */
exports.create = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const woCheck = await db.query(
            `SELECT status FROM ${schema}.work_orders WHERE id = $1`,
            [req.params.id]
        );
        if (woCheck.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
        if (['delivered', 'cancelled'].includes(woCheck.rows[0].status)) {
            return res.status(409).json({ error: 'No se pueden agregar servicios a una orden entregada o cancelada' });
        }

        const {
            service_template_id, assigned_employee_id,
            service_name, description, estimated_hours = 0
        } = req.body;

        let finalName = service_name;
        let finalDesc = description || null;
        let finalHours = Number(estimated_hours);
        let templateBaseLaborRate = 0;
        let templateMarginPct = 0;
        let templateTaxPct = 0;

        // Si hay plantilla, copiar datos
        if (service_template_id) {
            const tmpl = await db.query(
                `SELECT * FROM ${schema}.service_templates WHERE id = $1`, [service_template_id]
            );
            if (tmpl.rows.length > 0) {
                finalName  = finalName  || tmpl.rows[0].name;
                finalDesc  = finalDesc  || tmpl.rows[0].description;
                finalHours = finalHours || tmpl.rows[0].estimated_hours;
                templateBaseLaborRate = Number(tmpl.rows[0].base_labor_rate) || 0;
                templateMarginPct     = Number(tmpl.rows[0].margin_pct)      || 0;
                templateTaxPct        = Number(tmpl.rows[0].tax_pct)         || 0;
            }
        }

        if (!finalName?.trim()) return res.status(400).json({ error: 'service_name es requerido' });

        // Snapshot de tarifa del empleado si se asigna; fallback to template base_labor_rate
        let hourlyRate = templateBaseLaborRate;
        if (assigned_employee_id) {
            const rateRes = await db.query(
                `SELECT hourly_rate FROM ${schema}.employee_labor_rates
                 WHERE employee_id = $1 AND status = 'active'
                   AND valid_from <= CURRENT_DATE
                   AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
                 ORDER BY valid_from DESC LIMIT 1`,
                [assigned_employee_id]
            );
            if (rateRes.rows.length > 0) hourlyRate = Number(rateRes.rows[0].hourly_rate);
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO ${schema}.work_order_services
             (work_order_id, service_template_id, assigned_employee_id, service_name, description,
              estimated_hours, actual_hours, hourly_rate, margin_pct, tax_pct, status)
             VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,'pending') RETURNING *`,
            [req.params.id, service_template_id || null, assigned_employee_id || null,
             finalName.trim(), finalDesc, finalHours, hourlyRate,
             templateMarginPct, templateTaxPct]
        );

        const serviceId = result.rows[0].id;

        // Si hay plantilla, copiar productos de la plantilla
        if (service_template_id) {
            const tmplProds = await db.query(
                `SELECT stp.*, p.name AS product_name, p.unit AS product_unit, p.reference_price
                 FROM ${schema}.service_template_products stp
                 JOIN ${schema}.products p ON p.id = stp.product_id
                 WHERE stp.service_template_id = $1`,
                [service_template_id]
            );
            for (const tp of tmplProds.rows) {
                const unitPrice = tp.reference_unit_price > 0 ? tp.reference_unit_price : tp.reference_price;
                const totalPrice = tp.quantity * unitPrice;
                await client.query(
                    `INSERT INTO ${schema}.work_order_service_products
                     (work_order_service_id, product_id, product_name, quantity, unit, unit_price, total_price)
                     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [serviceId, tp.product_id, tp.product_name, tp.quantity,
                     tp.unit || tp.product_unit || null, unitPrice, totalPrice]
                );
            }
        }

        // Recalcular totales del servicio y de la orden
        await recalculateServiceTotals(serviceId, schema, client);
        await recalculateTotals(parseInt(req.params.id), schema, client);

        await client.query('COMMIT');

        // Devolver el servicio con sus productos
        const finalSvc = await db.query(
            `SELECT * FROM ${schema}.work_order_services WHERE id = $1`, [serviceId]
        );
        const finalProds = await db.query(
            `SELECT * FROM ${schema}.work_order_service_products WHERE work_order_service_id = $1`, [serviceId]
        );

        res.status(201).json({ ...finalSvc.rows[0], products: finalProds.rows });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderServicesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar servicio' });
    } finally {
        client.release();
    }
};

/**
 * PUT /garage/work-orders/:id/services/:serviceId
 * Actualiza datos del servicio y recalcula totales.
 */
exports.update = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const {
            service_name, description, assigned_employee_id,
            estimated_hours, actual_hours, hourly_rate
        } = req.body;

        // Si se cambia el empleado, hacer snapshot de su tarifa actual
        let finalHourlyRate = hourly_rate != null ? Number(hourly_rate) : undefined;

        if (assigned_employee_id && finalHourlyRate === undefined) {
            const rateRes = await db.query(
                `SELECT hourly_rate FROM ${schema}.employee_labor_rates
                 WHERE employee_id = $1 AND status = 'active'
                   AND valid_from <= CURRENT_DATE
                   AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
                 ORDER BY valid_from DESC LIMIT 1`,
                [assigned_employee_id]
            );
            finalHourlyRate = rateRes.rows.length > 0 ? Number(rateRes.rows[0].hourly_rate) : 0;
        }

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE ${schema}.work_order_services SET
             service_name   = COALESCE($1, service_name),
             description    = COALESCE($2, description),
             assigned_employee_id = COALESCE($3, assigned_employee_id),
             estimated_hours= COALESCE($4, estimated_hours),
             actual_hours   = COALESCE($5, actual_hours),
             hourly_rate    = COALESCE($6, hourly_rate),
             updated_at     = CURRENT_TIMESTAMP
             WHERE id = $7 AND work_order_id = $8
             RETURNING *`,
            [service_name || null, description || null, assigned_employee_id || null,
             estimated_hours != null ? Number(estimated_hours) : null,
             actual_hours != null ? Number(actual_hours) : null,
             finalHourlyRate != null ? finalHourlyRate : null,
             req.params.serviceId, req.params.id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Servicio no encontrado en la orden' });
        }

        await recalculateServiceTotals(parseInt(req.params.serviceId), schema, client);
        await recalculateTotals(parseInt(req.params.id), schema, client);

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderServicesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar servicio' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /garage/work-orders/:id/services/:serviceId
 */
exports.remove = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');

        const result = await client.query(
            `DELETE FROM ${schema}.work_order_services WHERE id = $1 AND work_order_id = $2 RETURNING id`,
            [req.params.serviceId, req.params.id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Servicio no encontrado en la orden' });
        }

        await recalculateTotals(parseInt(req.params.id), schema, client);
        await client.query('COMMIT');
        res.json({ message: 'Servicio eliminado de la orden' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderServicesController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar servicio' });
    } finally {
        client.release();
    }
};

/**
 * PATCH /garage/work-orders/:id/services/:serviceId/status
 */
exports.changeStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        const VALID = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!VALID.includes(status)) return res.status(400).json({ error: `status inválido. Válidos: ${VALID.join(', ')}` });

        const result = await db.query(
            `UPDATE ${schema}.work_order_services SET status=$1, updated_at=CURRENT_TIMESTAMP
             WHERE id=$2 AND work_order_id=$3 RETURNING id, status`,
            [status, req.params.serviceId, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado en la orden' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('workOrderServicesController.changeStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado del servicio' });
    }
};

// ─── PRODUCTOS DE SERVICIO ────────────────────────────────────

/**
 * POST /garage/work-orders/:id/services/:serviceId/products
 */
exports.addProduct = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { product_id, product_name, quantity = 1, unit, unit_price = 0 } = req.body;

        const finalName = product_name || null;
        let resolvedName = finalName;

        if (!resolvedName && product_id) {
            const prod = await db.query(`SELECT name, unit FROM ${schema}.products WHERE id = $1`, [product_id]);
            if (prod.rows.length > 0) resolvedName = prod.rows[0].name;
        }
        if (!resolvedName) return res.status(400).json({ error: 'product_name es requerido si no se especifica product_id' });

        const totalPrice = Number(quantity) * Number(unit_price);

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO ${schema}.work_order_service_products
             (work_order_service_id, product_id, product_name, quantity, unit, unit_price, total_price)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.params.serviceId, product_id || null, resolvedName,
             Number(quantity), unit || null, Number(unit_price), totalPrice]
        );

        await recalculateServiceTotals(parseInt(req.params.serviceId), schema, client);
        await recalculateTotals(parseInt(req.params.id), schema, client);

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderServicesController.addProduct error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar producto al servicio' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /garage/work-orders/:id/services/:serviceId/products/:productLineId
 */
exports.removeProduct = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');

        const result = await client.query(
            `DELETE FROM ${schema}.work_order_service_products
             WHERE id = $1 AND work_order_service_id = $2 RETURNING id`,
            [req.params.productLineId, req.params.serviceId]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado en el servicio' });
        }

        await recalculateServiceTotals(parseInt(req.params.serviceId), schema, client);
        await recalculateTotals(parseInt(req.params.id), schema, client);

        await client.query('COMMIT');
        res.json({ message: 'Producto eliminado del servicio' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderServicesController.removeProduct error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar producto' });
    } finally {
        client.release();
    }
};
