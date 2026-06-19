const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/consultations/:consultationId/prescriptions
 * Returns all prescriptions for a consultation, newest first.
 */
exports.listByConsultation = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { consultationId } = req.params;

        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1`,
            [consultationId]
        );
        if (!check.rows.length) return res.status(404).json({ message: 'Consultation not found' });

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_prescriptions
             WHERE consultation_id = $1
             ORDER BY created_at DESC`,
            [consultationId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('prescriptionsController.listByConsultation error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al obtener prescripciones'),
        });
    }
};

/**
 * POST /dental/consultations/:consultationId/prescriptions
 * Creates a new prescription. Returns the created row.
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) {
            return res.status(403).json({ error: 'Operacion no permitida en modo solo lectura' });
        }

        const { schema } = await resolveSchema(req);
        const { consultationId } = req.params;

        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1`,
            [consultationId]
        );
        if (!check.rows.length) return res.status(404).json({ message: 'Consultation not found' });

        const { medication, dosage, frequency, duration, route = null, instructions = null } = req.body;

        if (!medication || !dosage || !frequency || !duration) {
            return res.status(400).json({ error: 'Los campos medicamento, dosis, frecuencia y duracion son obligatorios' });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.dental_prescriptions
                (consultation_id, medication, dosage, frequency, duration, route, instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [consultationId, medication, dosage, frequency, duration, route, instructions]
        );

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        console.error('prescriptionsController.create error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al crear prescripcion'),
        });
    }
};

/**
 * DELETE /dental/consultations/:consultationId/prescriptions/:prescriptionId
 * Deletes a prescription. Verifies ownership via consultation_id.
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) {
            return res.status(403).json({ error: 'Operacion no permitida en modo solo lectura' });
        }

        const { schema } = await resolveSchema(req);
        const { consultationId, prescriptionId } = req.params;

        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1`,
            [consultationId]
        );
        if (!check.rows.length) return res.status(404).json({ message: 'Consultation not found' });

        const result = await db.query(
            `DELETE FROM ${schema}.dental_prescriptions
             WHERE id = $1 AND consultation_id = $2
             RETURNING id`,
            [prescriptionId, consultationId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Prescripcion no encontrada' });
        }

        res.json({ data: { id: Number(prescriptionId) } });
    } catch (err) {
        console.error('prescriptionsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al eliminar prescripcion'),
        });
    }
};
