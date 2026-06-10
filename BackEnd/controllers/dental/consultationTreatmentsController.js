const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { requireConsultation } = require('../../utils/dentalHelpers');

/**
 * Recalculates and updates total_amount on dental_consultations
 * summing only active consultation treatments.
 * Accepts an optional pg client so callers can run this inside their
 * existing transaction.  Falls back to the pool when no client is given.
 */
async function recalcConsultationTotal(schema, consultationId, companyId, client) {
    const runner = client || db;
    await runner.query(
        `UPDATE ${schema}.dental_consultations
         SET total_amount = (
             SELECT COALESCE(SUM(subtotal), 0)
             FROM ${schema}.dental_consultation_treatments
             WHERE consultation_id = $1 AND status = 'active' AND tenant_id = $2
         ), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [consultationId, companyId]
    );
}

/**
 * GET /dental/consultations/:id/treatments
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        const result = await db.query(
            `SELECT dct.*,
                    dt.name        AS treatment_name,
                    dt.description AS treatment_description
             FROM ${schema}.dental_consultation_treatments dct
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dct.treatment_id
             WHERE dct.consultation_id = $1 AND dct.tenant_id = $2
             ORDER BY dct.created_at ASC`,
            [req.params.id, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationTreatmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar tratamientos de consulta') });
    }
};

/**
 * GET /dental/consultations/:id/treatments/total
 */
exports.getTotal = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        const result = await db.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total
             FROM ${schema}.dental_consultation_treatments
             WHERE consultation_id = $1 AND tenant_id = $2 AND status = 'active'`,
            [req.params.id, companyId]
        );

        res.json({ total: parseFloat(result.rows[0].total) });
    } catch (err) {
        console.error('consultationTreatmentsController.getTotal error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener total de tratamientos') });
    }
};

/**
 * POST /dental/consultations/:id/treatments
 * Body: { treatment_id?, treatment_name_snapshot?, unit_price?, quantity?, tooth_reference?, clinical_notes? }
 */
exports.add = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        let {
            treatment_id = null,
            treatment_name_snapshot = null,
            unit_price = null,
            quantity = 1,
            tooth_reference = null,
            clinical_notes = null
        } = req.body;

        quantity = parseInt(quantity) || 1;

        // Resolve treatment info if treatment_id is provided
        if (treatment_id) {
            const trtResult = await db.query(
                `SELECT * FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                [treatment_id, companyId]
            );
            if (trtResult.rows.length === 0) {
                return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
            }
            const trt = trtResult.rows[0];
            if (!treatment_name_snapshot) treatment_name_snapshot = trt.name;
            if (unit_price === null || unit_price === undefined) unit_price = parseFloat(trt.final_price);
        }

        unit_price = parseFloat(unit_price);

        if (!unit_price || unit_price <= 0) {
            return res.status(400).json({ error: 'unit_price debe ser mayor a 0' });
        }
        if (quantity < 1) {
            return res.status(400).json({ error: 'quantity debe ser al menos 1' });
        }

        const subtotal = unit_price * quantity;

        const addClient = await db.getClient();
        let insertResult;
        try {
            await addClient.query('BEGIN');

            insertResult = await addClient.query(
                `INSERT INTO ${schema}.dental_consultation_treatments
                 (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, tooth_reference, clinical_notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
                 RETURNING *`,
                [companyId, req.params.id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, tooth_reference, clinical_notes]
            );

            await recalcConsultationTotal(schema, req.params.id, companyId, addClient);

            await addClient.query('COMMIT');
        } catch (txErr) {
            await addClient.query('ROLLBACK');
            throw txErr;
        } finally {
            addClient.release();
        }

        res.status(201).json(insertResult.rows[0]);
    } catch (err) {
        console.error('consultationTreatmentsController.add error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al agregar tratamiento a consulta') });
    }
};

/**
 * PATCH /dental/consultations/:id/treatments/:sid
 * Body: { unit_price?, quantity?, tooth_reference?, clinical_notes? }
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_treatments
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONS_TREATMENT_NOT_FOUND', error: 'Tratamiento de consulta no encontrado' });
        }

        const row = existing.rows[0];

        if (row.status !== 'active') {
            return res.status(400).json({ code: 'DENTAL_CONS_TREATMENT_VOIDED', error: 'No se puede editar un tratamiento anulado' });
        }

        const unit_price = req.body.unit_price !== undefined ? parseFloat(req.body.unit_price) : parseFloat(row.unit_price);
        const quantity   = req.body.quantity   !== undefined ? parseInt(req.body.quantity)     : parseInt(row.quantity);
        const tooth_reference  = req.body.tooth_reference  !== undefined ? req.body.tooth_reference  : row.tooth_reference;
        const clinical_notes   = req.body.clinical_notes   !== undefined ? req.body.clinical_notes   : row.clinical_notes;

        if (unit_price <= 0) {
            return res.status(400).json({ error: 'unit_price debe ser mayor a 0' });
        }
        if (quantity < 1) {
            return res.status(400).json({ error: 'quantity debe ser al menos 1' });
        }

        const subtotal = unit_price * quantity;

        const updateClient = await db.getClient();
        let updateResult;
        try {
            await updateClient.query('BEGIN');

            updateResult = await updateClient.query(
                `UPDATE ${schema}.dental_consultation_treatments
                 SET unit_price = $1, quantity = $2, subtotal = $3, tooth_reference = $4, clinical_notes = $5, updated_at = NOW()
                 WHERE id = $6 AND consultation_id = $7 AND tenant_id = $8
                 RETURNING *`,
                [unit_price, quantity, subtotal, tooth_reference, clinical_notes, req.params.sid, req.params.id, companyId]
            );

            await recalcConsultationTotal(schema, req.params.id, companyId, updateClient);

            await updateClient.query('COMMIT');
        } catch (txErr) {
            await updateClient.query('ROLLBACK');
            throw txErr;
        } finally {
            updateClient.release();
        }

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('consultationTreatmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar tratamiento de consulta') });
    }
};

/**
 * DELETE /dental/consultations/:id/treatments/:sid
 * Soft-delete (void). Blocked if paid_amount > 0 on any charge for this consultation.
 */
exports.void = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_treatments
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONS_TREATMENT_NOT_FOUND', error: 'Tratamiento de consulta no encontrado' });
        }

        // Block void if the consultation has any charge with paid_amount > 0
        const chargeCheck = await db.query(
            `SELECT id FROM ${schema}.dental_charges
             WHERE consultation_id = $1 AND tenant_id = $2 AND paid_amount > 0
             LIMIT 1`,
            [req.params.id, companyId]
        );
        if (chargeCheck.rows.length > 0) {
            return res.status(409).json({
                code: 'DENTAL_CONS_TREATMENT_HAS_PAYMENTS',
                error: 'No se puede eliminar este tratamiento porque la consulta ya tiene pagos registrados. Para modificar los tratamientos, primero revertí los pagos existentes.'
            });
        }

        const voidClient = await db.getClient();
        try {
            await voidClient.query('BEGIN');

            await voidClient.query(
                `UPDATE ${schema}.dental_consultation_treatments
                 SET status = 'voided', updated_at = NOW()
                 WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
                [req.params.sid, req.params.id, companyId]
            );

            await recalcConsultationTotal(schema, req.params.id, companyId, voidClient);

            await voidClient.query('COMMIT');
        } catch (txErr) {
            await voidClient.query('ROLLBACK');
            throw txErr;
        } finally {
            voidClient.release();
        }

        res.json({ message: 'Tratamiento anulado' });
    } catch (err) {
        console.error('consultationTreatmentsController.void error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al anular tratamiento de consulta') });
    }
};
