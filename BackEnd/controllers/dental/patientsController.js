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
                    dpp.current_medications,
                    dpp.chronic_conditions,
                    dpp.dental_observations,
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
            mobile = null,
            email,
            birth_date = null,
            address = null,
            city = null,
            customer_notes = null,
            medical_background = null,
            allergies = null,
            blood_type = null,
            current_medications = null,
            chronic_conditions = null,
            dental_observations = null,
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
                 (tenant_id, first_name, last_name, document_type, document_number, phone, mobile, email, birth_date, address, city, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [companyId, first_name, last_name, document_type || null, document_number || null,
                 phone || null, mobile, email || null, birth_date, address, city, customer_notes]
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

        await db.query(
            `INSERT INTO ${schema}.dental_patient_profiles
             (tenant_id, customer_id, medical_background, allergies, blood_type, current_medications, chronic_conditions, dental_observations, emergency_contact_name, emergency_contact_phone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (tenant_id, customer_id) DO UPDATE
               SET medical_background      = EXCLUDED.medical_background,
                   allergies               = EXCLUDED.allergies,
                   blood_type              = EXCLUDED.blood_type,
                   current_medications     = EXCLUDED.current_medications,
                   chronic_conditions      = EXCLUDED.chronic_conditions,
                   dental_observations     = EXCLUDED.dental_observations,
                   emergency_contact_name  = EXCLUDED.emergency_contact_name,
                   emergency_contact_phone = EXCLUDED.emergency_contact_phone,
                   notes                   = EXCLUDED.notes,
                   updated_at              = CURRENT_TIMESTAMP`,
            [companyId, resolvedCustomerId, medical_background, allergies, blood_type,
             current_medications, chronic_conditions, dental_observations,
             emergency_contact_name, emergency_contact_phone, notes]
        );

        const combined = await db.query(
            `SELECT c.*,
                    dpp.id AS dental_profile_id,
                    dpp.medical_background,
                    dpp.allergies,
                    dpp.blood_type,
                    dpp.current_medications,
                    dpp.chronic_conditions,
                    dpp.dental_observations,
                    dpp.emergency_contact_name,
                    dpp.emergency_contact_phone,
                    dpp.notes AS dental_notes,
                    dpp.created_at AS dental_profile_created_at,
                    dpp.updated_at AS dental_profile_updated_at
             FROM ${schema}.customers c
             LEFT JOIN ${schema}.dental_patient_profiles dpp ON dpp.customer_id = c.id AND dpp.tenant_id = $1
             WHERE c.id = $2 AND c.tenant_id = $1`,
            [companyId, resolvedCustomerId]
        );

        res.status(201).json({ data: combined.rows[0] });
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
                    dpp.current_medications,
                    dpp.chronic_conditions,
                    dpp.dental_observations,
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
        const {
            first_name,
            last_name,
            document_type,
            document_number,
            phone,
            mobile,
            email,
            birth_date,
            address,
            city,
            customer_notes,
            medical_background,
            allergies,
            blood_type,
            current_medications,
            chronic_conditions,
            dental_observations,
            emergency_contact_name,
            emergency_contact_phone,
            notes
        } = req.body;

        // Update customer base data
        await db.query(
            `UPDATE ${schema}.customers
             SET first_name      = COALESCE($1, first_name),
                 last_name       = COALESCE($2, last_name),
                 document_type   = COALESCE($3, document_type),
                 document_number = COALESCE($4, document_number),
                 phone           = COALESCE($5, phone),
                 mobile          = COALESCE($6, mobile),
                 email           = COALESCE($7, email),
                 birth_date      = COALESCE($8, birth_date),
                 address         = COALESCE($9, address),
                 city            = COALESCE($10, city),
                 notes           = COALESCE($11, notes),
                 updated_at      = CURRENT_TIMESTAMP
             WHERE id = $12 AND tenant_id = $13`,
            [
                first_name !== undefined ? first_name : null,
                last_name !== undefined ? last_name : null,
                document_type !== undefined ? document_type : null,
                document_number !== undefined ? document_number : null,
                phone !== undefined ? phone : null,
                mobile !== undefined ? mobile : null,
                email !== undefined ? email : null,
                birth_date !== undefined ? birth_date : null,
                address !== undefined ? address : null,
                city !== undefined ? city : null,
                customer_notes !== undefined ? customer_notes : null,
                req.params.id,
                companyId
            ]
        );

        // Upsert dental profile
        await db.query(
            `INSERT INTO ${schema}.dental_patient_profiles
             (tenant_id, customer_id, medical_background, allergies, blood_type, current_medications, chronic_conditions, dental_observations, emergency_contact_name, emergency_contact_phone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (tenant_id, customer_id) DO UPDATE
               SET medical_background      = COALESCE(EXCLUDED.medical_background, dental_patient_profiles.medical_background),
                   allergies               = COALESCE(EXCLUDED.allergies, dental_patient_profiles.allergies),
                   blood_type              = COALESCE(EXCLUDED.blood_type, dental_patient_profiles.blood_type),
                   current_medications     = COALESCE(EXCLUDED.current_medications, dental_patient_profiles.current_medications),
                   chronic_conditions      = COALESCE(EXCLUDED.chronic_conditions, dental_patient_profiles.chronic_conditions),
                   dental_observations     = COALESCE(EXCLUDED.dental_observations, dental_patient_profiles.dental_observations),
                   emergency_contact_name  = COALESCE(EXCLUDED.emergency_contact_name, dental_patient_profiles.emergency_contact_name),
                   emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, dental_patient_profiles.emergency_contact_phone),
                   notes                   = COALESCE(EXCLUDED.notes, dental_patient_profiles.notes),
                   updated_at              = CURRENT_TIMESTAMP`,
            [
                companyId,
                req.params.id,
                medical_background !== undefined ? medical_background : null,
                allergies !== undefined ? allergies : null,
                blood_type !== undefined ? blood_type : null,
                current_medications !== undefined ? current_medications : null,
                chronic_conditions !== undefined ? chronic_conditions : null,
                dental_observations !== undefined ? dental_observations : null,
                emergency_contact_name !== undefined ? emergency_contact_name : null,
                emergency_contact_phone !== undefined ? emergency_contact_phone : null,
                notes !== undefined ? notes : null
            ]
        );

        // Return combined row like getById
        const combined = await db.query(
            `SELECT c.*,
                    dpp.id AS dental_profile_id,
                    dpp.medical_background,
                    dpp.allergies,
                    dpp.blood_type,
                    dpp.current_medications,
                    dpp.chronic_conditions,
                    dpp.dental_observations,
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

        if (combined.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_PATIENT_NOT_FOUND', error: 'Paciente no encontrado' });
        }

        res.json({ data: combined.rows[0] });
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
