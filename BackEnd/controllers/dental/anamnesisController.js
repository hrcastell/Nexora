const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/consultations/:consultationId/anamnesis
 * Returns the anamnesis record for a consultation, or null if none exists yet.
 */
exports.getByConsultation = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { consultationId } = req.params;

        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1`,
            [consultationId]
        );
        if (!check.rows.length) return res.status(404).json({ message: 'Consultation not found' });

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_anamnesis WHERE consultation_id = $1 LIMIT 1`,
            [consultationId]
        );

        res.json({ data: result.rows[0] || null });
    } catch (err) {
        console.error('anamnesisController.getByConsultation error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al obtener anamnesis'),
        });
    }
};

/**
 * POST /dental/consultations/:consultationId/anamnesis
 * Upserts the anamnesis record for a consultation.
 * Body: any subset of the dental_anamnesis columns (except id, consultation_id, created_at).
 */
exports.upsert = async (req, res) => {
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

        const {
            has_diabetes              = false,
            has_hypertension          = false,
            has_heart_disease         = false,
            has_respiratory_disease   = false,
            has_kidney_disease        = false,
            has_epilepsy              = false,
            has_hepatitis             = false,
            has_hiv                   = false,
            other_systemic_conditions = null,
            has_penicillin_allergy    = false,
            has_aspirin_allergy       = false,
            has_latex_allergy         = false,
            has_anesthesia_allergy    = false,
            other_allergies           = null,
            current_medications       = null,
            takes_anticoagulants      = false,
            takes_bisphosphonates     = false,
            previous_dental_treatments = null,
            previous_complications    = null,
            last_dental_visit         = null,
            smokes                    = false,
            alcohol_consumption       = null,
            bruxism                   = false,
            additional_notes          = null,
        } = req.body;

        const result = await db.query(
            `INSERT INTO ${schema}.dental_anamnesis (
                consultation_id,
                has_diabetes, has_hypertension, has_heart_disease, has_respiratory_disease,
                has_kidney_disease, has_epilepsy, has_hepatitis, has_hiv, other_systemic_conditions,
                has_penicillin_allergy, has_aspirin_allergy, has_latex_allergy, has_anesthesia_allergy,
                other_allergies, current_medications, takes_anticoagulants, takes_bisphosphonates,
                previous_dental_treatments, previous_complications, last_dental_visit,
                smokes, alcohol_consumption, bruxism, additional_notes,
                created_at, updated_at
            ) VALUES (
                $1,
                $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25,
                NOW(), NOW()
            )
            ON CONFLICT (consultation_id) DO UPDATE SET
                has_diabetes              = EXCLUDED.has_diabetes,
                has_hypertension          = EXCLUDED.has_hypertension,
                has_heart_disease         = EXCLUDED.has_heart_disease,
                has_respiratory_disease   = EXCLUDED.has_respiratory_disease,
                has_kidney_disease        = EXCLUDED.has_kidney_disease,
                has_epilepsy              = EXCLUDED.has_epilepsy,
                has_hepatitis             = EXCLUDED.has_hepatitis,
                has_hiv                   = EXCLUDED.has_hiv,
                other_systemic_conditions = EXCLUDED.other_systemic_conditions,
                has_penicillin_allergy    = EXCLUDED.has_penicillin_allergy,
                has_aspirin_allergy       = EXCLUDED.has_aspirin_allergy,
                has_latex_allergy         = EXCLUDED.has_latex_allergy,
                has_anesthesia_allergy    = EXCLUDED.has_anesthesia_allergy,
                other_allergies           = EXCLUDED.other_allergies,
                current_medications       = EXCLUDED.current_medications,
                takes_anticoagulants      = EXCLUDED.takes_anticoagulants,
                takes_bisphosphonates     = EXCLUDED.takes_bisphosphonates,
                previous_dental_treatments = EXCLUDED.previous_dental_treatments,
                previous_complications    = EXCLUDED.previous_complications,
                last_dental_visit         = EXCLUDED.last_dental_visit,
                smokes                    = EXCLUDED.smokes,
                alcohol_consumption       = EXCLUDED.alcohol_consumption,
                bruxism                   = EXCLUDED.bruxism,
                additional_notes          = EXCLUDED.additional_notes,
                updated_at                = NOW()
            RETURNING *`,
            [
                consultationId,
                has_diabetes, has_hypertension, has_heart_disease, has_respiratory_disease,
                has_kidney_disease, has_epilepsy, has_hepatitis, has_hiv, other_systemic_conditions,
                has_penicillin_allergy, has_aspirin_allergy, has_latex_allergy, has_anesthesia_allergy,
                other_allergies, current_medications, takes_anticoagulants, takes_bisphosphonates,
                previous_dental_treatments, previous_complications, last_dental_visit || null,
                smokes, alcohol_consumption, bruxism, additional_notes,
            ]
        );

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('anamnesisController.upsert error:', err.message);
        res.status(err.statusCode || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : (err.message || 'Error al guardar anamnesis'),
        });
    }
};
