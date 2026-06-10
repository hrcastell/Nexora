const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { requireConsultation } = require('../../utils/dentalHelpers');

const VALID_SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

/**
 * GET /dental/consultations/:id/sessions
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_sessions
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY session_number ASC`,
            [req.params.id, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationSessionsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar sesiones') });
    }
};

/**
 * POST /dental/consultations/:id/sessions
 * Body: { session_date?, professional_id?, notes?, evolution?, next_session_date? }
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const consultation = await requireConsultation(schema, companyId, req.params.id);

        if (!consultation.requires_multiple_sessions) {
            return res.status(400).json({
                code: 'DENTAL_SESSION_NOT_ALLOWED',
                error: 'La consulta no está configurada para múltiples sesiones'
            });
        }

        const {
            session_date = null,
            professional_id = null,
            notes = null,
            evolution = null,
            next_session_date = null
        } = req.body;

        const client = await db.getClient();
        let insertResult;
        let session_number;
        try {
            await client.query('BEGIN');

            // Lock the parent consultation row to serialize concurrent session creates
            await client.query(
                `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
                [req.params.id, companyId]
            );

            const maxResult = await client.query(
                `SELECT COALESCE(MAX(session_number), 0) + 1 AS next_number
                 FROM ${schema}.dental_consultation_sessions
                 WHERE consultation_id = $1 AND tenant_id = $2`,
                [req.params.id, companyId]
            );
            session_number = parseInt(maxResult.rows[0].next_number);

            insertResult = await client.query(
                `INSERT INTO ${schema}.dental_consultation_sessions
                 (tenant_id, consultation_id, session_number, session_date, professional_id, notes, evolution, next_session_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [companyId, req.params.id, session_number, session_date, professional_id, notes, evolution, next_session_date]
            );

            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        // Also create a dental_appointment linked to this session.
        // Non-blocking: appointment failure must not roll back the session.
        if (session_date && consultation.customer_id) {
            // Resolve duration from the linked treatment; default to 60 min.
            let durationMinutes = 60;
            if (consultation.treatment_id) {
                try {
                    const trtResult = await db.query(
                        `SELECT estimated_duration_minutes FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                        [consultation.treatment_id, companyId]
                    );
                    if (trtResult.rows.length > 0 && trtResult.rows[0].estimated_duration_minutes) {
                        durationMinutes = parseInt(trtResult.rows[0].estimated_duration_minutes, 10) || 60;
                    }
                } catch (trtErr) {
                    console.warn('consultationSessionsController.create: could not read treatment duration:', trtErr.message);
                }
            }

            db.query(
                `INSERT INTO ${schema}.dental_appointments
                 (tenant_id, customer_id, treatment_id, scheduled_start, scheduled_end, status, reason, notes, session_id)
                 VALUES ($1, $2, $3, $4, $4::timestamp + ($5 || ' minutes')::interval, 'scheduled', $6, $7, $8)`,
                [
                    companyId,
                    consultation.customer_id,
                    consultation.treatment_id || null,
                    session_date,
                    durationMinutes,
                    `Sesión #${session_number}`,
                    notes || null,
                    insertResult.rows[0].id,
                ]
            ).catch((apptErr) => {
                console.warn('consultationSessionsController.create: appointment creation failed:', apptErr.message);
            });
        }

        res.status(201).json(insertResult.rows[0]);
    } catch (err) {
        console.error('consultationSessionsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear sesión') });
    }
};

/**
 * GET /dental/consultations/:id/sessions/:sid
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_sessions
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SESSION_NOT_FOUND', error: 'Sesión no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('consultationSessionsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener sesión') });
    }
};

/**
 * PATCH /dental/consultations/:id/sessions/:sid
 * Body: { session_date?, professional_id?, status?, notes?, evolution?, next_session_date? }
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_sessions
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SESSION_NOT_FOUND', error: 'Sesión no encontrada' });
        }

        const row = existing.rows[0];

        const status = req.body.status !== undefined ? req.body.status : row.status;
        if (!VALID_SESSION_STATUSES.includes(status)) {
            return res.status(400).json({
                code: 'DENTAL_SESSION_INVALID_STATUS',
                error: `status debe ser uno de: ${VALID_SESSION_STATUSES.join(', ')}`
            });
        }

        const session_date      = req.body.session_date      !== undefined ? req.body.session_date      : row.session_date;
        const professional_id   = req.body.professional_id   !== undefined ? req.body.professional_id   : row.professional_id;
        const notes             = req.body.notes             !== undefined ? req.body.notes             : row.notes;
        const evolution         = req.body.evolution         !== undefined ? req.body.evolution         : row.evolution;
        const next_session_date = req.body.next_session_date !== undefined ? req.body.next_session_date : row.next_session_date;

        const prevDate = row.session_date;

        const updateResult = await db.query(
            `UPDATE ${schema}.dental_consultation_sessions
             SET session_date = $1, professional_id = $2, status = $3, notes = $4, evolution = $5,
                 next_session_date = $6, updated_at = NOW()
             WHERE id = $7 AND consultation_id = $8 AND tenant_id = $9
             RETURNING *`,
            [session_date, professional_id, status, notes, evolution, next_session_date, req.params.sid, req.params.id, companyId]
        );

        const updatedSession = updateResult.rows[0];

        // If session_date changed: update linked appointment + create notification
        const dateChanged = session_date && String(session_date) !== String(prevDate);
        if (dateChanged) {
            // Resolve duration from the linked treatment; default to 60 min.
            let durationMinutes = 60;
            if (updatedSession.consultation_id) {
                try {
                    const consForTrt = await db.query(
                        `SELECT treatment_id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
                        [updatedSession.consultation_id, companyId]
                    );
                    const treatmentId = consForTrt.rows[0]?.treatment_id;
                    if (treatmentId) {
                        const trtResult = await db.query(
                            `SELECT estimated_duration_minutes FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                            [treatmentId, companyId]
                        );
                        if (trtResult.rows.length > 0 && trtResult.rows[0].estimated_duration_minutes) {
                            durationMinutes = parseInt(trtResult.rows[0].estimated_duration_minutes, 10) || 60;
                        }
                    }
                } catch (trtErr) {
                    console.warn('consultationSessionsController.update: could not read treatment duration:', trtErr.message);
                }
            }

            // Update the linked appointment (non-blocking)
            db.query(
                `UPDATE ${schema}.dental_appointments
                 SET scheduled_start = $1,
                     scheduled_end   = $1::timestamp + ($2 || ' minutes')::interval,
                     updated_at      = NOW()
                 WHERE session_id = $3 AND tenant_id = $4`,
                [session_date, durationMinutes, req.params.sid, companyId]
            ).catch((err) => {
                console.warn('consultationSessionsController.update: appointment sync failed:', err.message);
            });

            // Create a reminder notification for the current user
            if (req.user?.id && req.user?.company_id) {
                const fmtDate = new Date(session_date).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                });
                db.query(
                    `INSERT INTO public.notifications
                     (user_id, company_id, type, category, title, body, action_url)
                     VALUES ($1, $2, 'info', 'dental', $3, $4, $5)`,
                    [
                        req.user.id,
                        req.user.company_id,
                        `Sesión #${row.session_number} reprogramada`,
                        `La sesión fue reprogramada para el ${fmtDate}. Recordá actualizar al paciente.`,
                        `/dental/consultations/${req.params.id}`,
                    ]
                ).catch((err) => {
                    console.warn('consultationSessionsController.update: notification failed:', err.message);
                });
            }
        }

        res.json(updatedSession);
    } catch (err) {
        console.error('consultationSessionsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar sesión') });
    }
};

/**
 * POST /dental/consultations/:id/sessions/:sid/complete
 */
exports.complete = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_sessions
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_SESSION_NOT_FOUND', error: 'Sesión no encontrada' });
        }

        const row = existing.rows[0];

        if (row.status === 'completed') {
            return res.status(400).json({ code: 'DENTAL_SESSION_ALREADY_COMPLETED', error: 'La sesión ya está completada' });
        }
        if (row.status === 'cancelled') {
            return res.status(400).json({ code: 'DENTAL_SESSION_CANCELLED', error: 'No se puede completar una sesión cancelada' });
        }

        const updateResult = await db.query(
            `UPDATE ${schema}.dental_consultation_sessions
             SET status = 'completed', updated_at = NOW()
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3
             RETURNING *`,
            [req.params.sid, req.params.id, companyId]
        );

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('consultationSessionsController.complete error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al completar sesión') });
    }
};
