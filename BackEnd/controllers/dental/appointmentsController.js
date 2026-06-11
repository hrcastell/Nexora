const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { createNotification } = require('../../utils/notifications');

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled'];

function mapAppointment(row) {
    if (!row) return row;
    const {
        patient_first_name,
        patient_last_name,
        patient_name,
        patient_phone,
        patient_email,
        treatment_name,
        treatment_price,
        treatment_duration,
        ...appointment
    } = row;

    return {
        ...appointment,
        customer: row.customer_id ? {
            id: row.customer_id,
            first_name: patient_first_name || (patient_name ? patient_name.split(' ')[0] : ''),
            last_name: patient_last_name || (patient_name ? patient_name.split(' ').slice(1).join(' ') : ''),
            full_name: patient_name || [patient_first_name, patient_last_name].filter(Boolean).join(' '),
            phone: patient_phone || null,
            email: patient_email || null,
        } : null,
        service: row.treatment_id ? {
            id: row.treatment_id,
            name: treatment_name || null,
            final_price: treatment_price ?? null,
            estimated_duration_minutes: treatment_duration ?? null,
        } : null,
    };
}

function appointmentSelect(schema) {
    return `SELECT da.*,
                   c.first_name AS patient_first_name,
                   c.last_name AS patient_last_name,
                   c.first_name || ' ' || c.last_name AS patient_name,
                   c.phone AS patient_phone,
                   c.email AS patient_email,
                   dt.name AS treatment_name,
                   dt.final_price AS treatment_price,
                   dt.estimated_duration_minutes AS treatment_duration
            FROM ${schema}.dental_appointments da
            LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
            LEFT JOIN ${schema}.dental_treatments dt ON dt.id = da.treatment_id`;
}

async function getAppointmentById(schema, companyId, id, client = db) {
    const result = await client.query(
        `${appointmentSelect(schema)} WHERE da.id = $1 AND da.tenant_id = $2`,
        [id, companyId]
    );
    return result.rows.length ? mapAppointment(result.rows[0]) : null;
}

async function notifyCompanyUsers(companyId, payload) {
    if (!companyId) return;
    try {
        const users = await db.query(
            `SELECT u.id
             FROM public.company_users cu
             JOIN public.users u ON u.id = cu.user_id
             WHERE cu.company_id = $1 AND u.is_active = TRUE`,
            [companyId]
        );

        await Promise.all(users.rows.map(({ id }) => createNotification({
            userId: id,
            companyId,
            category: 'dental',
            ...payload,
        })));
    } catch (err) {
        console.error('[appointmentsController.notifyCompanyUsers] Error:', err.message);
    }
}

function appointmentLabel(appointment) {
    return appointment?.customer?.full_name || 'Paciente dental';
}

function actionUrl(id) {
    return `/dental/appointments${id ? `?appointment_id=${id}` : ''}`;
}

exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { status, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query;
        const params = [companyId];
        const conditions = ['da.tenant_id = $1'];

        if (status) { params.push(status); conditions.push(`da.status = $${params.length}`); }
        if (customer_id) { params.push(parseInt(customer_id)); conditions.push(`da.customer_id = $${params.length}`); }
        if (date_from) { params.push(date_from); conditions.push(`DATE(da.scheduled_start) >= $${params.length}`); }
        if (date_to) { params.push(date_to); conditions.push(`DATE(da.scheduled_start) <= $${params.length}`); }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        params.push(limitNum, offset);

        const result = await db.query(
            `${appointmentSelect(schema)}
             ${where}
             ORDER BY da.scheduled_start DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(`SELECT COUNT(*) FROM ${schema}.dental_appointments da ${where}`, countParams);
        res.json({ data: result.rows.map(mapAppointment), total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('appointmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar citas') });
    }
};

exports.getByDay = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const result = await db.query(
            `${appointmentSelect(schema)}
             WHERE da.tenant_id = $1 AND DATE(da.scheduled_start) = $2
             ORDER BY da.scheduled_start ASC`,
            [companyId, date]
        );
        res.json({ data: result.rows.map(mapAppointment) });
    } catch (err) {
        console.error('appointmentsController.getByDay error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener citas del día') });
    }
};

exports.getByMonth = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const now = new Date();
        const year  = parseInt(req.query.year  || now.getFullYear());
        const month = parseInt(req.query.month || (now.getMonth() + 1));
        const result = await db.query(
            `${appointmentSelect(schema)}
             WHERE da.tenant_id = $1
               AND EXTRACT(YEAR FROM da.scheduled_start) = $2
               AND EXTRACT(MONTH FROM da.scheduled_start) = $3
             ORDER BY da.scheduled_start ASC`,
            [companyId, year, month]
        );
        res.json({ data: result.rows.map(mapAppointment) });
    } catch (err) {
        console.error('appointmentsController.getByMonth error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener citas del mes') });
    }
};

exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const { customer_id, treatment_id = null, scheduled_start, scheduled_end, reason = null, notes = null, status = 'scheduled' } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });
        if (!scheduled_start) return res.status(400).json({ error: 'scheduled_start es requerido' });
        if (!scheduled_end) return res.status(400).json({ error: 'scheduled_end es requerido' });
        if (!APPOINTMENT_STATUSES.includes(status)) return res.status(400).json({ code: 'DENTAL_INVALID_APPOINTMENT_STATUS', error: 'Estado de cita inválido' });
        if (new Date(scheduled_end) <= new Date(scheduled_start)) return res.status(400).json({ code: 'DENTAL_INVALID_SCHEDULE', error: 'scheduled_end debe ser posterior a scheduled_start' });

        const result = await db.query(
            `INSERT INTO ${schema}.dental_appointments
             (tenant_id, customer_id, treatment_id, scheduled_start, scheduled_end, reason, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [companyId, customer_id, treatment_id || null, scheduled_start, scheduled_end, reason, notes, status]
        );
        const appointment = await getAppointmentById(schema, companyId, result.rows[0].id);
        notifyCompanyUsers(companyId, { type: 'info', title: 'Nueva cita dental', body: `${appointmentLabel(appointment)} tiene una cita programada.`, actionUrl: actionUrl(appointment.id) });
        res.status(201).json(appointment);
    } catch (err) {
        console.error('appointmentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear cita') });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const appointment = await getAppointmentById(schema, companyId, req.params.id);
        if (!appointment) return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        res.json({ data: appointment });
    } catch (err) {
        console.error('appointmentsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener cita') });
    }
};

exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const { treatment_id, scheduled_start, scheduled_end, reason, notes, status } = req.body;
        const existing = await getAppointmentById(schema, companyId, req.params.id);
        if (!existing) return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });

        const nextStart = scheduled_start || existing.scheduled_start;
        const nextEnd = scheduled_end || existing.scheduled_end;
        if (new Date(nextEnd) <= new Date(nextStart)) return res.status(400).json({ code: 'DENTAL_INVALID_SCHEDULE', error: 'scheduled_end debe ser posterior a scheduled_start' });
        if (status && !APPOINTMENT_STATUSES.includes(status)) return res.status(400).json({ code: 'DENTAL_INVALID_APPOINTMENT_STATUS', error: 'Estado de cita inválido' });

        const result = await db.query(
            `UPDATE ${schema}.dental_appointments
             SET treatment_id = COALESCE($1, treatment_id), scheduled_start = COALESCE($2, scheduled_start), scheduled_end = COALESCE($3, scheduled_end),
                 reason = COALESCE($4, reason), notes = COALESCE($5, notes), status = COALESCE($6, status), updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND tenant_id = $8
             RETURNING id`,
            [treatment_id !== undefined && treatment_id !== '' ? treatment_id : null, scheduled_start || null, scheduled_end || null, reason !== undefined ? reason : null, notes !== undefined ? notes : null, status || null, req.params.id, companyId]
        );
        const appointment = await getAppointmentById(schema, companyId, result.rows[0].id);
        const scheduleChanged = scheduled_start && scheduled_start !== existing.scheduled_start;
        notifyCompanyUsers(companyId, { type: scheduleChanged ? 'warning' : 'info', title: scheduleChanged ? 'Cita dental reprogramada' : 'Cita dental actualizada', body: `${appointmentLabel(appointment)} tiene cambios en su cita dental.`, actionUrl: actionUrl(appointment.id) });
        res.json(appointment);
    } catch (err) {
        console.error('appointmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar cita') });
    }
};

async function updateStatusAndNotify(req, res, status, notification) {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const result = await db.query(
            `UPDATE ${schema}.dental_appointments SET status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2 RETURNING id`,
            [req.params.id, companyId, status]
        );
        if (result.rows.length === 0) return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        const appointment = await getAppointmentById(schema, companyId, result.rows[0].id);
        notifyCompanyUsers(companyId, { ...notification(appointment), actionUrl: actionUrl(appointment.id) });
        res.json(appointment);
    } catch (err) {
        console.error(`appointmentsController.${status} error:`, err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar estado de cita') });
    }
}

exports.confirm = (req, res) => updateStatusAndNotify(req, res, 'confirmed', appointment => ({ type: 'success', category: 'dental', title: 'Cita dental confirmada', body: `${appointmentLabel(appointment)} confirmó su cita dental.` }));

exports.cancel = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const existing = await db.query(`SELECT status FROM ${schema}.dental_appointments WHERE id = $1 AND tenant_id = $2`, [req.params.id, companyId]);
        if (existing.rows.length === 0) return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' });
        if (['cancelled', 'completed'].includes(existing.rows[0].status)) return res.status(400).json({ code: 'DENTAL_APPOINTMENT_CANNOT_CANCEL', error: `No se puede cancelar una cita en estado '${existing.rows[0].status}'` });
        const result = await db.query(`UPDATE ${schema}.dental_appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2 RETURNING id`, [req.params.id, companyId]);
        const appointment = await getAppointmentById(schema, companyId, result.rows[0].id);
        notifyCompanyUsers(companyId, { type: 'warning', title: 'Cita dental cancelada', body: `${appointmentLabel(appointment)} tiene una cita dental cancelada.`, actionUrl: actionUrl(appointment.id) });
        res.json(appointment);
    } catch (err) {
        console.error('appointmentsController.cancel error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al cancelar cita') });
    }
};

exports.noShow = (req, res) => updateStatusAndNotify(req, res, 'no_show', appointment => ({ type: 'warning', category: 'dental', title: 'Paciente no asistió', body: `${appointmentLabel(appointment)} fue marcado como no asistió.` }));

exports.convertToConsultation = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const { reason, notes } = req.body || {};
        await client.query('BEGIN');
        const appt = await client.query(`SELECT * FROM ${schema}.dental_appointments WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, [req.params.id, companyId]);
        if (appt.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ code: 'DENTAL_APPOINTMENT_NOT_FOUND', error: 'Cita no encontrada' }); }
        const a = appt.rows[0];
        if (a.status === 'cancelled' || a.status === 'completed') { await client.query('ROLLBACK'); return res.status(400).json({ code: 'DENTAL_APPOINTMENT_CANNOT_CONVERT', error: `No se puede convertir una cita en estado '${a.status}'` }); }

        const consResult = await client.query(
            `INSERT INTO ${schema}.dental_consultations
             (tenant_id, customer_id, appointment_id, treatment_id, reason, clinical_notes, status, consultation_date, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, 'en_evaluacion', NOW(), $7)
             RETURNING *`,
            [companyId, a.customer_id, a.id, a.treatment_id || null, reason || a.reason, notes || a.notes, req.user?.id || null]
        );
        const consultation = consResult.rows[0];

        if (a.treatment_id) {
            const trtResult = await client.query(`SELECT name, final_price FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`, [a.treatment_id, companyId]);
            if (trtResult.rows.length > 0) {
                const trt = trtResult.rows[0];
                await client.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, created_by)
                     VALUES ($1, $2, $3, $4, $5, 1, $5, 'active', $6)`,
                    [companyId, consultation.id, a.treatment_id, trt.name, parseFloat(trt.final_price) || 0, req.user?.id || null]
                );
            }
        }

        await client.query(`UPDATE ${schema}.dental_appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2`, [a.id, companyId]);
        await client.query('COMMIT');

        const appointment = await getAppointmentById(schema, companyId, a.id);
        notifyCompanyUsers(companyId, { type: 'success', title: 'Cita convertida a consulta', body: `${appointmentLabel(appointment)} ya tiene una consulta dental iniciada.`, actionUrl: `/dental/consultations/${consultation.id}` });
        res.status(201).json({ data: consultation, appointment });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore rollback errors */ }
        console.error('appointmentsController.convertToConsultation error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al convertir cita a consulta') });
    } finally {
        client.release();
    }
};
