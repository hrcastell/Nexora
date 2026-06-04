const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/treatments
 * Query: ?active=true
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { active } = req.query;

        const params = [companyId];
        const conditions = ['tenant_id = $1'];

        if (active === 'true') {
            conditions.push('is_active = TRUE');
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_treatments
             ${where}
             ORDER BY name ASC`,
            params
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('treatmentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar tratamientos') });
    }
};

/**
 * POST /dental/treatments
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            name,
            description = null,
            category = null,
            estimated_duration_minutes = null,
            requires_follow_up = false,
            requires_multiple_sessions = false,
            is_active = true
        } = req.body;

        if (!name) return res.status(400).json({ error: 'name es requerido' });

        const result = await db.query(
            `INSERT INTO ${schema}.dental_treatments
             (tenant_id, name, description, category, estimated_duration_minutes, requires_follow_up, requires_multiple_sessions, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [companyId, name, description, category, estimated_duration_minutes, requires_follow_up, requires_multiple_sessions, is_active]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('treatmentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear tratamiento') });
    }
};

/**
 * PATCH /dental/treatments/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            name,
            description,
            category,
            estimated_duration_minutes,
            requires_follow_up,
            requires_multiple_sessions,
            is_active
        } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.dental_treatments
             SET name                       = COALESCE($1, name),
                 description                = COALESCE($2, description),
                 category                   = COALESCE($3, category),
                 estimated_duration_minutes = COALESCE($4, estimated_duration_minutes),
                 requires_follow_up         = COALESCE($5, requires_follow_up),
                 requires_multiple_sessions = COALESCE($6, requires_multiple_sessions),
                 is_active                  = COALESCE($7, is_active),
                 updated_at                 = CURRENT_TIMESTAMP
             WHERE id = $8 AND tenant_id = $9
             RETURNING *`,
            [
                name || null,
                description !== undefined ? description : null,
                category !== undefined ? category : null,
                estimated_duration_minutes !== undefined ? estimated_duration_minutes : null,
                requires_follow_up !== undefined ? requires_follow_up : null,
                requires_multiple_sessions !== undefined ? requires_multiple_sessions : null,
                is_active !== undefined ? is_active : null,
                req.params.id,
                companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('treatmentsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar tratamiento') });
    }
};

/**
 * DELETE /dental/treatments/:id
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        // Check if treatment is used in any service
        const inUse = await db.query(
            `SELECT 1 FROM ${schema}.dental_service_treatments
             WHERE treatment_id = $1 AND tenant_id = $2
             LIMIT 1`,
            [req.params.id, companyId]
        );

        if (inUse.rows.length > 0) {
            return res.status(409).json({
                code: 'DENTAL_TREATMENT_IN_USE',
                error: 'El tratamiento está asociado a uno o más servicios y no puede eliminarse'
            });
        }

        const result = await db.query(
            `DELETE FROM ${schema}.dental_treatments
             WHERE id = $1 AND tenant_id = $2
             RETURNING id`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_TREATMENT_NOT_FOUND', error: 'Tratamiento no encontrado' });
        }

        res.json({ message: 'Tratamiento eliminado' });
    } catch (err) {
        console.error('treatmentsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar tratamiento') });
    }
};
