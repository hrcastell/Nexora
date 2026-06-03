const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Recalculates and updates total_amount on dental_consultations
 * summing only active consultation services.
 */
async function recalcConsultationTotal(schema, consultationId) {
    await db.query(
        `UPDATE ${schema}.dental_consultations
         SET total_amount = (
             SELECT COALESCE(SUM(subtotal), 0)
             FROM ${schema}.dental_consultation_services
             WHERE consultation_id = $1 AND status = 'active'
         ), updated_at = NOW()
         WHERE id = $1`,
        [consultationId]
    );
}

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
 * GET /dental/consultations/:id/services
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        const result = await db.query(
            `SELECT dcs.*,
                    ds.name        AS service_name,
                    ds.description AS service_description
             FROM ${schema}.dental_consultation_services dcs
             LEFT JOIN ${schema}.dental_services ds ON ds.id = dcs.service_id
             WHERE dcs.consultation_id = $1 AND dcs.tenant_id = $2
             ORDER BY dcs.created_at ASC`,
            [req.params.id, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationServicesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar servicios de consulta' });
    }
};

/**
 * GET /dental/consultations/:id/services/total
 */
exports.getTotal = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        const result = await db.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total
             FROM ${schema}.dental_consultation_services
             WHERE consultation_id = $1 AND tenant_id = $2 AND status = 'active'`,
            [req.params.id, companyId]
        );

        res.json({ total: parseFloat(result.rows[0].total) });
    } catch (err) {
        console.error('consultationServicesController.getTotal error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener total de servicios' });
    }
};

/**
 * POST /dental/consultations/:id/services
 * Body: { service_id?, service_name_snapshot?, unit_price?, quantity?, tooth_reference?, clinical_notes? }
 */
exports.add = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        await requireConsultation(schema, companyId, req.params.id);

        let {
            service_id = null,
            service_name_snapshot = null,
            unit_price = null,
            quantity = 1,
            tooth_reference = null,
            clinical_notes = null
        } = req.body;

        quantity = parseInt(quantity) || 1;

        // Resolve service info if service_id is provided
        if (service_id) {
            const svcResult = await db.query(
                `SELECT * FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            if (svcResult.rows.length === 0) {
                return res.status(404).json({ code: 'DENTAL_SERVICE_NOT_FOUND', error: 'Servicio no encontrado' });
            }
            const svc = svcResult.rows[0];
            if (!service_name_snapshot) service_name_snapshot = svc.name;
            if (unit_price === null || unit_price === undefined) unit_price = parseFloat(svc.final_price);
        }

        unit_price = parseFloat(unit_price);

        if (!unit_price || unit_price <= 0) {
            return res.status(400).json({ error: 'unit_price debe ser mayor a 0' });
        }
        if (quantity < 1) {
            return res.status(400).json({ error: 'quantity debe ser al menos 1' });
        }

        const subtotal = unit_price * quantity;

        const insertResult = await db.query(
            `INSERT INTO ${schema}.dental_consultation_services
             (tenant_id, consultation_id, service_id, service_name_snapshot, unit_price, quantity, subtotal, status, tooth_reference, clinical_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
             RETURNING *`,
            [companyId, req.params.id, service_id, service_name_snapshot, unit_price, quantity, subtotal, tooth_reference, clinical_notes]
        );

        await recalcConsultationTotal(schema, req.params.id);

        res.status(201).json(insertResult.rows[0]);
    } catch (err) {
        console.error('consultationServicesController.add error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar servicio a consulta' });
    }
};

/**
 * PATCH /dental/consultations/:id/services/:sid
 * Body: { unit_price?, quantity?, tooth_reference?, clinical_notes? }
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_services
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONS_SERVICE_NOT_FOUND', error: 'Servicio de consulta no encontrado' });
        }

        const row = existing.rows[0];

        if (row.status !== 'active') {
            return res.status(400).json({ code: 'DENTAL_CONS_SERVICE_VOIDED', error: 'No se puede editar un servicio anulado' });
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

        const updateResult = await db.query(
            `UPDATE ${schema}.dental_consultation_services
             SET unit_price = $1, quantity = $2, subtotal = $3, tooth_reference = $4, clinical_notes = $5, updated_at = NOW()
             WHERE id = $6 AND consultation_id = $7 AND tenant_id = $8
             RETURNING *`,
            [unit_price, quantity, subtotal, tooth_reference, clinical_notes, req.params.sid, req.params.id, companyId]
        );

        await recalcConsultationTotal(schema, req.params.id);

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('consultationServicesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar servicio de consulta' });
    }
};

/**
 * DELETE /dental/consultations/:id/services/:sid
 * Soft-delete (void). Blocked if paid_amount > 0 on any charge for this consultation.
 */
exports.void = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_services
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONS_SERVICE_NOT_FOUND', error: 'Servicio de consulta no encontrado' });
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
                code: 'DENTAL_CONS_SERVICE_HAS_PAYMENTS',
                error: 'No se puede anular un servicio con pagos registrados'
            });
        }

        await db.query(
            `UPDATE ${schema}.dental_consultation_services
             SET status = 'voided', updated_at = NOW()
             WHERE id = $1 AND consultation_id = $2 AND tenant_id = $3`,
            [req.params.sid, req.params.id, companyId]
        );

        await recalcConsultationTotal(schema, req.params.id);

        res.json({ message: 'Servicio anulado' });
    } catch (err) {
        console.error('consultationServicesController.void error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al anular servicio de consulta' });
    }
};
