const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const VALID_TYPES = ['medical_report', 'medical_certificate', 'prescription'];
const PREFIX = {
  medical_report:      'IM',
  medical_certificate: 'CM',
  prescription:        'RX',
};

function formatDocNumber(type, seqVal) {
  return `${PREFIX[type]}-${String(seqVal).padStart(6, '0')}`;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { customer_id, consultation_id, document_type, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = ['d.tenant_id = $1'];
    const params = [companyId];
    let idx = 2;

    if (customer_id) {
      conditions.push(`d.customer_id = $${idx++}`);
      params.push(customer_id);
    }
    if (consultation_id) {
      conditions.push(`d.consultation_id = $${idx++}`);
      params.push(consultation_id);
    }
    if (document_type) {
      conditions.push(`d.document_type = $${idx++}`);
      params.push(document_type);
    }

    const where = conditions.join(' AND ');
    params.push(Number(limit), offset);

    const result = await db.query(
      `SELECT d.*,
              c.first_name AS customer_first_name,
              c.last_name  AS customer_last_name
       FROM ${schema}.dental_medical_documents d
       LEFT JOIN ${schema}.customers c ON c.id = d.customer_id
       WHERE ${where}
       ORDER BY d.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    // Total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM ${schema}.dental_medical_documents d WHERE ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      data:  result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page:  Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('medicalDocumentsController.list error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { id } = req.params;

    const result = await db.query(
      `SELECT d.*,
              c.first_name AS customer_first_name,
              c.last_name  AS customer_last_name
       FROM ${schema}.dental_medical_documents d
       LEFT JOIN ${schema}.customers c ON c.id = d.customer_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('medicalDocumentsController.getById error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);

    if (req.user.read_only) {
      return res.status(403).json({ error: 'Acceso de solo lectura' });
    }

    const {
      customer_id,
      consultation_id,
      document_type,
      document_date,
      title,
      content,
      professional_name,
      professional_license,
      professional_specialty,
    } = req.body;

    // Validate document_type
    if (!document_type || !VALID_TYPES.includes(document_type)) {
      return res.status(400).json({ error: `document_type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    // Validate customer exists in tenant
    const customerCheck = await db.query(
      `SELECT id FROM ${schema}.customers WHERE id = $1 AND tenant_id = $2`,
      [customer_id, companyId]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Validate consultation belongs to tenant (if provided)
    if (consultation_id) {
      const consultCheck = await db.query(
        `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
        [consultation_id, companyId]
      );
      if (consultCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Consultation not found' });
      }
    }

    // Generate document number + INSERT atomically
    const client = await db.getClient();
    let result;
    try {
      await client.query('BEGIN');

      const seqResult = await client.query(
        `SELECT NEXTVAL('${schema}.dental_medical_doc_number_seq') AS seq_val`
      );
      const seqVal = parseInt(seqResult.rows[0].seq_val, 10);
      const document_number = formatDocNumber(document_type, seqVal);

      result = await client.query(
        `INSERT INTO ${schema}.dental_medical_documents
           (tenant_id, customer_id, consultation_id, document_type, document_number,
            document_date, title, content, professional_name, professional_license,
            professional_specialty, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          companyId,
          customer_id,
          consultation_id || null,
          document_type,
          document_number,
          document_date || new Date().toISOString().slice(0, 10),
          title || null,
          content || null,
          professional_name || null,
          professional_license || null,
          professional_specialty || null,
          req.user.id || null,
        ]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('medicalDocumentsController.create error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { id } = req.params;

    if (req.user.read_only) {
      return res.status(403).json({ error: 'Acceso de solo lectura' });
    }

    // Check document exists in tenant
    const check = await db.query(
      `SELECT id FROM ${schema}.dental_medical_documents WHERE id = $1 AND tenant_id = $2`,
      [id, companyId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const {
      title,
      content,
      professional_name,
      professional_license,
      professional_specialty,
      document_date,
    } = req.body;

    const result = await db.query(
      `UPDATE ${schema}.dental_medical_documents
       SET title                 = COALESCE($1, title),
           content               = COALESCE($2, content),
           professional_name     = COALESCE($3, professional_name),
           professional_license  = COALESCE($4, professional_license),
           professional_specialty = COALESCE($5, professional_specialty),
           document_date         = COALESCE($6, document_date),
           updated_at            = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING *`,
      [
        title !== undefined ? title : null,
        content !== undefined ? content : null,
        professional_name !== undefined ? professional_name : null,
        professional_license !== undefined ? professional_license : null,
        professional_specialty !== undefined ? professional_specialty : null,
        document_date || null,
        id,
        companyId,
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('medicalDocumentsController.update error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── REMOVE ───────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { id } = req.params;

    if (req.user.read_only) {
      return res.status(403).json({ error: 'Acceso de solo lectura' });
    }

    const result = await db.query(
      `DELETE FROM ${schema}.dental_medical_documents
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('medicalDocumentsController.remove error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── GET PRINT DATA ───────────────────────────────────────────────────────────
exports.getPrintData = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { id } = req.params;

    // Document
    const docResult = await db.query(
      `SELECT * FROM ${schema}.dental_medical_documents
       WHERE id = $1 AND tenant_id = $2`,
      [id, companyId]
    );
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const document = docResult.rows[0];

    // Patient info (customers + dental_patient_profiles)
    const patientResult = await db.query(
      `SELECT c.id, c.first_name, c.last_name, c.document_type, c.document_number, c.phone, c.mobile, c.email,
              dp.medical_background, dp.allergies, dp.blood_type,
              dp.current_medications, dp.chronic_conditions
       FROM ${schema}.customers c
       LEFT JOIN ${schema}.dental_patient_profiles dp ON dp.customer_id = c.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [document.customer_id, companyId]
    );
    const patient = patientResult.rows[0] || null;

    // Company config
    const configResult = await db.query(
      `SELECT * FROM ${schema}.config_company WHERE tenant_id = $1 LIMIT 1`,
      [companyId]
    );
    const config = configResult.rows[0] || {};

    res.json({ data: { document, patient, config } });
  } catch (err) {
    console.error('medicalDocumentsController.getPrintData error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── GET FOR PATIENT ──────────────────────────────────────────────────────────
exports.getForPatient = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { customerId } = req.params;

    const result = await db.query(
      `SELECT d.*,
              c.first_name AS customer_first_name,
              c.last_name  AS customer_last_name
       FROM ${schema}.dental_medical_documents d
       LEFT JOIN ${schema}.customers c ON c.id = d.customer_id
       WHERE d.tenant_id = $1 AND d.customer_id = $2
       ORDER BY d.created_at DESC`,
      [companyId, customerId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('medicalDocumentsController.getForPatient error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};

// ─── GET FOR CONSULTATION ─────────────────────────────────────────────────────
exports.getForConsultation = async (req, res) => {
  try {
    const { schema, companyId } = await resolveSchema(req);
    const { consultationId } = req.params;

    // Verify consultation belongs to tenant
    const consultCheck = await db.query(
      `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
      [consultationId, companyId]
    );
    if (consultCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const result = await db.query(
      `SELECT d.*,
              c.first_name AS customer_first_name,
              c.last_name  AS customer_last_name
       FROM ${schema}.dental_medical_documents d
       LEFT JOIN ${schema}.customers c ON c.id = d.customer_id
       WHERE d.tenant_id = $1 AND d.consultation_id = $2
       ORDER BY d.created_at DESC`,
      [companyId, consultationId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('medicalDocumentsController.getForConsultation error:', err.message);
    res.status(err.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error'),
    });
  }
};
