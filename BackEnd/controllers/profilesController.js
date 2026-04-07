const db = require('../config/db');

const getSchema    = (req) => req.user.schema_name;
const isSuperAdmin = (req) => req.user.is_super_admin === true;
const isAdmin      = (req) => isSuperAdmin(req) || req.user.role === 'admin';

// GET /api/profiles — Listar perfiles del tenant
exports.getProfiles = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const result = await db.query(
            `SELECT p.*,
                    COUNT(DISTINCT pp.module_id) AS module_count,
                    COUNT(DISTINCT utp.user_id)  AS user_count
             FROM "${schema}".profiles p
             LEFT JOIN "${schema}".profile_permissions pp ON pp.profile_id = p.id
             LEFT JOIN "${schema}".user_tenant_profiles utp ON utp.profile_id = p.id
             GROUP BY p.id
             ORDER BY p.is_system_profile DESC, p.name ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get profiles error:', error);
        res.status(500).json({ error: 'Error al obtener perfiles' });
    }
};

// GET /api/profiles/:id — Detalle de perfil
exports.getProfileById = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const result = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// GET /api/profiles/:id/permissions — Matriz de permisos del perfil
exports.getProfilePermissions = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;

        const result = await db.query(
            `SELECT pp.*,
                    m.code AS module_code, m.name AS module_name,
                    m.icon AS module_icon, m.group_name AS module_group,
                    m.status AS module_status
             FROM "${schema}".modules m
             LEFT JOIN "${schema}".profile_permissions pp
                    ON pp.module_id = m.id AND pp.profile_id = $1
             WHERE m.status = 'activo'
             ORDER BY m.menu_order ASC, m.name ASC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get profile permissions error:', error);
        res.status(500).json({ error: 'Error al obtener permisos del perfil' });
    }
};

// PUT /api/profiles/:id/permissions — Actualizar matriz de permisos
exports.updateProfilePermissions = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { permissions } = req.body; // Array de { module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: 'El campo permissions debe ser un array' });
        }

        const profileCheck = await db.query(`SELECT id FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (profileCheck.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        await client.query('BEGIN');

        for (const perm of permissions) {
            const { module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin } = perm;
            await client.query(
                `INSERT INTO "${schema}".profile_permissions
                 (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (profile_id, module_id) DO UPDATE SET
                    can_view    = EXCLUDED.can_view,
                    can_create  = EXCLUDED.can_create,
                    can_edit    = EXCLUDED.can_edit,
                    can_delete  = EXCLUDED.can_delete,
                    can_approve = EXCLUDED.can_approve,
                    can_export  = EXCLUDED.can_export,
                    can_admin   = EXCLUDED.can_admin`,
                [id, module_id,
                 can_view ?? false, can_create ?? false, can_edit ?? false,
                 can_delete ?? false, can_approve ?? false, can_export ?? false, can_admin ?? false]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Permisos actualizados correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update profile permissions error:', error);
        res.status(500).json({ error: 'Error al actualizar permisos' });
    } finally {
        client.release();
    }
};

// POST /api/profiles — Crear perfil
exports.createProfile = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { code, name, description, scope } = req.body;
        if (!code || !name) return res.status(400).json({ error: 'Código y nombre son requeridos' });

        const slugRegex = /^[a-z0-9_]+$/;
        if (!slugRegex.test(code)) return res.status(400).json({ error: 'El código solo puede contener letras minúsculas, números y guiones bajos' });

        const result = await db.query(
            `INSERT INTO "${schema}".profiles (code, name, description, scope, is_system_profile, created_by)
             VALUES ($1,$2,$3,$4,FALSE,$5)
             RETURNING *`,
            [code, name, description || null, scope || 'empresa', req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create profile error:', error);
        if (error.code === '23505') return res.status(400).json({ error: 'El código del perfil ya existe' });
        res.status(500).json({ error: 'Error al crear perfil' });
    }
};

// PUT /api/profiles/:id — Editar perfil
exports.updateProfile = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { name, description, scope, is_active } = req.body;

        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        if (existing.rows[0].is_system_profile && !isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Los perfiles del sistema solo pueden ser modificados por el super administrador' });
        }

        const result = await db.query(
            `UPDATE "${schema}".profiles SET
                name        = COALESCE($1, name),
                description = COALESCE($2, description),
                scope       = COALESCE($3, scope),
                is_active   = COALESCE($4, is_active),
                updated_at  = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [name, description, scope, is_active, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
};

// DELETE /api/profiles/:id — Eliminar perfil
exports.deleteProfile = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;

        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        if (existing.rows[0].is_system_profile) {
            return res.status(403).json({ error: 'No se puede eliminar un perfil del sistema' });
        }

        const usersCheck = await db.query(
            `SELECT COUNT(*) FROM "${schema}".user_tenant_profiles WHERE profile_id = $1`, [id]
        );
        if (parseInt(usersCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar un perfil que tiene usuarios asignados' });
        }

        await db.query(`DELETE FROM "${schema}".profiles WHERE id = $1`, [id]);
        res.json({ message: 'Perfil eliminado correctamente' });
    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
};
