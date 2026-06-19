const path = require('path');
const fs   = require('fs');
const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { makeDentalUpload } = require('../../utils/upload');

const photoUpload = makeDentalUpload('photos');

/**
 * GET /dental/consultations
 * Query: ?status=, ?administrative_status=, ?customer_id=, ?date_from=, ?date_to=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { status, administrative_status, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query;

        const params = [companyId];
        const conditions = ['dc.tenant_id = $1'];

        if (status) {
            params.push(status);
            conditions.push(`dc.status = $${params.length}`);
        }
        if (administrative_status) {
            params.push(administrative_status);
            conditions.push(`dc.administrative_status = $${params.length}`);
        }
        if (customer_id) {
            params.push(parseInt(customer_id));
            conditions.push(`dc.customer_id = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`DATE(dc.consultation_date) >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`DATE(dc.consultation_date) <= $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        params.push(limitNum, offset);

        const result = await db.query(
            `SELECT dc.*,
                    c.first_name,
                    c.last_name,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    dt.name AS treatment_name
             FROM ${schema}.dental_consultations dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dc.treatment_id
             ${where}
             ORDER BY dc.consultation_date DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.dental_consultations dc ${where}`,
            countParams
        );

        const rows = result.rows.map(({ patient_name, first_name, last_name, treatment_name, ...rest }) => ({
            ...rest,
            customer:  { full_name: patient_name, first_name: first_name ?? '', last_name: last_name ?? '' },
            treatment: treatment_name ? { name: treatment_name } : null
        }));

        res.json({ data: rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('consultationsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar consultas') });
    }
};

/**
 * POST /dental/consultations
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            customer_id,
            appointment_id = null,
            reason = null,
            diagnosis = null,
            clinical_notes = null,
            indications = null,
            total_amount = 0,
            requires_follow_up = false,
            requires_multiple_sessions = false,
            estimated_sessions = null,
            next_session_date = null,
            follow_up_notes = null,
            professional_id = null,
        } = req.body;

        // Normalize: empty string from frontend select treated as null
        const treatment_id = req.body.treatment_id || null;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });

        const txClient = await db.getClient();
        let consultation;
        try {
            await txClient.query('BEGIN');

            const result = await txClient.query(
                `INSERT INTO ${schema}.dental_consultations
                 (tenant_id, customer_id, appointment_id, treatment_id, reason, diagnosis, clinical_notes, indications, total_amount, status, consultation_date,
                  requires_follow_up, requires_multiple_sessions, estimated_sessions, next_session_date, follow_up_notes, professional_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'en_evaluacion', NOW(),
                         $10, $11, $12, $13, $14, $15, $16)
                 RETURNING *`,
                [companyId, customer_id, appointment_id, treatment_id, reason, diagnosis, clinical_notes, indications, parseFloat(total_amount) || 0,
                 requires_follow_up, requires_multiple_sessions, estimated_sessions, next_session_date, follow_up_notes, professional_id, req.user?.id || null]
            );

            consultation = result.rows[0];

            // Auto-seed dental_consultation_treatments if treatment_id was provided
            if (treatment_id) {
                const trtResult = await txClient.query(
                    `SELECT name, final_price FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                    [treatment_id, companyId]
                );
                if (trtResult.rows.length > 0) {
                    const trt = trtResult.rows[0];
                    await txClient.query(
                        `INSERT INTO ${schema}.dental_consultation_treatments
                         (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, created_by)
                         VALUES ($1, $2, $3, $4, $5, 1, $5, 'active', $6)`,
                        [companyId, consultation.id, treatment_id, trt.name, parseFloat(trt.final_price) || 0, req.user?.id || null]
                    );
                }
            }

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        res.status(201).json(consultation);
    } catch (err) {
        console.error('consultationsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear consulta') });
    }
};

/**
 * GET /dental/consultations/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT dc.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone,
                    dt.name AS treatment_name
             FROM ${schema}.dental_consultations dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dc.treatment_id
             WHERE dc.id = $1 AND dc.tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        // Consultation treatments (multi-treatment billable items)
        const consultation_treatments = await db.query(
            `SELECT dct.*,
                    dt.name AS treatment_name_current
             FROM ${schema}.dental_consultation_treatments dct
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dct.treatment_id
             WHERE dct.consultation_id = $1 AND dct.tenant_id = $2
             ORDER BY dct.created_at ASC`,
            [req.params.id, companyId]
        );

        // Charges
        const charges = await db.query(
            `SELECT * FROM ${schema}.dental_charges
             WHERE consultation_id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        // Sessions
        const sessions = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_sessions
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY session_number ASC`,
            [req.params.id, companyId]
        );

        res.json({
            data: {
                ...result.rows[0],
                consultation_treatments: consultation_treatments.rows,
                charges: charges.rows,
                sessions: sessions.rows
            }
        });
    } catch (err) {
        console.error('consultationsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener consulta') });
    }
};

/**
 * PATCH /dental/consultations/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            treatment_id, reason, diagnosis, clinical_notes, indications, total_amount, administrative_status,
            requires_follow_up, requires_multiple_sessions, estimated_sessions,
            next_session_date, follow_up_notes, professional_id
        } = req.body;

        // Fetch current consultation to detect treatment_id change
        const existing = await db.query(
            `SELECT treatment_id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const normalizedNewTreatmentId  = (treatment_id != null && treatment_id !== '') ? parseInt(treatment_id, 10) : null;
        const normalizedCurrTreatmentId = existing.rows[0].treatment_id ?? null;
        const treatmentChanged = treatment_id !== undefined && normalizedNewTreatmentId !== normalizedCurrTreatmentId;

        // If treatment changed, resolve new total_amount from treatment final_price
        let resolvedTotalAmount = total_amount !== undefined ? parseFloat(total_amount) : null;
        if (treatmentChanged && resolvedTotalAmount === null) {
            const trtResult = await db.query(
                `SELECT final_price FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                [treatment_id, companyId]
            );
            if (trtResult.rows.length > 0) {
                resolvedTotalAmount = parseFloat(trtResult.rows[0].final_price);
            }
        }

        const updateClient = await db.getClient();
        let result;
        try {
            await updateClient.query('BEGIN');

            result = await updateClient.query(
                `UPDATE ${schema}.dental_consultations
                 SET treatment_id               = COALESCE($1, treatment_id),
                     reason                      = COALESCE($2, reason),
                     diagnosis                   = COALESCE($3, diagnosis),
                     clinical_notes              = COALESCE($4, clinical_notes),
                     indications                 = COALESCE($5, indications),
                     total_amount                = COALESCE($6, total_amount),
                     administrative_status       = COALESCE($7, administrative_status),
                     requires_follow_up          = COALESCE($10, requires_follow_up),
                     requires_multiple_sessions  = COALESCE($11, requires_multiple_sessions),
                     estimated_sessions          = COALESCE($12, estimated_sessions),
                     next_session_date           = COALESCE($13, next_session_date),
                     follow_up_notes             = COALESCE($14, follow_up_notes),
                     professional_id             = COALESCE($15, professional_id),
                     updated_at                  = CURRENT_TIMESTAMP,
                     updated_by                  = $16
                 WHERE id = $8 AND tenant_id = $9
                 RETURNING *`,
                [
                    treatment_id !== undefined ? treatment_id : null,
                    reason !== undefined ? reason : null,
                    diagnosis !== undefined ? diagnosis : null,
                    clinical_notes !== undefined ? clinical_notes : null,
                    indications !== undefined ? indications : null,
                    resolvedTotalAmount,
                    administrative_status !== undefined ? administrative_status : null,
                    req.params.id,
                    companyId,
                    requires_follow_up !== undefined ? requires_follow_up : null,
                    requires_multiple_sessions !== undefined ? requires_multiple_sessions : null,
                    estimated_sessions !== undefined ? estimated_sessions : null,
                    next_session_date !== undefined ? next_session_date : null,
                    follow_up_notes !== undefined ? follow_up_notes : null,
                    professional_id !== undefined ? professional_id : null,
                    req.user?.id || null
                ]
            );

            if (result.rows.length === 0) {
                await updateClient.query('ROLLBACK');
                return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
            }

            if (treatmentChanged && treatment_id) {
                // If a new treatment is selected, seed a new consultation treatment entry
                const trtResult = await updateClient.query(
                    `SELECT name, final_price FROM ${schema}.dental_treatments WHERE id = $1 AND tenant_id = $2`,
                    [treatment_id, companyId]
                );
                if (trtResult.rows.length > 0) {
                    const trt = trtResult.rows[0];
                    await updateClient.query(
                        `INSERT INTO ${schema}.dental_consultation_treatments
                         (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, created_by)
                         VALUES ($1, $2, $3, $4, $5, 1, $5, 'active', $6)`,
                        [companyId, req.params.id, treatment_id, trt.name, parseFloat(trt.final_price) || 0, req.user?.id || null]
                    );
                }
            }

            await updateClient.query('COMMIT');
        } catch (txErr) {
            await updateClient.query('ROLLBACK');
            throw txErr;
        } finally {
            updateClient.release();
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar consulta') });
    }
};

/**
 * POST /dental/consultations/:id/clinical-history
 * Body: { type, title, description, diagnosis, clinical_notes, indications }
 */
exports.addClinicalHistory = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Verify consultation exists
        const cons = await db.query(
            `SELECT customer_id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const { type = 'general', title, description = null, diagnosis = null, clinical_notes = null, indications = null } = req.body;

        if (!title) return res.status(400).json({ error: 'title es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.dental_clinical_history_entries
             (tenant_id, customer_id, consultation_id, type, title, description, diagnosis, clinical_notes, indications, entry_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             RETURNING *`,
            [companyId, cons.rows[0].customer_id, req.params.id, type, title, description, diagnosis, clinical_notes, indications]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.addClinicalHistory error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al agregar entrada de historial clínico') });
    }
};

/**
 * POST /dental/consultations/:id/treatments
 * Body: { treatments: [{treatment_id, service_id?, quantity, notes?}] }
 */
exports.addTreatments = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { treatments = [] } = req.body;

        // Verify consultation exists
        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        if (treatments.length === 0) {
            return res.status(400).json({ error: 'treatments no puede estar vacío' });
        }

        const txClient = await db.getClient();
        let insertedRows;
        try {
            await txClient.query('BEGIN');

            insertedRows = [];
            for (const t of treatments) {
                const row = await txClient.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, clinical_notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
                     RETURNING *`,
                    [
                        companyId,
                        req.params.id,
                        t.treatment_id,
                        t.treatment_name_snapshot || null,
                        parseFloat(t.unit_price) || 0,
                        parseInt(t.quantity) || 1,
                        (parseFloat(t.unit_price) || 0) * (parseInt(t.quantity) || 1),
                        t.notes || null
                    ]
                );
                insertedRows.push(row.rows[0]);
            }

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        res.status(201).json({ data: insertedRows });
    } catch (err) {
        console.error('consultationsController.addTreatments error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al agregar tratamientos a consulta') });
    }
};

/**
 * POST /dental/consultations/:id/complete
 */
exports.complete = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const cons = existing.rows[0];

        // Guard: only allow completion from en_tratamiento
        if (cons.status !== 'en_tratamiento') {
            return res.status(400).json({
                code: 'DENTAL_INVALID_STATUS_TRANSITION',
                error: `No se puede completar una consulta en estado '${cons.status}'. Se requiere estado 'en_tratamiento'.`
            });
        }

        // Calculate real total from consultation services (before any write)
        const totalResult = await db.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total, COUNT(*) AS cnt
             FROM ${schema}.dental_consultation_treatments
             WHERE consultation_id = $1 AND tenant_id = $2 AND status = 'active'`,
            [req.params.id, companyId]
        );
        const realTotal = parseFloat(totalResult.rows[0].total);

        // Guard: block completion if no active treatments
        if (parseInt(totalResult.rows[0].cnt) === 0) {
            return res.status(400).json({
                code: 'DENTAL_NO_TREATMENTS',
                error: 'No se puede completar una consulta sin tratamientos aplicados'
            });
        }

        // Now it is safe to write — wrap the three writes in a transaction
        const txClient = await db.getClient();
        let result;
        let chargeCreated = null;
        try {
            await txClient.query('BEGIN');

            result = await txClient.query(
                `UPDATE ${schema}.dental_consultations
                 SET status = 'finalizada_clinicamente', total_amount = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND tenant_id = $2
                 RETURNING *`,
                [req.params.id, companyId, realTotal]
            );

            if (realTotal > 0) {
                const existingCharge = await txClient.query(
                    `SELECT id FROM ${schema}.dental_charges WHERE consultation_id = $1 AND tenant_id = $2 LIMIT 1`,
                    [req.params.id, companyId]
                );
                if (existingCharge.rows.length === 0) {
                    const chargeResult = await txClient.query(
                        `INSERT INTO ${schema}.dental_charges
                         (tenant_id, customer_id, consultation_id, description, total_amount, paid_amount, pending_amount, status)
                         VALUES ($1, $2, $3, $4, $5, 0, $5, 'pending')
                         RETURNING *`,
                        [companyId, cons.customer_id, cons.id, 'Cargo por consulta', realTotal]
                    );
                    chargeCreated = chargeResult.rows[0];
                }
            }

            await txClient.query(
                `INSERT INTO ${schema}.dental_clinical_history_entries
                 (tenant_id, customer_id, consultation_id, type, title, description, diagnosis, clinical_notes, indications, entry_date)
                 VALUES ($1, $2, $3, 'evolution', $4, NULL, $5, $6, $7, NOW())`,
                [
                    companyId,
                    cons.customer_id,
                    cons.id,
                    `Consulta completada${cons.reason ? ': ' + cons.reason : ''}`,
                    cons.diagnosis || null,
                    cons.clinical_notes || null,
                    cons.indications || null
                ]
            );

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        res.json({ data: result.rows[0], charge_created: chargeCreated });
    } catch (err) {
        console.error('consultationsController.complete error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al completar consulta') });
    }
};

/**
 * POST /dental/consultations/:id/cancel
 */
exports.cancel = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const terminalStatuses = ['finalizada_clinicamente', 'pendiente_pago', 'cerrada', 'cancelled', 'no_show', 'voided'];
        if (terminalStatuses.includes(existing.rows[0].status)) {
            return res.status(400).json({
                code: 'DENTAL_CONSULTATION_CANNOT_CANCEL',
                error: `No se puede cancelar una consulta en estado '${existing.rows[0].status}'`
            });
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_consultations
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.cancel error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al cancelar consulta') });
    }
};

/**
 * POST /dental/consultations/:id/create-charge
 * Body: { description?, total_amount, due_date? }
 */
exports.createCharge = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { description = null, total_amount, due_date = null } = req.body;

        if (!total_amount || parseFloat(total_amount) <= 0) {
            return res.status(400).json({ code: 'DENTAL_INVALID_AMOUNT', error: 'total_amount debe ser mayor a 0' });
        }

        const cons = await db.query(
            `SELECT customer_id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        // Prevent duplicate active charges for the same consultation
        const existingCharge = await db.query(
            `SELECT id FROM ${schema}.dental_charges
             WHERE consultation_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
            [req.params.id, companyId]
        );
        if (existingCharge.rows.length > 0) {
            return res.status(409).json({
                code: 'DENTAL_CHARGE_ALREADY_EXISTS',
                error: 'Ya existe un cobro activo para esta consulta'
            });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.dental_charges
             (tenant_id, customer_id, consultation_id, description, total_amount, paid_amount, pending_amount, due_date, status)
             VALUES ($1, $2, $3, $4, $5, 0, $5, $6, 'pending')
             RETURNING *`,
            [companyId, cons.rows[0].customer_id, req.params.id, description, parseFloat(total_amount), due_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.createCharge error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear cobro para consulta') });
    }
};

/**
 * Expose multer middleware for photo upload routes
 */
exports.photoUpload = photoUpload;

/**
 * GET /dental/consultations/:id/photos
 */
exports.listPhotos = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_photos
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY stage ASC, sort_order ASC, created_at ASC`,
            [req.params.id, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationsController.listPhotos error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar fotos') });
    }
};

/**
 * POST /dental/consultations/:id/photos
 * Multipart: field "photo", body: stage (before|after), caption?
 */
exports.uploadPhoto = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

        const stage   = req.body.stage === 'after' ? 'after' : 'before';
        const caption = req.body.caption || null;

        // Build a URL-accessible path relative to uploads root
        const photoUrl = `/uploads/dental/photos/${req.user.schema_name}/${req.file.filename}`;

        const result = await db.query(
            `INSERT INTO ${schema}.dental_consultation_photos
             (tenant_id, consultation_id, photo_url, stage, caption, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [companyId, req.params.id, photoUrl, stage, caption, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.uploadPhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al subir foto') });
    }
};

/**
 * POST /dental/consultations/:id/status
 * Body: { status, reason? }
 */
exports.changeStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { status: newStatus, reason = null } = req.body;

        if (!newStatus) return res.status(400).json({ error: 'status es requerido' });

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const cons = existing.rows[0];
        const currentStatus = cons.status;

        // State machine — valid transitions per current status
        const VALID_TRANSITIONS = {
            borrador:                ['creada'],
            creada:                  ['en_evaluacion', 'cancelled', 'no_show', 'voided'],
            en_evaluacion:           ['cotizada', 'en_tratamiento', 'cancelled', 'no_show', 'voided'],
            cotizada:                ['propuesta_pendiente', 'en_tratamiento', 'cancelled'],
            propuesta_pendiente:     ['aceptada', 'rechazada'],
            aceptada:                ['en_tratamiento'],
            en_tratamiento:          ['sesion_pendiente', 'finalizada_clinicamente', 'voided'],
            sesion_pendiente:        ['en_tratamiento'],
            finalizada_clinicamente: ['pendiente_pago', 'cerrada'],
            pendiente_pago:          ['cerrada'],
            rechazada:               ['cerrada'],
            cerrada:                 [],
            cancelled:               [],
            no_show:                 [],
            voided:                  [],
        };

        const allowedNext = VALID_TRANSITIONS[currentStatus];
        if (!allowedNext || !allowedNext.includes(newStatus)) {
            return res.status(400).json({
                code: 'DENTAL_INVALID_STATUS_TRANSITION',
                error: `No se puede cambiar de '${currentStatus}' a '${newStatus}'`
            });
        }

        // Validations per target status
        if (newStatus === 'finalizada_clinicamente') {
            const trtCheck = await db.query(
                `SELECT COUNT(*) AS cnt FROM ${schema}.dental_consultation_treatments
                 WHERE consultation_id = $1 AND status = 'active' AND tenant_id = $2`,
                [req.params.id, companyId]
            );
            if (parseInt(trtCheck.rows[0].cnt) === 0) {
                return res.status(400).json({
                    code: 'DENTAL_NO_TREATMENTS',
                    error: 'No se puede finalizar una consulta sin tratamientos aplicados'
                });
            }
        }

        if (newStatus === 'voided' && !reason) {
            return res.status(400).json({
                code: 'DENTAL_VOID_REQUIRES_REASON',
                error: 'Se requiere un motivo para anular una consulta'
            });
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_consultations
             SET status = $1, follow_up_notes = CASE WHEN $2::TEXT IS NOT NULL THEN $2 ELSE follow_up_notes END,
                 updated_at = NOW(), updated_by = $3
             WHERE id = $4 AND tenant_id = $5
             RETURNING *`,
            [newStatus, reason, req.user?.id || null, req.params.id, companyId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.changeStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al cambiar estado de consulta') });
    }
};

/**
 * POST /dental/consultations/:consultationId/generate-treatment-plan
 * Reads odontogram entries for this consultation and creates dental_consultation_treatments
 * rows for known finding_type → procedure mappings that do not already exist.
 */
exports.generateTreatmentPlan = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { consultationId } = req.params;

        const cons = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [consultationId, companyId]
        );
        if (cons.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const FINDING_TO_PROCEDURE = {
            caries:     'Obturación dental',
            fracture:   'Restauración por fractura',
            extraction: 'Extracción dental',
            sealant:    'Aplicación de sellador',
            crown:      'Corona dental',
            implant:    'Implante dental',
        };

        const txClient = await db.getClient();
        let generated = 0;
        try {
            await txClient.query('BEGIN');

            const entries = await txClient.query(
                `SELECT id, tooth_number, finding_type
                 FROM ${schema}.dental_odontogram_entries
                 WHERE consultation_id = $1`,
                [consultationId]
            );

            const existing = await txClient.query(
                `SELECT treatment_name_snapshot, tooth_reference FROM ${schema}.dental_consultation_treatments
                 WHERE consultation_id = $1 AND tenant_id = $2 AND status != 'voided'`,
                [consultationId, companyId]
            );
            const existingSet = new Set(existing.rows.map(r => `${r.treatment_name_snapshot}|${r.tooth_reference}`));

            for (const entry of entries.rows) {
                const procedure = FINDING_TO_PROCEDURE[entry.finding_type];
                if (!procedure) continue;

                if (existingSet.has(`${procedure}|${String(entry.tooth_number)}`)) continue;

                await txClient.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (tenant_id, consultation_id, treatment_name_snapshot, tooth_reference, unit_price, quantity, subtotal, status, created_by)
                     VALUES ($1, $2, $3, $4, 0, 1, 0, 'active', $5)`,
                    [companyId, consultationId, procedure, String(entry.tooth_number), req.user?.id || null]
                );

                generated++;
            }

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        res.json({ generated, message: `${generated} tratamiento(s) generado(s) desde el odontograma` });
    } catch (err) {
        console.error('consultationsController.generateTreatmentPlan error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al generar plan de tratamiento') });
    }
};

/**
 * DELETE /dental/consultations/:id/photos/:photoId
 */
exports.deletePhoto = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const photo = await db.query(
            `SELECT p.* FROM ${schema}.dental_consultation_photos p
             INNER JOIN ${schema}.dental_consultations c ON c.id = p.consultation_id
             WHERE p.id = $1 AND p.consultation_id = $2 AND c.tenant_id = $3`,
            [req.params.photoId, req.params.id, companyId]
        );

        if (photo.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_PHOTO_NOT_FOUND', error: 'Foto no encontrada' });
        }

        // Validate path stays within uploads root (path traversal guard) — before any writes
        const UPLOADS_BASE = path.resolve(__dirname, '..', '..', 'uploads');
        const rawUrl = photo.rows[0].photo_url || '';
        const safeRelative = rawUrl.replace(/\\/g, '/').replace(/^\/+/, '');
        const filePath = path.resolve(UPLOADS_BASE, safeRelative);
        if (!filePath.startsWith(UPLOADS_BASE + path.sep) && filePath !== UPLOADS_BASE) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        // DB DELETE first — if this fails the file is preserved and the record stays consistent
        const deleteResult = await db.query(
            `DELETE FROM ${schema}.dental_consultation_photos WHERE id = $1 AND tenant_id = $2`,
            [req.params.photoId, companyId]
        );
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ code: 'DENTAL_PHOTO_NOT_FOUND', error: 'Foto no encontrada' });
        }

        // File deletion after confirmed DB delete — orphaned file is preferable to dangling DB record
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('consultationsController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar foto') });
    }
};
