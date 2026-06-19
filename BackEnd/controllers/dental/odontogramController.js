const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/patients/:patientId/odontogram
 * Returns all odontogram entries for a patient.
 */
exports.getPatientOdontogram = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { patientId } = req.params;

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_odontogram_entries
             WHERE patient_id = $1
             ORDER BY tooth_number, created_at`,
            [patientId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('odontogramController.getPatientOdontogram error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al obtener odontograma del paciente'),
        });
    }
};

/**
 * GET /dental/consultations/:consultationId/odontogram
 * Returns all odontogram entries for a specific consultation.
 */
exports.getConsultationOdontogram = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { consultationId } = req.params;

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_odontogram_entries
             WHERE consultation_id = $1
             ORDER BY tooth_number, created_at`,
            [consultationId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('odontogramController.getConsultationOdontogram error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al obtener odontograma de consulta'),
        });
    }
};

/**
 * POST /dental/consultations/:consultationId/odontogram
 * Creates or updates an odontogram entry.
 * If `id` is in the body → UPDATE; otherwise → INSERT.
 */
exports.upsertEntry = async (req, res) => {
    try {
        if (req.user?.read_only) {
            return res.status(403).json({ error: 'Operacion no permitida en modo solo lectura' });
        }

        const { schema } = await resolveSchema(req);
        const { consultationId } = req.params;
        const {
            id,
            tooth_number,
            surface = null,
            finding_type,
            finding_status = 'active',
            priority = 'normal',
            observation = null,
            procedure_suggestion_id = null,
        } = req.body;

        if (!tooth_number || !finding_type) {
            return res.status(400).json({
                error: 'Los campos tooth_number y finding_type son obligatorios',
            });
        }

        const consultationRow = await db.query(
            `SELECT customer_id FROM ${schema}.dental_consultations WHERE id = $1`,
            [consultationId]
        );
        if (!consultationRow.rows.length) return res.status(404).json({ message: 'Consultation not found' });
        const patientId = consultationRow.rows[0].customer_id;

        let result;

        if (id) {
            result = await db.query(
                `UPDATE ${schema}.dental_odontogram_entries
                 SET surface = $1,
                     finding_type = $2,
                     finding_status = $3,
                     priority = $4,
                     observation = $5,
                     procedure_suggestion_id = $6,
                     updated_at = NOW()
                 WHERE id = $7 AND consultation_id = $8
                 RETURNING *`,
                [surface, finding_type, finding_status, priority, observation, procedure_suggestion_id, id, consultationId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Entrada de odontograma no encontrada' });
            }
        } else {
            result = await db.query(
                `INSERT INTO ${schema}.dental_odontogram_entries
                    (patient_id, consultation_id, tooth_number, surface, finding_type,
                     finding_status, priority, observation, procedure_suggestion_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [patientId, consultationId, tooth_number, surface, finding_type,
                 finding_status, priority, observation, procedure_suggestion_id]
            );
        }

        res.status(id ? 200 : 201).json({ data: result.rows[0] });
    } catch (err) {
        console.error('odontogramController.upsertEntry error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al guardar entrada de odontograma'),
        });
    }
};

/**
 * DELETE /dental/consultations/:consultationId/odontogram/:entryId
 * Deletes an odontogram entry. Validates ownership via consultation_id.
 */
exports.deleteEntry = async (req, res) => {
    try {
        if (req.user?.read_only) {
            return res.status(403).json({ error: 'Operacion no permitida en modo solo lectura' });
        }

        const { schema } = await resolveSchema(req);
        const { consultationId, entryId } = req.params;

        const result = await db.query(
            `DELETE FROM ${schema}.dental_odontogram_entries
             WHERE id = $1 AND consultation_id = $2
             RETURNING id`,
            [entryId, consultationId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Entrada de odontograma no encontrada' });
        }

        res.json({ data: { id: Number(entryId) } });
    } catch (err) {
        console.error('odontogramController.deleteEntry error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al eliminar entrada de odontograma'),
        });
    }
};
