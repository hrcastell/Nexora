const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/patients
 * List customers with dental patient profile. Supports search by name/document.
 * Query: ?search=, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { search, page = 1, limit = 50 } = req.query;

        const params = [companyId];
        const conditions = ['c.tenant_id = $1'];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(
                `(c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.document_number ILIKE $${params.length})`
            );
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT c.*,
                    dpp.id AS dental_profile_id,
                    dpp.medical_background,
                    dpp.allergies,
                    dpp.blood_type,
                    dpp.emergency_contact_name,
                    dpp.emergency_contact_phone,
                    dpp.notes AS dental_notes,
                    dpp.created_at AS dental_profile_created_at
             FROM ${schema}.customers c
             LEFT JOIN ${schema}.dental_patient_profiles dpp ON dpp.customer_id = c.id AND dpp.tenant_id = $1
             ${where}
             ORDER BY c.last_name ASC, c.first_name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.customers c ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('patientsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar pacientes' });
    }
};

/**
 * POST /dental/patients
 * Create or upsert dental_patient_profile for a customer.
 * If customer_id is provided, upsert the profile. Otherwise create customer first.
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            customer_id,
            first_name,
            last_name,
            document_type,
            document_number,
            phone,
            email,
            medical_background = null,
            allergies = null,
            blood_type = null,
            emergency_contact_name = null,
            emergency_contact_phone = null,
            notes = null
        } = req.body;

        let resolvedCustomerId = customer_id;

        if (!resolvedCustomerId) {
            if (!first_name || !last_name) {
                return res.status(400).json({ error: 'first_name y last_name son requeridos cuando no se provee customer_id' });
            }

            const customerResult = await db.query(
                `INSERT INTO ${schema}.customers
                 (tenant_id, first_name, last_name, document_type, document_number, phone, email)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [companyId, first_name, last_name, document_type || null, document_number || null, phone || null, email || null]
            );
            resolvedCustomerId = customerResult.rows[0].id;
        } else {
            const customerCheck = await db.query(
                `SELECT id FROM ${schema}.customers WHERE id = $1 AND tenant_id = $2`,
                [resolvedCustomerId, companyId]
            );
            if (customerCheck.rows.length === 0) {
                return res.status(404).json({ code: 'DENTAL_PATIENT_NOT_FOUND', error: 'Cliente no encontrado' });
            }
        }

        const profileResult = await db.query(
            `INSERT INTO ${schema}.dental_patient_profiles
             (tenant_id, customer_id, medical_background, allergies, blood_type, emergency_contact_name, emergency_contact_phone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tenant_id, customer_id) DO UPDATE
               SET medical_background      = EXCLUDED.medical_background,
                   allergies               = EXCLUDED.allergies,
                   blood_type              = EXCLUDED.blood_type,
                   emergency_contact_name  = EXCLUDED.emergency_contact_name,
                   emergency_contact_phone = EXCLUDED.emergency_contact_phone,
                   notes                   = EXCLUDED.notes,
                   updated_at              = CURRENT_TIMESTAMP
             RETURNING *`,
            [companyId, resolvedCustomerId, medical_background, allergies, blood_type,
             emergency_contact_name, emergency_contact_phone, notes]
        );

        const customerResult2 = await db.query(
            `SELECT * FROM ${schema}.customers WHERE id = $1`,
            [resolvedCustomerId]
        );

        res.status(201).json({
            ...customerResult2.rows[0],
            dental_profile: profileResult.rows[0]
        });
    } catch (err) {
        console.error('patientsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear paciente' });
    }
};

/**
 * GET /dental/patients/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT c.*,
                    dpp.id AS dental_profile_id,
                    dpp.medical_background,
                    dpp.allergies,
                    dpp.blood_type,
                    dpp.emergency_contact_name,
                    dpp.emergency_contact_phone,
                    dpp.notes AS dental_notes,
                    dpp.created_at AS dental_profile_created_at,
                    dpp.updated_at AS dental_profile_updated_at
             FROM ${schema}.customers c
             LEFT JOIN ${schema}.dental_patient_profiles dpp ON dpp.customer_id = c.id AND dpp.tenant_id = $1
             WHERE c.id = $2 AND c.tenant_id = $1`,
            [companyId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_PATIENT_NOT_FOUND', error: 'Paciente no encontrado' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('patientsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener paciente' });
    }
};

/**
 * PATCH /dental/patients/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { medical_background, allergies, blood_type, emergency_contact_name, emergency_contact_phone, notes } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.dental_patient_profiles
             SET medical_background      = COALESCE($1, medical_background),
                 allergies               = COALESCE($2, allergies),
                 blood_type              = COALESCE($3, blood_type),
                 emergency_contact_name  = COALESCE($4, emergency_contact_name),
                 emergency_contact_phone = COALESCE($5, emergency_contact_phone),
                 notes                   = COALESCE($6, notes),
                 updated_at              = CURRENT_TIMESTAMP
             WHERE customer_id = $7 AND tenant_id = $8
             RETURNING *`,
            [
                medical_background !== undefined ? medical_background : null,
                allergies !== undefined ? allergies : null,
                blood_type !== undefined ? blood_type : null,
                emergency_contact_name !== undefined ? emergency_contact_name : null,
                emergency_contact_phone !== undefined ? emergency_contact_phone : null,
                notes !== undefined ? notes : null,
                req.params.id,
                companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_PATIENT_NOT_FOUND', error: 'Perfil dental no encontrado' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('patientsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar paciente' });
    }
};

/**
 * GET /dental/patients/:id/clinical-history
 */
exports.getClinicalHistory = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_clinical_history_entries
             WHERE tenant_id = $1 AND customer_id = $2
             ORDER BY entry_date DESC, created_at DESC`,
            [companyId, req.params.id]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('patientsController.getClinicalHistory error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener historial clínico' });
    }
};

/**
 * GET /dental/patients/:id/consultations
 */
exports.getConsultations = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT dc.*,
                    ds.name AS service_name
             FROM ${schema}.dental_consultations dc
             LEFT JOIN ${schema}.dental_services ds ON ds.id = dc.service_id
             WHERE dc.tenant_id = $1 AND dc.customer_id = $2
             ORDER BY dc.consultation_date DESC`,
            [companyId, req.params.id]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('patientsController.getConsultations error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener consultas del paciente' });
    }
};

/**
 * GET /dental/patients/:id/payments
 */
exports.getPayments = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT dp.*,
                    dc.total_amount AS charge_total,
                    dc.pending_amount AS charge_pending,
                    dc.description AS charge_description
             FROM ${schema}.dental_payments dp
             JOIN ${schema}.dental_charges dc ON dc.id = dp.charge_id
             WHERE dp.tenant_id = $1 AND dp.customer_id = $2
             ORDER BY dp.payment_date DESC`,
            [companyId, req.params.id]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('patientsController.getPayments error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener pagos del paciente' });
    }
};

/**
 * GET /dental/patients/:id/debt
 */
exports.getDebt = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT
                COALESCE(SUM(total_amount), 0)   AS total_debt,
                COALESCE(SUM(paid_amount), 0)    AS paid_amount,
                COALESCE(SUM(pending_amount), 0) AS pending_amount,
                COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('paid','cancelled')) AS overdue_count
             FROM ${schema}.dental_charges
             WHERE tenant_id = $1 AND customer_id = $2 AND status NOT IN ('cancelled')`,
            [companyId, req.params.id]
        );

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('patientsController.getDebt error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener deuda del paciente' });
    }
};
