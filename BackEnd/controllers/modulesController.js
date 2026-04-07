const db = require('../config/db');

// ── Helper: obtener schema del tenant desde el token ──────────
const getSchema = (req) => req.user.schema_name;

const isSuperAdmin = (req) => req.user.is_super_admin === true;
const isAdmin      = (req) => isSuperAdmin(req) || req.user.role === 'admin';

// GET /api/modules — Listar módulos del tenant
exports.getModules = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { status, group } = req.query;
        let query = `SELECT * FROM "${schema}".modules`;
        const params = [];
        const conditions = [];

        if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
        if (group)  { params.push(group);  conditions.push(`group_name = $${params.length}`); }

        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY menu_order ASC, name ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({ error: 'Error al obtener módulos' });
    }
};

// GET /api/modules/:id — Detalle de un módulo
exports.getModuleById = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const result = await db.query(`SELECT * FROM "${schema}".modules WHERE id = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get module error:', error);
        res.status(500).json({ error: 'Error al obtener módulo' });
    }
};

// POST /api/modules — Crear módulo
exports.createModule = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { code, name, description, icon, group_name, is_global, show_in_menu, menu_order, status } = req.body;

        if (!code || !name) return res.status(400).json({ error: 'Código y nombre son requeridos' });

        const slugRegex = /^[a-z0-9_]+$/;
        if (!slugRegex.test(code)) return res.status(400).json({ error: 'El código solo puede contener letras minúsculas, números y guiones bajos' });

        const result = await db.query(
            `INSERT INTO "${schema}".modules
             (code, name, description, icon, group_name, is_global, show_in_menu, menu_order, status, is_system_module)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE)
             RETURNING *`,
            [
                code, name, description || null, icon || null, group_name || null,
                is_global !== undefined ? is_global : true,
                show_in_menu !== undefined ? show_in_menu : true,
                menu_order || 0,
                status || 'activo'
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create module error:', error);
        if (error.code === '23505') return res.status(400).json({ error: 'El código del módulo ya existe' });
        res.status(500).json({ error: 'Error al crear módulo' });
    }
};

// PUT /api/modules/:id — Editar módulo
exports.updateModule = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { name, description, icon, group_name, is_global, show_in_menu, menu_order, status } = req.body;

        const existing = await db.query(`SELECT * FROM "${schema}".modules WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });

        const mod = existing.rows[0];
        if (mod.is_system_module && !isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Los módulos del sistema solo pueden ser modificados por el super administrador' });
        }

        const result = await db.query(
            `UPDATE "${schema}".modules SET
                name         = COALESCE($1, name),
                description  = COALESCE($2, description),
                icon         = COALESCE($3, icon),
                group_name   = COALESCE($4, group_name),
                is_global    = COALESCE($5, is_global),
                show_in_menu = COALESCE($6, show_in_menu),
                menu_order   = COALESCE($7, menu_order),
                status       = COALESCE($8, status),
                updated_at   = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING *`,
            [name, description, icon, group_name, is_global, show_in_menu, menu_order, status, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update module error:', error);
        res.status(500).json({ error: 'Error al actualizar módulo' });
    }
};

// PATCH /api/modules/:id/status — Cambiar estado del módulo
exports.changeModuleStatus = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['activo', 'inactivo', 'borrador'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` });
        }

        const existing = await db.query(`SELECT * FROM "${schema}".modules WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });

        if (existing.rows[0].is_system_module && status === 'inactivo' && !isSuperAdmin(req)) {
            return res.status(403).json({ error: 'No se puede desactivar un módulo del sistema' });
        }

        const result = await db.query(
            `UPDATE "${schema}".modules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [status, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Change module status error:', error);
        res.status(500).json({ error: 'Error al cambiar estado del módulo' });
    }
};

// DELETE /api/modules/:id — Eliminar módulo (solo si no es sistema)
exports.deleteModule = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el super administrador puede eliminar módulos' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;

        const existing = await db.query(`SELECT * FROM "${schema}".modules WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });

        if (existing.rows[0].is_system_module) {
            return res.status(403).json({ error: 'No se puede eliminar un módulo del sistema' });
        }

        await db.query(`DELETE FROM "${schema}".modules WHERE id = $1`, [id]);
        res.json({ message: 'Módulo eliminado correctamente' });
    } catch (error) {
        console.error('Delete module error:', error);
        res.status(500).json({ error: 'Error al eliminar módulo' });
    }
};
