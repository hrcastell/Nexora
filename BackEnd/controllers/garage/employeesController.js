const path = require('path');
const fs   = require('fs');
const db   = require('../../config/db');
const { resolveSchema }    = require('../../utils/tenantResolver');
const { makeGarageUpload } = require('../../utils/upload');

const employeeUpload = makeGarageUpload('employees', 2);

/**
 * GET /garage/employees
 * Query: ?q=, ?status=active|inactive|all, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, status = 'active', page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            const idx = params.length;
            conditions.push(`(LOWER(first_name) LIKE $${idx} OR LOWER(last_name) LIKE $${idx} OR LOWER(specialty) LIKE $${idx})`);
        }

        const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT id, first_name, last_name, role_name, specialty, phone, email, photo_url, status, user_id, created_at
             FROM ${schema}.employees ${where}
             ORDER BY first_name ASC, last_name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(`SELECT COUNT(*) FROM ${schema}.employees ${where}`, countParams);

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('employeesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar empleados' });
    }
};

/**
 * GET /garage/employees/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT * FROM ${schema}.employees WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('employeesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener empleado' });
    }
};

/**
 * POST /garage/employees
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema, companyId } = await resolveSchema(req);
        const { first_name, last_name, document_type, document_number, phone, email, role_name, specialty, notes, user_id } = req.body;

        if (!first_name?.trim()) return res.status(400).json({ error: 'first_name es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.employees (tenant_id, first_name, last_name, document_type, document_number, phone, email, role_name, specialty, notes, user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [companyId, first_name.trim(), last_name?.trim() || null, document_type || null, document_number || null,
             phone || null, email?.toLowerCase().trim() || null, role_name || null, specialty || null, notes || null, user_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('employeesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear empleado' });
    }
};

/**
 * PUT /garage/employees/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { first_name, last_name, document_type, document_number, phone, email, role_name, specialty, notes, user_id } = req.body;

        if (!first_name?.trim()) return res.status(400).json({ error: 'first_name es requerido' });

        const result = await db.query(
            `UPDATE ${schema}.employees SET first_name=$1, last_name=$2, document_type=$3, document_number=$4,
             phone=$5, email=$6, role_name=$7, specialty=$8, notes=$9, user_id=$10, updated_at=CURRENT_TIMESTAMP
             WHERE id=$11 RETURNING *`,
            [first_name.trim(), last_name?.trim() || null, document_type || null, document_number || null,
             phone || null, email?.toLowerCase().trim() || null, role_name || null, specialty || null, notes || null,
             user_id || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('employeesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar empleado' });
    }
};

/**
 * PATCH /garage/employees/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active o inactive' });

        const result = await db.query(
            `UPDATE ${schema}.employees SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('employeesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

/**
 * POST /garage/employees/:id/photo
 */
exports.uploadPhoto = [
    employeeUpload.single('photo'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
            const { schema } = await resolveSchema(req);

            const existing = await db.query(`SELECT photo_url FROM ${schema}.employees WHERE id = $1`, [req.params.id]);
            if (existing.rows.length === 0) { fs.unlinkSync(req.file.path); return res.status(404).json({ error: 'Empleado no encontrado' }); }

            const oldPhoto = existing.rows[0].photo_url;
            const photoUrl = `/uploads/garage/employees/${schema}/${req.file.filename}`;

            await db.query(`UPDATE ${schema}.employees SET photo_url=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [photoUrl, req.params.id]);

            if (oldPhoto) {
                const oldPath = path.join(__dirname, '..', '..', oldPhoto);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            res.json({ message: 'Foto actualizada', photo_url: photoUrl });
        } catch (err) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.error('employeesController.uploadPhoto error:', err.message);
            res.status(err.statusCode || 500).json({ error: err.message || 'Error al subir foto' });
        }
    }
];

/**
 * DELETE /garage/employees/:id/photo
 */
exports.deletePhoto = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);
        const existing = await db.query(`SELECT photo_url FROM ${schema}.employees WHERE id = $1`, [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

        const oldPhoto = existing.rows[0].photo_url;
        if (oldPhoto) {
            const oldPath = path.join(__dirname, '..', '..', oldPhoto);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await db.query(`UPDATE ${schema}.employees SET photo_url=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [req.params.id]);
        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('employeesController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar foto' });
    }
};
