const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const VALID_STATUSES = ['scheduled', 'confirmed', 'arrived', 'converted_to_work_order', 'cancelled', 'no_show', 'rescheduled'];
const MODULE_CODE = 'garage_operations';

/**
 * Verifica el límite diario configurado en appointment_settings antes de
 * crear/reagendar una cita. No hace nada si max_appointments_per_day es NULL
 * (sin límite). Lanza un error con statusCode 409 si ya se alcanzó el tope.
 */
async function assertDailyCapacity(schema, targetDateIso, client, excludeApptId = null) {
    const settingsRes = await client.query(
        `SELECT max_appointments_per_day FROM ${schema}.appointment_settings WHERE module_code = $1`,
        [MODULE_CODE]
    );
    const maxPerDay = settingsRes.rows[0]?.max_appointments_per_day;
    if (maxPerDay == null) return;

    const params = [targetDateIso];
    let excludeClause = '';
    if (excludeApptId) {
        params.push(excludeApptId);
        excludeClause = `AND id != $${params.length}`;
    }

    const countRes = await client.query(
        `SELECT COUNT(*) FROM ${schema}.appointments
         WHERE scheduled_start::date = $1::date
           AND status NOT IN ('cancelled', 'no_show')
           ${excludeClause}`,
        params
    );
    if (parseInt(countRes.rows[0].count, 10) >= maxPerDay) {
        throw Object.assign(
            new Error(`Se alcanzó el máximo de ${maxPerDay} citas para ese día.`),
            { statusCode: 409 }
        );
    }
}

/**
 * Genera número de cita: APT-{YYYY}-{NNNN}
 */
async function generateAppointmentNumber(schema, client) {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM ${schema}.appointments WHERE EXTRACT(YEAR FROM created_at) = $1`,
        [year]
    );
    const seq = parseInt(result.rows[0].count) + 1;
    return `APT-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * GET /garage/appointments
 * Query: ?status=, ?date_from=, ?date_to=, ?customer_id=, ?employee_id=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status, date_from, date_to, customer_id, employee_id, page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status)      { params.push(status);      conditions.push(`a.status = $${params.length}`); }
        if (date_from)   { params.push(date_from);   conditions.push(`a.scheduled_start >= $${params.length}::date`); }
        if (date_to)     { params.push(date_to);     conditions.push(`a.scheduled_start < ($${params.length}::date + INTERVAL '1 day')`); }
        if (customer_id) { params.push(customer_id); conditions.push(`a.customer_id = $${params.length}`); }
        if (employee_id) { params.push(employee_id); conditions.push(`a.suggested_employee_id = $${params.length}`); }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT a.id, a.appointment_number, a.scheduled_start, a.scheduled_end, a.status, a.priority, a.channel,
                    a.reported_issue, a.customer_id, a.vehicle_id, a.converted_work_order_id,
                    c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
                    vb.name || ' ' || COALESCE(vm.name, '') AS vehicle_desc, v.plate,
                    e.first_name || ' ' || COALESCE(e.last_name, '') AS employee_name
             FROM ${schema}.appointments a
             LEFT JOIN ${schema}.customers c       ON c.id = a.customer_id
             LEFT JOIN ${schema}.vehicles v        ON v.id = a.vehicle_id
             LEFT JOIN ${schema}.vehicle_brands vb ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm ON vm.id = v.model_id
             LEFT JOIN ${schema}.employees e       ON e.id = a.suggested_employee_id
             ${where}
             ORDER BY a.scheduled_start ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.appointments a ${where}`, countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('appointmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar citas' });
    }
};

/**
 * GET /garage/appointments/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);

        const appt = await db.query(
            `SELECT a.*,
                    c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name, c.phone AS customer_phone,
                    v.plate, vb.name AS brand, vm.name AS model,
                    e.first_name || ' ' || COALESCE(e.last_name, '') AS employee_name
             FROM ${schema}.appointments a
             LEFT JOIN ${schema}.customers c       ON c.id = a.customer_id
             LEFT JOIN ${schema}.vehicles v        ON v.id = a.vehicle_id
             LEFT JOIN ${schema}.vehicle_brands vb ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm ON vm.id = v.model_id
             LEFT JOIN ${schema}.employees e       ON e.id = a.suggested_employee_id
             WHERE a.id = $1`,
            [req.params.id]
        );
        if (appt.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

        const services = await db.query(
            `SELECT s.*, e.first_name || ' ' || COALESCE(e.last_name,'') AS employee_name
             FROM ${schema}.appointment_services s
             LEFT JOIN ${schema}.employees e ON e.id = s.suggested_employee_id
             WHERE s.appointment_id = $1 ORDER BY s.id ASC`,
            [req.params.id]
        );

        const history = await db.query(
            `SELECT * FROM ${schema}.appointment_status_history WHERE appointment_id = $1 ORDER BY created_at ASC`,
            [req.params.id]
        );

        res.json({ ...appt.rows[0], services: services.rows, history: history.rows });
    } catch (err) {
        console.error('appointmentsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener cita' });
    }
};

/**
 * POST /garage/appointments
 */
exports.create = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const {
            customer_id, vehicle_id, scheduled_start, scheduled_end,
            estimated_duration_hours, channel, requested_service_summary,
            reported_issue, preliminary_notes, internal_notes,
            priority = 'normal', suggested_employee_id, services = []
        } = req.body;

        if (!scheduled_start) return res.status(400).json({ error: 'scheduled_start es requerido' });

        await client.query('BEGIN');

        await assertDailyCapacity(schema, scheduled_start, client);

        const apptNumber = await generateAppointmentNumber(schema, client);

        const result = await client.query(
            `INSERT INTO ${schema}.appointments
             (appointment_number, customer_id, vehicle_id, scheduled_start, scheduled_end,
              estimated_duration_hours, channel, requested_service_summary, reported_issue,
              preliminary_notes, internal_notes, priority, suggested_employee_id, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [apptNumber, customer_id || null, vehicle_id || null, scheduled_start, scheduled_end || null,
             estimated_duration_hours || 0, channel || null, requested_service_summary || null,
             reported_issue || null, preliminary_notes || null, internal_notes || null,
             priority, suggested_employee_id || null, req.user?.id || null]
        );

        const apptId = result.rows[0].id;

        // Registrar historial de estado inicial
        await client.query(
            `INSERT INTO ${schema}.appointment_status_history (appointment_id, previous_status, new_status, changed_by)
             VALUES ($1, NULL, 'scheduled', $2)`,
            [apptId, req.user?.id || null]
        );

        // Insertar servicios si se proveen
        for (const svc of services) {
            await client.query(
                `INSERT INTO ${schema}.appointment_services
                 (appointment_id, service_template_id, service_name, description, estimated_hours, suggested_employee_id)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [apptId, svc.service_template_id || null, svc.service_name, svc.description || null,
                 svc.estimated_hours || 0, svc.suggested_employee_id || null]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('appointmentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear cita' });
    } finally {
        client.release();
    }
};

/**
 * PUT /garage/appointments/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const {
            customer_id, vehicle_id, scheduled_start, scheduled_end,
            estimated_duration_hours, channel, requested_service_summary,
            reported_issue, preliminary_notes, internal_notes, priority, suggested_employee_id
        } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.appointments SET
             customer_id=$1, vehicle_id=$2, scheduled_start=$3, scheduled_end=$4,
             estimated_duration_hours=$5, channel=$6, requested_service_summary=$7,
             reported_issue=$8, preliminary_notes=$9, internal_notes=$10, priority=$11,
             suggested_employee_id=$12, updated_at=CURRENT_TIMESTAMP
             WHERE id=$13 AND status NOT IN ('converted_to_work_order', 'cancelled')
             RETURNING *`,
            [customer_id || null, vehicle_id || null, scheduled_start, scheduled_end || null,
             estimated_duration_hours || 0, channel || null, requested_service_summary || null,
             reported_issue || null, preliminary_notes || null, internal_notes || null,
             priority || 'normal', suggested_employee_id || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada o no editable en su estado actual' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar cita' });
    }
};

// ─── ACCIONES DE ESTADO ───────────────────────────────────────

async function changeStatus(schema, apptId, newStatus, userId, notes, client) {
    const current = await client.query(
        `SELECT status FROM ${schema}.appointments WHERE id = $1 FOR UPDATE`,
        [apptId]
    );
    if (current.rows.length === 0) throw Object.assign(new Error('Cita no encontrada'), { statusCode: 404 });
    const prevStatus = current.rows[0].status;

    await client.query(
        `UPDATE ${schema}.appointments SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
        [newStatus, apptId]
    );
    await client.query(
        `INSERT INTO ${schema}.appointment_status_history (appointment_id, previous_status, new_status, changed_by, notes)
         VALUES ($1,$2,$3,$4,$5)`,
        [apptId, prevStatus, newStatus, userId || null, notes || null]
    );
    return prevStatus;
}

/**
 * POST /garage/appointments/:id/confirm
 */
exports.confirm = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');

        const current = await client.query(`SELECT status FROM ${schema}.appointments WHERE id = $1`, [req.params.id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cita no encontrada' }); }
        if (!['scheduled', 'rescheduled'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Solo se pueden confirmar citas en estado scheduled o rescheduled' });
        }

        await changeStatus(schema, req.params.id, 'confirmed', req.user?.id, req.body.notes, client);
        await client.query('COMMIT');
        res.json({ message: 'Cita confirmada', status: 'confirmed' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al confirmar cita' });
    } finally { client.release(); }
};

/**
 * POST /garage/appointments/:id/mark-arrived
 */
exports.markArrived = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');

        const current = await client.query(`SELECT status FROM ${schema}.appointments WHERE id = $1`, [req.params.id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cita no encontrada' }); }
        if (['cancelled', 'no_show', 'converted_to_work_order'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede recepcionar una cita en estado ' + current.rows[0].status });
        }

        await changeStatus(schema, req.params.id, 'arrived', req.user?.id, req.body.notes, client);
        await client.query('COMMIT');
        res.json({ message: 'Cliente marcado como llegado', status: 'arrived' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al marcar llegada' });
    } finally { client.release(); }
};

/**
 * POST /garage/appointments/:id/cancel
 */
exports.cancel = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        await client.query('BEGIN');

        const current = await client.query(`SELECT status FROM ${schema}.appointments WHERE id = $1`, [req.params.id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cita no encontrada' }); }
        if (['cancelled', 'converted_to_work_order'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede cancelar una cita en estado ' + current.rows[0].status });
        }

        await changeStatus(schema, req.params.id, 'cancelled', req.user?.id, req.body.notes, client);
        await client.query('COMMIT');
        res.json({ message: 'Cita cancelada', status: 'cancelled' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cancelar cita' });
    } finally { client.release(); }
};

/**
 * POST /garage/appointments/:id/reschedule
 */
exports.reschedule = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { new_start, new_end, reason } = req.body;
        if (!new_start) return res.status(400).json({ error: 'new_start es requerido' });

        await client.query('BEGIN');

        const current = await client.query(
            `SELECT status, scheduled_start, scheduled_end FROM ${schema}.appointments WHERE id = $1 FOR UPDATE`,
            [req.params.id]
        );
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cita no encontrada' }); }
        if (['cancelled', 'converted_to_work_order'].includes(current.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede reagendar una cita en estado ' + current.rows[0].status });
        }

        const { scheduled_start: prevStart, scheduled_end: prevEnd } = current.rows[0];

        await assertDailyCapacity(schema, new_start, client, req.params.id);

        // Registrar historial de reagendamiento
        await client.query(
            `INSERT INTO ${schema}.appointment_reschedules (appointment_id, previous_start, previous_end, new_start, new_end, reason, changed_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [req.params.id, prevStart, prevEnd || null, new_start, new_end || null, reason || null, req.user?.id || null]
        );

        await client.query(
            `UPDATE ${schema}.appointments SET scheduled_start=$1, scheduled_end=$2, status='rescheduled', updated_at=CURRENT_TIMESTAMP WHERE id=$3`,
            [new_start, new_end || null, req.params.id]
        );

        await client.query(
            `INSERT INTO ${schema}.appointment_status_history (appointment_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,'rescheduled',$3,$4)`,
            [req.params.id, current.rows[0].status, req.user?.id || null, reason || null]
        );

        await client.query('COMMIT');
        res.json({ message: 'Cita reagendada', new_start, status: 'rescheduled' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al reagendar cita' });
    } finally { client.release(); }
};

/**
 * POST /garage/appointments/:id/convert-to-work-order
 * Conversión atómica con FOR UPDATE para prevenir doble conversión.
 */
exports.convertToWorkOrder = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');

        // Bloquear la fila para prevenir doble conversión simultánea
        const apptRes = await client.query(
            `SELECT * FROM ${schema}.appointments WHERE id = $1 FOR UPDATE`,
            [req.params.id]
        );
        if (apptRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const appt = apptRes.rows[0];

        if (appt.status === 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede convertir una cita cancelada' });
        }
        if (appt.status === 'no_show') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'No se puede convertir una cita marcada como no_show sin reactivarla primero' });
        }
        if (appt.converted_work_order_id) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Esta cita ya fue convertida en orden de trabajo', work_order_id: appt.converted_work_order_id });
        }
        if (!appt.customer_id) {
            await client.query('ROLLBACK');
            return res.status(422).json({ error: 'La cita debe tener un cliente asignado para convertirse en orden' });
        }
        if (!appt.vehicle_id) {
            await client.query('ROLLBACK');
            return res.status(422).json({ error: 'La cita debe tener un vehículo asignado para convertirse en orden' });
        }

        // Generar número de orden
        const year = new Date().getFullYear();
        const countRes = await client.query(
            `SELECT COUNT(*) FROM ${schema}.work_orders WHERE EXTRACT(YEAR FROM created_at) = $1`,
            [year]
        );
        const seq = parseInt(countRes.rows[0].count) + 1;
        const orderNumber = `OT-${year}-${String(seq).padStart(4, '0')}`;

        const { mileage_in, reception_notes, fuel_level, vehicle_condition_notes } = req.body;

        // Crear la orden de trabajo
        const woRes = await client.query(
            `INSERT INTO ${schema}.work_orders
             (order_number, appointment_id, appointment_date, customer_id, vehicle_id,
              assigned_employee_id, status, priority, reported_issue,
              reception_notes, fuel_level, vehicle_condition_notes, mileage_in,
              customer_notes, internal_notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,'received',$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING *`,
            [orderNumber, appt.id, appt.scheduled_start, appt.customer_id, appt.vehicle_id,
             appt.suggested_employee_id || null, appt.priority || 'normal', appt.reported_issue || null,
             reception_notes || appt.preliminary_notes || null, fuel_level || null,
             vehicle_condition_notes || null, mileage_in || null,
             appt.preliminary_notes || null, appt.internal_notes || null,
             req.user?.id || null]
        );

        const workOrder = woRes.rows[0];

        // Copiar servicios de la cita a la orden
        const apptServices = await client.query(
            `SELECT * FROM ${schema}.appointment_services WHERE appointment_id = $1`,
            [appt.id]
        );

        for (const svc of apptServices.rows) {
            const wosRes = await client.query(
                `INSERT INTO ${schema}.work_order_services
                 (work_order_id, service_template_id, assigned_employee_id, service_name, description,
                  estimated_hours, hourly_rate, status)
                 VALUES ($1,$2,$3,$4,$5,$6,0,'pending') RETURNING id`,
                [workOrder.id, svc.service_template_id || null, svc.suggested_employee_id || null,
                 svc.service_name, svc.description || null, svc.estimated_hours || 0]
            );

            // Copiar productos del servicio de la cita
            const apptProds = await client.query(
                `SELECT asp.*, p.name AS product_name
                 FROM ${schema}.appointment_service_products asp
                 LEFT JOIN ${schema}.products p ON p.id = asp.product_id
                 WHERE asp.appointment_service_id = $1`,
                [svc.id]
            );

            for (const prod of apptProds.rows) {
                await client.query(
                    `INSERT INTO ${schema}.work_order_service_products
                     (work_order_service_id, product_id, product_name, quantity, unit, unit_price, total_price)
                     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [wosRes.rows[0].id, prod.product_id || null,
                     prod.product_name || 'Producto', prod.quantity || 1,
                     prod.unit || null, prod.estimated_unit_price || 0,
                     prod.estimated_total_price || 0]
                );
            }
        }

        // Registrar historial de la orden
        await client.query(
            `INSERT INTO ${schema}.work_order_status_history (work_order_id, previous_status, new_status, changed_by, notes)
             VALUES ($1, NULL, 'received', $2, 'Orden creada desde cita ${appt.appointment_number}')`,
            [workOrder.id, req.user?.id || null]
        );

        // Actualizar la cita con el vínculo a la orden y cambiar estado
        await client.query(
            `UPDATE ${schema}.appointments SET
             converted_work_order_id=$1, converted_at=CURRENT_TIMESTAMP,
             status='converted_to_work_order', updated_at=CURRENT_TIMESTAMP
             WHERE id=$2`,
            [workOrder.id, appt.id]
        );

        await client.query(
            `INSERT INTO ${schema}.appointment_status_history
             (appointment_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,'converted_to_work_order',$3,$4)`,
            [appt.id, appt.status, req.user?.id || null, `Convertida en orden ${orderNumber}`]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Cita convertida en orden de trabajo', work_order: workOrder });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('appointmentsController.convertToWorkOrder error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al convertir cita en orden' });
    } finally {
        client.release();
    }
};

/**
 * GET /garage/appointment-settings
 */
exports.getAppointmentSettings = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.appointment_settings WHERE module_code = $1`,
            [MODULE_CODE]
        );
        if (result.rows.length === 0) {
            return res.json({ module_code: MODULE_CODE, max_appointments_per_day: null, business_hours_start: '08:00', business_hours_end: '20:00' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.getAppointmentSettings error:', err.message);
        res.status(500).json({ error: 'Error al obtener configuración de citas' });
    }
};

/**
 * PUT /garage/appointment-settings
 */
exports.updateAppointmentSettings = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { max_appointments_per_day, business_hours_start, business_hours_end } = req.body;

        const result = await db.query(
            `INSERT INTO ${schema}.appointment_settings (module_code, max_appointments_per_day, business_hours_start, business_hours_end)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (module_code) DO UPDATE SET
                max_appointments_per_day = EXCLUDED.max_appointments_per_day,
                business_hours_start     = EXCLUDED.business_hours_start,
                business_hours_end       = EXCLUDED.business_hours_end,
                updated_at                = CURRENT_TIMESTAMP
             RETURNING *`,
            [MODULE_CODE, max_appointments_per_day ?? null, business_hours_start || '08:00', business_hours_end || '20:00']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.updateAppointmentSettings error:', err.message);
        res.status(500).json({ error: 'Error al guardar configuración de citas' });
    }
};
