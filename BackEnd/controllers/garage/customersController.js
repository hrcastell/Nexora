const path = require('path');
const fs   = require('fs');
const db   = require('../../config/db');
const { resolveSchema }      = require('../../utils/tenantResolver');
const { makeGarageUpload }   = require('../../utils/upload');

const customerUpload = makeGarageUpload('customers', 2);

/**
 * GET /garage/customers
 * Lista clientes. Query: ?q=, ?status=active|inactive|all, ?page=1, ?limit=50
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
            conditions.push(`(LOWER(first_name) LIKE $${idx} OR LOWER(last_name) LIKE $${idx} OR LOWER(email) LIKE $${idx} OR phone LIKE $${idx} OR mobile LIKE $${idx})`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT id, first_name, last_name, phone, mobile, email, country, city,
                    commune_district, status, photo_url, created_at
             FROM ${schema}.customers
             ${where}
             ORDER BY first_name ASC, last_name ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.customers ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('customersController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar clientes' });
    }
};

/**
 * GET /garage/customers/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.customers WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('customersController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener cliente' });
    }
};

/**
 * POST /garage/customers
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const {
            first_name, last_name, document_type, document_number,
            phone, mobile, email, birth_date,
            country, region_state, city, commune_district, address,
            notes, source
        } = req.body;

        if (!first_name?.trim()) return res.status(400).json({ error: 'first_name es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.customers
             (first_name, last_name, document_type, document_number, phone, mobile, email,
              birth_date, country, region_state, city, commune_district, address, notes, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING *`,
            [
                first_name.trim(), last_name?.trim() || null, document_type || null, document_number || null,
                phone || null, mobile || null, email?.toLowerCase().trim() || null,
                birth_date || null, country || null, region_state || null,
                city || null, commune_district || null, address || null,
                notes || null, source || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('customersController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear cliente' });
    }
};

/**
 * PUT /garage/customers/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const {
            first_name, last_name, document_type, document_number,
            phone, mobile, email, birth_date,
            country, region_state, city, commune_district, address,
            notes, source
        } = req.body;

        if (!first_name?.trim()) return res.status(400).json({ error: 'first_name es requerido' });

        const result = await db.query(
            `UPDATE ${schema}.customers SET
             first_name=$1, last_name=$2, document_type=$3, document_number=$4,
             phone=$5, mobile=$6, email=$7, birth_date=$8,
             country=$9, region_state=$10, city=$11, commune_district=$12,
             address=$13, notes=$14, source=$15, updated_at=CURRENT_TIMESTAMP
             WHERE id=$16 RETURNING *`,
            [
                first_name.trim(), last_name?.trim() || null, document_type || null, document_number || null,
                phone || null, mobile || null, email?.toLowerCase().trim() || null,
                birth_date || null, country || null, region_state || null,
                city || null, commune_district || null, address || null,
                notes || null, source || null, req.params.id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('customersController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar cliente' });
    }
};

/**
 * PATCH /garage/customers/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'status debe ser active o inactive' });
        }

        const result = await db.query(
            `UPDATE ${schema}.customers SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('customersController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

/**
 * POST /garage/customers/:id/photo
 * Sube o reemplaza la foto de perfil del cliente.
 * Middleware: injectGarageSchema, customerUpload.single('photo')
 */
exports.uploadPhoto = [
    customerUpload.single('photo'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se proporcionó ningún archivo' });

            const { schema } = await resolveSchema(req);

            const existing = await db.query(
                `SELECT photo_url FROM ${schema}.customers WHERE id = $1`,
                [req.params.id]
            );
            if (existing.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

            const oldPhoto = existing.rows[0].photo_url;
            const photoUrl = `/uploads/garage/customers/${schema}/${req.file.filename}`;

            await db.query(
                `UPDATE ${schema}.customers SET photo_url=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
                [photoUrl, req.params.id]
            );

            if (oldPhoto) {
                const oldPath = path.join(__dirname, '..', '..', oldPhoto);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            res.json({ message: 'Foto actualizada', photo_url: photoUrl });
        } catch (err) {
            console.error('customersController.uploadPhoto error:', err.message);
            if (req.file) {
                const filePath = req.file.path;
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            res.status(err.statusCode || 500).json({ error: err.message || 'Error al subir foto' });
        }
    }
];

/**
 * DELETE /garage/customers/:id/photo
 */
exports.deletePhoto = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const existing = await db.query(
            `SELECT photo_url FROM ${schema}.customers WHERE id = $1`,
            [req.params.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

        const oldPhoto = existing.rows[0].photo_url;
        if (oldPhoto) {
            const oldPath = path.join(__dirname, '..', '..', oldPhoto);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await db.query(
            `UPDATE ${schema}.customers SET photo_url=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
            [req.params.id]
        );

        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('customersController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar foto' });
    }
};
