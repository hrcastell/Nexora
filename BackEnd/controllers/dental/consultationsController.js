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
                    ds.name AS service_name
             FROM ${schema}.dental_consultations dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = dc.service_id
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

        const rows = result.rows.map(({ patient_name, first_name, last_name, service_name, ...rest }) => ({
            ...rest,
            customer: { full_name: patient_name, first_name: first_name ?? '', last_name: last_name ?? '' },
            service:  service_name ? { name: service_name } : null
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
        const service_id = req.body.service_id || null;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.dental_consultations
             (tenant_id, customer_id, appointment_id, service_id, reason, diagnosis, clinical_notes, indications, total_amount, status, consultation_date,
              requires_follow_up, requires_multiple_sessions, estimated_sessions, next_session_date, follow_up_notes, professional_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_progress', NOW(),
                     $10, $11, $12, $13, $14, $15, $16)
             RETURNING *`,
            [companyId, customer_id, appointment_id, service_id, reason, diagnosis, clinical_notes, indications, parseFloat(total_amount) || 0,
             requires_follow_up, requires_multiple_sessions, estimated_sessions, next_session_date, follow_up_notes, professional_id, req.user?.id || null]
        );

        const consultation = result.rows[0];

        // Auto-copy treatments from the service if service_id was provided
        if (service_id) {
            // Auto-seed dental_consultation_services from the initial service
            const svcResult = await db.query(
                `SELECT name, final_price FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            if (svcResult.rows.length > 0) {
                const svc = svcResult.rows[0];
                await db.query(
                    `INSERT INTO ${schema}.dental_consultation_services
                     (tenant_id, consultation_id, service_id, service_name_snapshot, unit_price, quantity, subtotal, status, created_by)
                     VALUES ($1, $2, $3, $4, $5, 1, $5, 'active', $6)`,
                    [companyId, consultation.id, service_id, svc.name, parseFloat(svc.final_price) || 0, req.user?.id || null]
                );
            }

            const svcTreatments = await db.query(
                `SELECT treatment_id, quantity, notes FROM ${schema}.dental_service_treatments
                 WHERE service_id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            for (const t of svcTreatments.rows) {
                await db.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (tenant_id, consultation_id, treatment_id, quantity, notes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [companyId, consultation.id, t.treatment_id, t.quantity, t.notes || null]
                );
            }
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
                    ds.name AS service_name
             FROM ${schema}.dental_consultations dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             LEFT JOIN ${schema}.dental_services ds ON ds.id = dc.service_id
             WHERE dc.id = $1 AND dc.tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        // Treatments
        const treatments = await db.query(
            `SELECT dct.*,
                    dt.name AS treatment_name
             FROM ${schema}.dental_consultation_treatments dct
             LEFT JOIN ${schema}.dental_treatments dt ON dt.id = dct.treatment_id
             WHERE dct.consultation_id = $1 AND dct.tenant_id = $2`,
            [req.params.id, companyId]
        );

        // Charges
        const charges = await db.query(
            `SELECT * FROM ${schema}.dental_charges
             WHERE consultation_id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        // Consultation services (multi-service)
        const services = await db.query(
            `SELECT dcs.*,
                    ds.name AS service_name_current
             FROM ${schema}.dental_consultation_services dcs
             LEFT JOIN ${schema}.dental_services ds ON ds.id = dcs.service_id
             WHERE dcs.consultation_id = $1 AND dcs.tenant_id = $2
             ORDER BY dcs.created_at ASC`,
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
                treatments: treatments.rows,
                charges: charges.rows,
                services: services.rows,
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
            service_id, reason, diagnosis, clinical_notes, indications, total_amount, administrative_status,
            requires_follow_up, requires_multiple_sessions, estimated_sessions,
            next_session_date, follow_up_notes, professional_id
        } = req.body;

        // Fetch current consultation to detect service_id change
        const existing = await db.query(
            `SELECT service_id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        const serviceChanged = service_id !== undefined && service_id !== existing.rows[0].service_id;

        // If service changed, resolve new total_amount from service final_price
        let resolvedTotalAmount = total_amount !== undefined ? parseFloat(total_amount) : null;
        if (serviceChanged && resolvedTotalAmount === null) {
            const svcResult = await db.query(
                `SELECT final_price FROM ${schema}.dental_services WHERE id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            if (svcResult.rows.length > 0) {
                resolvedTotalAmount = parseFloat(svcResult.rows[0].final_price);
            }
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_consultations
             SET service_id                  = COALESCE($1, service_id),
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
                service_id !== undefined ? service_id : null,
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
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        // If service changed, replace consultation treatments
        if (serviceChanged) {
            await db.query(
                `DELETE FROM ${schema}.dental_consultation_treatments WHERE consultation_id = $1 AND tenant_id = $2`,
                [req.params.id, companyId]
            );
            const svcTreatments = await db.query(
                `SELECT treatment_id, quantity, notes FROM ${schema}.dental_service_treatments
                 WHERE service_id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            for (const t of svcTreatments.rows) {
                await db.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (tenant_id, consultation_id, treatment_id, quantity, notes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [companyId, req.params.id, t.treatment_id, t.quantity, t.notes || null]
                );
            }
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

        const insertedRows = [];
        for (const t of treatments) {
            const row = await db.query(
                `INSERT INTO ${schema}.dental_consultation_treatments
                 (tenant_id, consultation_id, treatment_id, service_id, quantity, notes)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [companyId, req.params.id, t.treatment_id, t.service_id || null, t.quantity || 1, t.notes || null]
            );
            insertedRows.push(row.rows[0]);
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

        // Calculate real total from consultation services (before any write)
        const totalResult = await db.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total, COUNT(*) AS cnt
             FROM ${schema}.dental_consultation_services
             WHERE consultation_id = $1 AND tenant_id = $2 AND status = 'active'`,
            [req.params.id, companyId]
        );
        const realTotal = parseFloat(totalResult.rows[0].total);

        // Guard: block completion if no active services
        if (parseInt(totalResult.rows[0].cnt) === 0) {
            return res.status(400).json({
                code: 'DENTAL_NO_SERVICES',
                error: 'No se puede completar una consulta sin servicios aplicados'
            });
        }

        // Now it is safe to write — set status and total in one statement
        const result = await db.query(
            `UPDATE ${schema}.dental_consultations
             SET status = 'completed', total_amount = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId, realTotal]
        );

        // Optionally auto-create charge if realTotal > 0 and no charge exists
        let chargeCreated = null;
        if (realTotal > 0) {
            const existingCharge = await db.query(
                `SELECT id FROM ${schema}.dental_charges WHERE consultation_id = $1 AND tenant_id = $2 LIMIT 1`,
                [req.params.id, companyId]
            );
            if (existingCharge.rows.length === 0) {
                const chargeResult = await db.query(
                    `INSERT INTO ${schema}.dental_charges
                     (tenant_id, customer_id, consultation_id, description, total_amount, paid_amount, pending_amount, status)
                     VALUES ($1, $2, $3, $4, $5, 0, $5, 'pending')
                     RETURNING *`,
                    [companyId, cons.customer_id, cons.id, 'Cargo por consulta', realTotal]
                );
                chargeCreated = chargeResult.rows[0];
            }
        }

        // Auto-insert clinical history entry on completion
        await db.query(
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

        if (existing.rows[0].status === 'completed') {
            return res.status(400).json({
                code: 'DENTAL_CONSULTATION_CANNOT_CANCEL',
                error: 'No se puede cancelar una consulta completada'
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

        // Allowed transitions
        const allowed = {
            draft:        ['created', 'cancelled'],
            created:      ['in_progress', 'cancelled'],
            in_progress:  ['in_treatment', 'completed', 'cancelled'],
            in_treatment: ['completed', 'in_progress'],
            completed:    ['voided'],
            cancelled:    [],
            no_show:      [],
            voided:       [],
        };

        if (!allowed[currentStatus] || !allowed[currentStatus].includes(newStatus)) {
            return res.status(400).json({
                code: 'DENTAL_INVALID_STATUS_TRANSITION',
                error: `No se puede cambiar de '${currentStatus}' a '${newStatus}'`
            });
        }

        // Validations per target status
        if (newStatus === 'completed') {
            const svcCheck = await db.query(
                `SELECT COUNT(*) AS cnt FROM ${schema}.dental_consultation_services
                 WHERE consultation_id = $1 AND status = 'active' AND tenant_id = $2`,
                [req.params.id, companyId]
            );
            if (parseInt(svcCheck.rows[0].cnt) === 0) {
                return res.status(400).json({
                    code: 'DENTAL_NO_SERVICES',
                    error: 'No se puede completar una consulta sin servicios aplicados'
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

        // Delete the file from disk — validate path stays within uploads root (path traversal guard)
        const UPLOADS_BASE = path.resolve(__dirname, '..', '..', 'uploads');
        const rawUrl = photo.rows[0].photo_url || '';
        const safeRelative = rawUrl.replace(/\\/g, '/').replace(/^\/+/, '');
        const filePath = path.resolve(UPLOADS_BASE, safeRelative);
        if (!filePath.startsWith(UPLOADS_BASE + path.sep) && filePath !== UPLOADS_BASE) {
            return res.status(400).json({ error: 'Invalid file path' });
        }
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const deleteResult = await db.query(
            `DELETE FROM ${schema}.dental_consultation_photos WHERE id = $1 AND tenant_id = $2`,
            [req.params.photoId, companyId]
        );
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ code: 'DENTAL_PHOTO_NOT_FOUND', error: 'Foto no encontrada' });
        }

        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('consultationsController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar foto') });
    }
};
