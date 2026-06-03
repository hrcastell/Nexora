const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const VALID_SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

/**
 * Verifies the consultation exists and belongs to the tenant.
 * Returns the consultation row or throws a structured error.
 */
async function requireConsultation(schema, companyId, consultationId) {
    const result = await db.query(
        `SELECT * FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
        [consultationId, companyId]
    );
    if (result.rows.length === 0) {
        const err = new Error('Consulta no encontrada');
        err.statusCode = 404;
        err.code = 'DENTAL_CONSULTATION_NOT_FOUND';
        throw err;
    }
    return result.rows[0];
}

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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar sesiones' });
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

        // Auto-increment session_number
        const maxResult = await db.query(
            `SELECT COALESCE(MAX(session_number), 0) + 1 AS next_number
             FROM ${schema}.dental_consultation_sessions
             WHERE consultation_id = $1`,
            [req.params.id]
        );
        const session_number = parseInt(maxResult.rows[0].next_number);

        const insertResult = await db.query(
            `INSERT INTO ${schema}.dental_consultation_sessions
             (tenant_id, consultation_id, session_number, session_date, professional_id, notes, evolution, next_session_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [companyId, req.params.id, session_number, session_date, professional_id, notes, evolution, next_session_date]
        );

        res.status(201).json(insertResult.rows[0]);
    } catch (err) {
        console.error('consultationSessionsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear sesión' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener sesión' });
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

        const updateResult = await db.query(
            `UPDATE ${schema}.dental_consultation_sessions
             SET session_date = $1, professional_id = $2, status = $3, notes = $4, evolution = $5,
                 next_session_date = $6, updated_at = NOW()
             WHERE id = $7 AND consultation_id = $8 AND tenant_id = $9
             RETURNING *`,
            [session_date, professional_id, status, notes, evolution, next_session_date, req.params.sid, req.params.id, companyId]
        );

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('consultationSessionsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar sesión' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al completar sesión' });
    }
};
