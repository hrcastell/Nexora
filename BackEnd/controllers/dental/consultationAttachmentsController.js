const fs   = require('fs');
const path = require('path');
const db   = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { makeDentalDocumentUpload } = require('../../utils/upload');

// Multer instance for consultation attachments (10 MB max, images + PDF + Word)
exports.attachmentUpload = makeDentalDocumentUpload('consultation-attachments', 10);

/**
 * GET /dental/consultations/:id/attachments
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        // Verify consultation belongs to tenant
        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Consulta no encontrada' });
        }

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_consultation_attachments
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC`,
            [req.params.id, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('consultationAttachmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar adjuntos') });
    }
};

/**
 * POST /dental/consultations/:id/attachments  (multipart/form-data)
 */
exports.upload = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        if (!req.file) return res.status(400).json({ error: 'No se proporcionó archivo' });

        // Verify consultation belongs to tenant
        const check = await db.query(
            `SELECT id FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (check.rows.length === 0) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ error: 'Consulta no encontrada' });
        }

        const VALID_CATEGORIES = ['xray', 'lab_result', 'prescription', 'consent', 'referral', 'general'];
        const { category = 'general', description } = req.body;
        if (!VALID_CATEGORIES.includes(category)) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Categoría inválida' });
        }

        const baseUrl  = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        const fileUrl  = `${baseUrl}/uploads/dental/consultation-attachments/${req.user.schema_name}/${req.file.filename}`;

        let result;
        try {
            result = await db.query(
                `INSERT INTO ${schema}.dental_consultation_attachments
                 (tenant_id, consultation_id, file_url, file_name, file_type, file_size_bytes, category, description, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    companyId,
                    req.params.id,
                    fileUrl,
                    req.file.originalname,
                    req.file.mimetype || null,
                    req.file.size || null,
                    category,
                    description || null,
                    req.user?.id || null
                ]
            );
        } catch (dbErr) {
            fs.unlink(req.file.path, () => {});
            throw dbErr;
        }

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        console.error('consultationAttachmentsController.upload error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al subir adjunto') });
    }
};

/**
 * DELETE /dental/consultations/:id/attachments/:aid
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const current = await db.query(
            `SELECT file_url FROM ${schema}.dental_consultation_attachments
             WHERE id = $1 AND tenant_id = $2 AND consultation_id = $3`,
            [req.params.aid, companyId, req.params.id]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Adjunto no encontrado' });
        }

        const fileUrl = current.rows[0].file_url;
        if (fileUrl) {
            try {
                const urlPath = new URL(fileUrl).pathname;
                if (urlPath.startsWith('/uploads/dental/')) {
                    const filePath = path.join(__dirname, '../../', urlPath);
                    fs.unlink(filePath, () => {}); // best-effort
                }
            } catch (_) { /* malformed URL — skip file deletion */ }
        }

        await db.query(
            `DELETE FROM ${schema}.dental_consultation_attachments WHERE id = $1 AND tenant_id = $2 AND consultation_id = $3`,
            [req.params.aid, companyId, req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('consultationAttachmentsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar adjunto') });
    }
};
