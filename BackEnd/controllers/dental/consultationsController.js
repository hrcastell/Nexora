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
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT dc.*,
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

        const rows = result.rows.map(({ patient_name, service_name, ...rest }) => ({
            ...rest,
            customer: { full_name: patient_name },
            service:  service_name ? { name: service_name } : null
        }));

        res.json({ data: rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('consultationsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar consultas' });
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
            service_id = null,
            reason = null,
            diagnosis = null,
            clinical_notes = null,
            indications = null,
            total_amount = 0
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.dental_consultations
             (tenant_id, customer_id, appointment_id, service_id, reason, diagnosis, clinical_notes, indications, total_amount, status, consultation_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_progress', NOW())
             RETURNING *`,
            [companyId, customer_id, appointment_id, service_id, reason, diagnosis, clinical_notes, indications, parseFloat(total_amount) || 0]
        );

        const consultation = result.rows[0];

        // Auto-copy treatments from the service if service_id was provided
        if (service_id) {
            const svcTreatments = await db.query(
                `SELECT treatment_id, quantity, notes FROM ${schema}.dental_service_treatments
                 WHERE service_id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            for (const t of svcTreatments.rows) {
                await db.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (consultation_id, treatment_id, quantity, notes)
                     VALUES ($1, $2, $3, $4)`,
                    [consultation.id, t.treatment_id, t.quantity, t.notes || null]
                );
            }
        }

        res.status(201).json(consultation);
    } catch (err) {
        console.error('consultationsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear consulta' });
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
             WHERE dct.consultation_id = $1`,
            [req.params.id]
        );

        // Charges
        const charges = await db.query(
            `SELECT * FROM ${schema}.dental_charges
             WHERE consultation_id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        res.json({
            data: {
                ...result.rows[0],
                treatments: treatments.rows,
                charges: charges.rows
            }
        });
    } catch (err) {
        console.error('consultationsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener consulta' });
    }
};

/**
 * PATCH /dental/consultations/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { service_id, reason, diagnosis, clinical_notes, indications, total_amount, administrative_status } = req.body;

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
             SET service_id            = COALESCE($1, service_id),
                 reason                = COALESCE($2, reason),
                 diagnosis             = COALESCE($3, diagnosis),
                 clinical_notes        = COALESCE($4, clinical_notes),
                 indications           = COALESCE($5, indications),
                 total_amount          = COALESCE($6, total_amount),
                 administrative_status = COALESCE($7, administrative_status),
                 updated_at            = CURRENT_TIMESTAMP
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
                companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CONSULTATION_NOT_FOUND', error: 'Consulta no encontrada' });
        }

        // If service changed, replace consultation treatments
        if (serviceChanged) {
            await db.query(
                `DELETE FROM ${schema}.dental_consultation_treatments WHERE consultation_id = $1`,
                [req.params.id]
            );
            const svcTreatments = await db.query(
                `SELECT treatment_id, quantity, notes FROM ${schema}.dental_service_treatments
                 WHERE service_id = $1 AND tenant_id = $2`,
                [service_id, companyId]
            );
            for (const t of svcTreatments.rows) {
                await db.query(
                    `INSERT INTO ${schema}.dental_consultation_treatments
                     (consultation_id, treatment_id, quantity, notes)
                     VALUES ($1, $2, $3, $4)`,
                    [req.params.id, t.treatment_id, t.quantity, t.notes || null]
                );
            }
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('consultationsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar consulta' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar entrada de historial clínico' });
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
                 (consultation_id, treatment_id, service_id, quantity, notes)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [req.params.id, t.treatment_id, t.service_id || null, t.quantity || 1, t.notes || null]
            );
            insertedRows.push(row.rows[0]);
        }

        res.status(201).json({ data: insertedRows });
    } catch (err) {
        console.error('consultationsController.addTreatments error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al agregar tratamientos a consulta' });
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

        const result = await db.query(
            `UPDATE ${schema}.dental_consultations
             SET status = 'completed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [req.params.id, companyId]
        );

        // Optionally auto-create charge if total_amount > 0 and no charge exists
        let chargeCreated = null;
        if (parseFloat(cons.total_amount) > 0) {
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
                    [companyId, cons.customer_id, cons.id, 'Cargo por consulta', parseFloat(cons.total_amount)]
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al completar consulta' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cancelar consulta' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear cobro para consulta' });
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
             WHERE consultation_id = $1
             ORDER BY stage ASC, sort_order ASC, created_at ASC`,
            [req.params.id]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationsController.listPhotos error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar fotos' });
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al subir foto' });
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

        // Delete the file from disk
        const filePath = path.join(__dirname, '..', '..', photo.rows[0].photo_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await db.query(
            `DELETE FROM ${schema}.dental_consultation_photos WHERE id = $1`,
            [req.params.photoId]
        );

        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('consultationsController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar foto' });
    }
};
