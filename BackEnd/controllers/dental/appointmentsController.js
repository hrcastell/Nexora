const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/appointments
 * Query: ?status=, ?customer_id=, ?date_from=, ?date_to=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { status, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query;

        const params = [companyId];
        const conditions = ['da.tenant_id = $1'];

        if (status) {
            params.push(status);
            conditions.push(`da.status = $${params.length}`);
        }
        if (customer_id) {
            params.push(parseInt(customer_id));
            conditions.push(`da.customer_id = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`DATE(da.scheduled_start) >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`DATE(da.scheduled_start) <= $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT da.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone,
                    ds.name AS service_name
             FROM ${schema}.dental_appointments da
             LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = da.service_id
             ${where}
             ORDER BY da.scheduled_start DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.dental_appointments da ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('appointmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar citas' });
    }
};

/**
 * GET /dental/appointments/day
 * Query: ?date=YYYY-MM-DD (defaults to today)
 */
exports.getByDay = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        const result = await db.query(
            `SELECT da.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone,
                    ds.name AS service_name
             FROM ${schema}.dental_appointments da
             LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = da.service_id
             WHERE da.tenant_id = $1
               AND DATE(da.scheduled_start) = $2
             ORDER BY da.scheduled_start ASC`,
            [companyId, date]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('appointmentsController.getByDay error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener citas del día' });
    }
};

/**
 * GET /dental/appointments/month
 * Query: ?year=YYYY&month=MM
 */
exports.getByMonth = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const now = new Date();
        const year  = parseInt(req.query.year  || now.getFullYear());
        const month = parseInt(req.query.month || (now.getMonth() + 1));

        const result = await db.query(
            `SELECT da.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    ds.name AS service_name
             FROM ${schema}.dental_appointments da
             LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = da.service_id
             WHERE da.tenant_id = $1
               AND EXTRACT(YEAR  FROM da.scheduled_start) = $2
               AND EXTRACT(MONTH FROM da.scheduled_start) = $3
             ORDER BY da.scheduled_start ASC`,
            [companyId, year, month]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('appointmentsController.getByMonth error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener citas del mes' });
    }
};

/**
 * POST /dental/appointments
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            customer_id,
            service_id = null,
            scheduled_start,
            scheduled_end,
            reason = null,
            notes = null,
            status = 'pending'
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });
        if (!scheduled_start) return res.status(400).json({ error: 'scheduled_start es requerido' });
        if (!scheduled_end) return res.status(400).json({ error: 'scheduled_end es requerido' });

        if (new Date(scheduled_end) <= new Date(scheduled_start)) {
            return res.status(400).json({
                code: 'DENTAL_INVALID_SCHEDULE',
                error: 'scheduled_end debe ser posterior a scheduled_start'
            });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.dental_appointments
             (tenant_id, customer_id, service_id, scheduled_start, scheduled_end, reason, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [companyId, customer_id, service_id, scheduled_start, scheduled_end, reason, notes, status]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear cita' });
    }
};

/**
 * GET /dental/appointments/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT da.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone,
                    c.email AS patient_email,
                    ds.name AS service_name,
                    ds.final_price AS service_price,
                    ds.duration_minutes AS service_duration
             FROM ${schema}.dental_appointments da
             LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = da.service_id
             WHERE da.id = $1 AND da.tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('appointmentsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener cita' });
    }
};

/**
 * PATCH /dental/appointments/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { service_id, scheduled_start, scheduled_end, reason, notes, status } = req.body;

        if (scheduled_start && scheduled_end && new Date(scheduled_end) <= new Date(scheduled_start)) {
            return res.status(400).json({
                code: 'DENTAL_INVALID_SCHEDULE',
                error: 'scheduled_end debe ser posterior a scheduled_start'
            });
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_appointments
             SET service_id      = COALESCE($1, service_id),
                 scheduled_start = COALESCE($2, scheduled_start),
                 scheduled_end   = COALESCE($3, scheduled_end),
                 reason          = COALESCE($4, reason),
                 notes           = COALESCE($5, notes),
                 status          = COALESCE($6, status),
                 updated_at      = CURRENT_TIMESTAMP
             WHERE id = $7 AND tenant_id = $8
             RETURNING *`,
            [
                service_id !== undefined ? service_id : null,
                scheduled_start || null,
                scheduled_end || null,
                reason !== undefined ? reason : null,
                notes !== undefined ? notes : null,
                status || null,
                req.params.id,
                companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar cita' });
    }
};

/**
 * POST /dental/appointments/:id/confirm
 */
exports.confirm = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `UPDATE ${schema}.dental_appointments
             SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.confirm error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al confirmar cita' });
    }
};

/**
 * POST /dental/appointments/:id/cancel
 */
exports.cancel = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_appointments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        const { status } = existing.rows[0];
        if (status === 'cancelled' || status === 'completed') {
            return res.status(400).json({
                code: 'DENTAL_APPOINTMENT_CANNOT_CANCEL',
                error: `No se puede cancelar una cita en estado '${status}'`
            });
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_appointments
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.cancel error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cancelar cita' });
    }
};

/**
 * POST /dental/appointments/:id/no-show
 */
exports.noShow = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `UPDATE ${schema}.dental_appointments
             SET status = 'no_show', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('appointmentsController.noShow error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al marcar cita como no-show' });
    }
};

/**
 * POST /dental/appointments/:id/convert-to-consultation
 * Creates a dental_consultation from the appointment and sets appointment status to 'completed'.
 * Body (optional): { reason, notes }
 */
exports.convertToConsultation = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { reason, notes } = req.body || {};

        const appt = await db.query(
            `SELECT * FROM ${schema}.dental_appointments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (appt.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        }

        const a = appt.rows[0];

        if (a.status === 'cancelled' || a.status === 'completed') {
            return res.status(400).json({
                code: 'DENTAL_APPOINTMENT_CANNOT_CONVERT',
                error: `No se puede convertir una cita en estado '${a.status}'`
            });
        }

        // Create consultation
        const consResult = await db.query(
            `INSERT INTO ${schema}.dental_consultations
             (tenant_id, customer_id, appointment_id, service_id, reason, clinical_notes, status, consultation_date)
             VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', NOW())
             RETURNING *`,
            [companyId, a.customer_id, a.id, a.service_id, reason || a.reason, notes || a.notes]
        );

        // Set appointment to completed
        await db.query(
            `UPDATE ${schema}.dental_appointments
             SET status = 'completed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [a.id]
        );

        res.status(201).json({ data: consResult.rows[0] });
    } catch (err) {
        console.error('appointmentsController.convertToConsultation error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al convertir cita a consulta' });
    }
};
