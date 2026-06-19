const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/consultations/:consultationId/diagnoses
 */
exports.listByConsultation = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { consultationId } = req.params;

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [consultationId, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const result = await db.query(
            `SELECT dd.*,
                    doe.tooth_number AS odontogram_tooth,
                    doe.finding_type AS odontogram_finding
             FROM ${schema}.dental_diagnoses dd
             LEFT JOIN ${schema}.dental_odontogram_entries doe ON doe.id = dd.odontogram_entry_id
             WHERE dd.consultation_id = $1
             ORDER BY dd.created_at DESC`,
            [consultationId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('diagnosesController.listByConsultation error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar diagnósticos') });
    }
};

/**
 * POST /dental/consultations/:consultationId/diagnoses
 * Body: { diagnosis_text, diagnosis_code?, severity?, notes?, odontogram_entry_id? }
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { consultationId } = req.params;
        const { diagnosis_text, diagnosis_code = null, severity = 'moderate', notes = null, odontogram_entry_id = null } = req.body;

        if (!diagnosis_text || !diagnosis_text.trim()) {
            return res.status(400).json({ error: 'diagnosis_text es requerido' });
        }

        const VALID_SEVERITIES = ['mild', 'moderate', 'severe'];
        const resolvedSeverity = VALID_SEVERITIES.includes(severity) ? severity : 'moderate';

        const resolvedEntryId = odontogram_entry_id != null ? parseInt(odontogram_entry_id, 10) : null;
        if (odontogram_entry_id != null && isNaN(resolvedEntryId)) {
            return res.status(400).json({ error: 'Invalid odontogram_entry_id' });
        }

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [consultationId, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        if (resolvedEntryId !== null) {
            const entryCheck = await db.query(
                `SELECT id FROM ${schema}.dental_odontogram_entries WHERE id = $1 AND consultation_id = $2`,
                [resolvedEntryId, consultationId]
            );
            if (!entryCheck.rows.length) {
                return res.status(400).json({ error: 'Odontogram entry does not belong to this consultation' });
            }
        }

        const result = await db.query(
            `INSERT INTO ${schema}.dental_diagnoses
             (consultation_id, odontogram_entry_id, diagnosis_code, diagnosis_text, severity, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [consultationId, resolvedEntryId, diagnosis_code, diagnosis_text.trim(), resolvedSeverity, notes]
        );

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        console.error('diagnosesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear diagnóstico') });
    }
};

/**
 * DELETE /dental/consultations/:consultationId/diagnoses/:id
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { consultationId, id } = req.params;

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [consultationId, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const result = await db.query(
            `DELETE FROM ${schema}.dental_diagnoses
             WHERE id = $1 AND consultation_id = $2
             RETURNING id`,
            [id, consultationId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ code: 'DENTAL_DIAGNOSIS_NOT_FOUND', error: 'Diagnóstico no encontrado' });
        }

        res.json({ message: 'Diagnóstico eliminado' });
    } catch (err) {
        console.error('diagnosesController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar diagnóstico') });
    }
};
