const db = require('../../config/db');
const { resolveSchema }        = require('../../utils/tenantResolver');
const { recalculateTotals }    = require('../../utils/calculateWorkOrderTotals');

const VALID_STATUSES = ['draft', 'received', 'diagnosis', 'approved', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled'];

/**
 * GET /garage/work-orders
 * Query: ?status=, ?priority=, ?employee_id=, ?customer_id=, ?q=, ?date_from=, ?date_to=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status, priority, employee_id, customer_id, q, date_from, date_to, page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status)      { params.push(status);      conditions.push(`wo.status = $${params.length}`); }
        if (priority)    { params.push(priority);    conditions.push(`wo.priority = $${params.length}`); }
        if (employee_id) { params.push(employee_id); conditions.push(`wo.assigned_employee_id = $${params.length}`); }
        if (customer_id) { params.push(customer_id); conditions.push(`wo.customer_id = $${params.length}`); }
        if (date_from)   { params.push(date_from);   conditions.push(`wo.entry_date >= $${params.length}::date`); }
        if (date_to)     { params.push(date_to);     conditions.push(`wo.entry_date < ($${params.length}::date + INTERVAL '1 day')`); }
        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            const idx = params.length;
            conditions.push(`(LOWER(wo.order_number) LIKE $${idx} OR LOWER(c.first_name) LIKE $${idx} OR LOWER(c.last_name) LIKE $${idx} OR UPPER(v.plate) LIKE UPPER($${idx}))`);
        }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT wo.id, wo.order_number, wo.status, wo.priority, wo.entry_date,
                    wo.estimated_delivery_date, wo.total_amount, wo.currency,
                    wo.customer_id, wo.vehicle_id, wo.assigned_employee_id,
                    c.first_name || ' ' || COALESCE(c.last_name,'') AS customer_name,
                    vb.name || ' ' || COALESCE(vm.name,'') AS vehicle_desc, v.plate,
                    e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.work_orders wo
             LEFT JOIN ${schema}.customers c        ON c.id = wo.customer_id
             LEFT JOIN ${schema}.vehicles v         ON v.id = wo.vehicle_id
             LEFT JOIN ${schema}.vehicle_brands vb  ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm  ON vm.id = v.model_id
             LEFT JOIN ${schema}.employees e        ON e.id = wo.assigned_employee_id
             ${where}
             ORDER BY wo.entry_date DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.work_orders wo
             LEFT JOIN ${schema}.customers c ON c.id = wo.customer_id
             LEFT JOIN ${schema}.vehicles v  ON v.id = wo.vehicle_id
             ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('workOrdersController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar órdenes' });
    }
};

/**
 * GET /garage/work-orders/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);

        const woRes = await db.query(
            `SELECT wo.*,
                    c.first_name || ' ' || COALESCE(c.last_name,'') AS customer_name,
                    c.phone AS customer_phone, c.email AS customer_email,
                    v.plate, v.year, v.engine_displacement,
                    vb.name AS brand, vm.name AS model, v.version,
                    e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.work_orders wo
             LEFT JOIN ${schema}.customers c        ON c.id = wo.customer_id
             LEFT JOIN ${schema}.vehicles v         ON v.id = wo.vehicle_id
             LEFT JOIN ${schema}.vehicle_brands vb  ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm  ON vm.id = v.model_id
             LEFT JOIN ${schema}.employees e        ON e.id = wo.assigned_employee_id
             WHERE wo.id = $1`,
            [req.params.id]
        );
        if (woRes.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

        const services = await db.query(
            `SELECT wos.*,
                    e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.work_order_services wos
             LEFT JOIN ${schema}.employees e ON e.id = wos.assigned_employee_id
             WHERE wos.work_order_id = $1
             ORDER BY wos.id ASC`,
            [req.params.id]
        );

        const history = await db.query(
            `SELECT * FROM ${schema}.work_order_status_history WHERE work_order_id = $1 ORDER BY created_at ASC`,
            [req.params.id]
        );

        res.json({ ...woRes.rows[0], services: services.rows, history: history.rows });
    } catch (err) {
        console.error('workOrdersController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener orden' });
    }
};

/**
 * POST /garage/work-orders
 * Crear orden directa (sin cita previa).
 */
exports.create = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const {
            customer_id, vehicle_id, assigned_employee_id, priority = 'normal',
            reported_issue, reception_notes, fuel_level, vehicle_condition_notes,
            mileage_in, estimated_delivery_date, internal_notes, customer_notes, currency = 'CLP'
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });
        if (!vehicle_id)  return res.status(400).json({ error: 'vehicle_id es requerido' });

        await client.query('BEGIN');

        const year  = new Date().getFullYear();
        const count = await client.query(
            `SELECT COUNT(*) FROM ${schema}.work_orders WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]
        );
        const orderNumber = `OT-${year}-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

        const result = await client.query(
            `INSERT INTO ${schema}.work_orders
             (order_number, customer_id, vehicle_id, assigned_employee_id, priority,
              reported_issue, reception_notes, fuel_level, vehicle_condition_notes,
              mileage_in, estimated_delivery_date, internal_notes, customer_notes, currency, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING *`,
            [orderNumber, customer_id, vehicle_id, assigned_employee_id || null, priority,
             reported_issue || null, reception_notes || null, fuel_level || null,
             vehicle_condition_notes || null, mileage_in || null, estimated_delivery_date || null,
             internal_notes || null, customer_notes || null, currency, req.user?.id || null]
        );

        await client.query(
            `INSERT INTO ${schema}.work_order_status_history (work_order_id, previous_status, new_status, changed_by)
             VALUES ($1, NULL, 'draft', $2)`,
            [result.rows[0].id, req.user?.id || null]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrdersController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear orden' });
    } finally {
        client.release();
    }
};

/**
 * PUT /garage/work-orders/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const {
            reported_issue, diagnosis, reception_notes, fuel_level, vehicle_condition_notes,
            internal_notes, customer_notes, estimated_delivery_date, priority, mileage_in, mileage_out
        } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.work_orders SET
             reported_issue=$1, diagnosis=$2, reception_notes=$3, fuel_level=$4,
             vehicle_condition_notes=$5, internal_notes=$6, customer_notes=$7,
             estimated_delivery_date=$8, priority=$9, mileage_in=$10, mileage_out=$11,
             updated_at=CURRENT_TIMESTAMP
             WHERE id=$12 AND status NOT IN ('delivered','cancelled')
             RETURNING *`,
            [reported_issue || null, diagnosis || null, reception_notes || null, fuel_level || null,
             vehicle_condition_notes || null, internal_notes || null, customer_notes || null,
             estimated_delivery_date || null, priority || 'normal', mileage_in || null, mileage_out || null,
             req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada o no editable en su estado actual' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('workOrdersController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar orden' });
    }
};

/**
 * PATCH /garage/work-orders/:id/status
 */
exports.changeStatus = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { status, notes } = req.body;

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
        }

        await client.query('BEGIN');

        const current = await client.query(
            `SELECT status FROM ${schema}.work_orders WHERE id = $1 FOR UPDATE`, [req.params.id]
        );
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Orden no encontrada' }); }

        const prevStatus = current.rows[0].status;

        if (prevStatus === 'delivered') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Una orden entregada no puede cambiar de estado' }); }
        if (prevStatus === 'cancelled') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Una orden cancelada no puede cambiar de estado' }); }

        const deliveryDate = status === 'delivered' ? 'CURRENT_TIMESTAMP' : 'delivery_date';

        await client.query(
            `UPDATE ${schema}.work_orders SET status=$1, delivery_date=${deliveryDate}, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
            [status, req.params.id]
        );
        await client.query(
            `INSERT INTO ${schema}.work_order_status_history (work_order_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,$3,$4,$5)`,
            [req.params.id, prevStatus, status, req.user?.id || null, notes || null]
        );

        await client.query('COMMIT');
        res.json({ message: `Estado actualizado a ${status}`, status });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrdersController.changeStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    } finally {
        client.release();
    }
};

/**
 * PATCH /garage/work-orders/:id/assign
 */
exports.assign = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { assigned_employee_id, assigned_user_id } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.work_orders SET assigned_employee_id=$1, assigned_user_id=$2, updated_at=CURRENT_TIMESTAMP
             WHERE id=$3 RETURNING id, assigned_employee_id, assigned_user_id`,
            [assigned_employee_id || null, assigned_user_id || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('workOrdersController.assign error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al asignar responsable' });
    }
};

/**
 * POST /garage/work-orders/:id/recalculate
 * Recalcula todos los totales de la orden.
 */
exports.recalculate = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');
        const totals = await recalculateTotals(parseInt(req.params.id), schema, client);
        await client.query('COMMIT');
        res.json({ message: 'Totales recalculados', ...totals });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrdersController.recalculate error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al recalcular totales' });
    } finally {
        client.release();
    }
};

/**
 * POST /garage/work-orders/:id/close
 */
exports.close = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { mileage_out, customer_notes, internal_notes } = req.body;

        await client.query('BEGIN');

        const current = await client.query(
            `SELECT status FROM ${schema}.work_orders WHERE id = $1 FOR UPDATE`, [req.params.id]
        );
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Orden no encontrada' }); }
        if (!['in_progress', 'approved', 'waiting_parts', 'diagnosis'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Solo se puede cerrar una orden en progreso, aprobada, en espera de partes o en diagnóstico' });
        }

        // Recalcular antes de cerrar
        await recalculateTotals(parseInt(req.params.id), schema, client);

        await client.query(
            `UPDATE ${schema}.work_orders SET status='completed', mileage_out=$1,
             customer_notes=COALESCE($2, customer_notes), internal_notes=COALESCE($3, internal_notes),
             updated_at=CURRENT_TIMESTAMP WHERE id=$4`,
            [mileage_out || null, customer_notes || null, internal_notes || null, req.params.id]
        );
        await client.query(
            `INSERT INTO ${schema}.work_order_status_history (work_order_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,'completed',$3,$4)`,
            [req.params.id, current.rows[0].status, req.user?.id || null, req.body.notes || null]
        );

        await client.query('COMMIT');
        res.json({ message: 'Orden cerrada correctamente', status: 'completed' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrdersController.close error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cerrar orden' });
    } finally {
        client.release();
    }
};

/**
 * POST /garage/work-orders/:id/cancel
 */
exports.cancel = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');

        const current = await client.query(
            `SELECT status FROM ${schema}.work_orders WHERE id = $1 FOR UPDATE`, [req.params.id]
        );
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Orden no encontrada' }); }
        if (['delivered', 'cancelled'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede cancelar una orden en estado ' + current.rows[0].status });
        }

        await client.query(
            `UPDATE ${schema}.work_orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
            [req.params.id]
        );
        await client.query(
            `INSERT INTO ${schema}.work_order_status_history (work_order_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,'cancelled',$3,$4)`,
            [req.params.id, current.rows[0].status, req.user?.id || null, req.body.notes || null]
        );

        await client.query('COMMIT');
        res.json({ message: 'Orden cancelada', status: 'cancelled' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrdersController.cancel error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cancelar orden' });
    } finally {
        client.release();
    }
};
