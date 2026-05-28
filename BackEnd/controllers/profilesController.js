const db = require('../config/db');

const getSchema    = (req) => req.user.schema_name;
const isSuperAdmin = (req) => req.user.is_super_admin === true;
const PROTECTED_PROFILE_CODES = new Set(['acceso_total']);

// Helper: resolve schema_name from company id (for super_admin cross-company ops)
async function getSchemaForCompany(companyId) {
    const r = await db.query('SELECT schema_name FROM public.companies WHERE id = $1', [companyId]);
    return r.rows[0]?.schema_name ?? null;
}

async function getProfileByIdInSchema(schema, profileId) {
    const result = await db.query(
        `SELECT id, code, is_system_profile
         FROM "${schema}".profiles
         WHERE id = $1`,
        [profileId]
    );
    return result.rows[0] || null;
}

function isProtectedProfileCode(code) {
    return PROTECTED_PROFILE_CODES.has(code);
}

function normalizePermissionFlags(permission = {}) {
    const hasAdvancedPermission =
        permission.can_create === true ||
        permission.can_edit === true ||
        permission.can_delete === true ||
        permission.can_approve === true ||
        permission.can_export === true ||
        permission.can_admin === true;

    const canView = permission.can_view === true || hasAdvancedPermission;

    return {
        can_view: canView,
        can_create: canView && permission.can_create === true,
        can_edit: canView && permission.can_edit === true,
        can_delete: canView && permission.can_delete === true,
        can_approve: canView && permission.can_approve === true,
        can_export: canView && permission.can_export === true,
        can_admin: canView && permission.can_admin === true,
    };
}

async function getActorAllowedTransactionCodes(schema, userId) {
    const profileRows = await db.query(
        `SELECT profile_id FROM "${schema}".user_tenant_profiles WHERE user_id = $1`,
        [userId]
    );
    const profileIds = profileRows.rows.map(r => r.profile_id);
    if (profileIds.length === 0) return new Set();

    const allowedRows = await db.query(
        `SELECT DISTINCT transaction_code
         FROM "${schema}".profile_transaction_permissions
         WHERE profile_id = ANY($1::int[])
           AND can_view = TRUE`,
        [profileIds]
    );
    return new Set(allowedRows.rows.map(r => r.transaction_code));
}

// ══════════════════════════════════════════════════════════════
// Company-scoped endpoints (super_admin manages any tenant)
// Routes: /api/companies/:companyId/profiles/…
// ══════════════════════════════════════════════════════════════

// GET /api/companies/:companyId/profiles
exports.getProfilesByCompany = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo super_admin puede gestionar perfiles de otras empresas' });
        const schema = await getSchemaForCompany(req.params.companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        // super_admin puede ver TODOS los perfiles de cualquier empresa, sin filtros
        const result = await db.query(
            `SELECT p.*,
                    COUNT(DISTINCT ptp.transaction_code) AS module_count,
                    COUNT(DISTINCT utp.user_id)          AS user_count
             FROM "${schema}".profiles p
             LEFT JOIN "${schema}".profile_transaction_permissions ptp
                    ON ptp.profile_id = p.id AND ptp.can_view = TRUE
             LEFT JOIN "${schema}".user_tenant_profiles utp ON utp.profile_id = p.id
             GROUP BY p.id
             ORDER BY p.is_system_profile DESC, p.name ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('getProfilesByCompany error:', error);
        res.status(500).json({ error: 'Error al obtener perfiles de la empresa' });
    }
};

// POST /api/companies/:companyId/profiles
exports.createProfileByCompany = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo super_admin puede crear perfiles en otras empresas' });
        const schema = await getSchemaForCompany(req.params.companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        const { code, name, description, scope } = req.body;
        if (!code || !name) return res.status(400).json({ error: 'Código y nombre son requeridos' });
        if (!/^[a-z0-9_]+$/.test(code)) return res.status(400).json({ error: 'El código solo puede contener letras minúsculas, números y guiones bajos' });

        const result = await db.query(
            `INSERT INTO "${schema}".profiles (code, name, description, scope, is_system_profile, created_by)
             VALUES ($1,$2,$3,$4,FALSE,$5) RETURNING *`,
            [code, name, description || null, scope || 'empresa', req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('createProfileByCompany error:', error);
        if (error.code === '23505') return res.status(400).json({ error: 'El código del perfil ya existe' });
        res.status(500).json({ error: 'Error al crear perfil' });
    }
};

// PUT /api/companies/:companyId/profiles/:profileId
exports.updateProfileByCompany = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });
        const schema = await getSchemaForCompany(req.params.companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        const { profileId } = req.params;
        const { name, description, scope, is_active } = req.body;

        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [profileId]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        const result = await db.query(
            `UPDATE "${schema}".profiles SET
                name        = COALESCE($1, name),
                description = COALESCE($2, description),
                scope       = COALESCE($3, scope),
                is_active   = COALESCE($4, is_active),
                updated_at  = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [name, description, scope, is_active, profileId]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('updateProfileByCompany error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
};

// DELETE /api/companies/:companyId/profiles/:profileId
exports.deleteProfileByCompany = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });
        const schema = await getSchemaForCompany(req.params.companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        const { profileId } = req.params;
        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [profileId]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        if (existing.rows[0].is_system_profile) return res.status(403).json({ error: 'No se puede eliminar un perfil del sistema' });

        const usersCheck = await db.query(`SELECT COUNT(*) FROM "${schema}".user_tenant_profiles WHERE profile_id = $1`, [profileId]);
        if (parseInt(usersCheck.rows[0].count) > 0) return res.status(400).json({ error: 'No se puede eliminar un perfil con usuarios asignados' });

        await db.query(`DELETE FROM "${schema}".profiles WHERE id = $1`, [profileId]);
        res.json({ message: 'Perfil eliminado correctamente' });
    } catch (error) {
        console.error('deleteProfileByCompany error:', error);
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
};

// GET /api/companies/:companyId/profiles/:profileId/permissions-full
exports.getProfilePermissionsFullByCompany = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });
        const { companyId, profileId } = req.params;
        const schema = await getSchemaForCompany(companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        const profileCheck = await db.query(`SELECT id FROM "${schema}".profiles WHERE id = $1`, [profileId]);
        if (profileCheck.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        const modsRes = await db.query(`
            SELECT mc.id AS module_id, mc.code AS module_code, mc.name AS module_name,
                   mc.icon AS module_icon, mc.group_name AS module_group, mc.menu_order_default AS menu_order
            FROM public.module_catalog mc
            JOIN public.company_modules cm ON cm.module_id = mc.id AND cm.company_id = $1 AND cm.is_enabled = TRUE
            WHERE mc.status = 'activo'
            ORDER BY mc.menu_order_default ASC, mc.name ASC
        `, [companyId]);

        if (modsRes.rows.length === 0) return res.json([]);
        const moduleCodes = modsRes.rows.map(m => m.module_code);

        const txRes = await db.query(`
            SELECT mt.id AS transaction_id, mt.module_id, mc.code AS module_code,
                   mt.code AS transaction_code, mt.name AS transaction_name,
                   mt.icon AS transaction_icon, mt.route, mt.tab_order
            FROM public.module_transactions mt
            JOIN public.module_catalog mc ON mc.id = mt.module_id
            WHERE mc.code = ANY($1::text[]) AND mt.status = 'activo'
            ORDER BY mt.tab_order ASC, mt.name ASC
        `, [moduleCodes]);

        const permsRes = await db.query(`
            SELECT transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin
            FROM "${schema}".profile_transaction_permissions WHERE profile_id = $1
        `, [profileId]);

        const permsMap = {};
        for (const p of permsRes.rows) permsMap[p.transaction_code] = p;

        const result = modsRes.rows.map(mod => ({
            module_id: mod.module_id, module_code: mod.module_code, module_name: mod.module_name,
            module_icon: mod.module_icon, module_group: mod.module_group,
            transactions: txRes.rows.filter(t => t.module_code === mod.module_code).map(t => ({
                transaction_code: t.transaction_code, transaction_name: t.transaction_name,
                transaction_icon: t.transaction_icon, route: t.route,
                ...(permsMap[t.transaction_code] ?? {
                    can_view: false, can_create: false, can_edit: false,
                    can_delete: false, can_approve: false, can_export: false, can_admin: false
                })
            }))
        }));
        res.json(result);
    } catch (error) {
        console.error('getProfilePermissionsFullByCompany error:', error);
        res.status(500).json({ error: 'Error al obtener permisos del perfil' });
    }
};

// PUT /api/companies/:companyId/profiles/:profileId/permissions-full
exports.updateProfilePermissionsFullByCompany = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });
        const { companyId, profileId } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) return res.status(400).json({ error: 'El campo permissions debe ser un array' });

        const schema = await getSchemaForCompany(companyId);
        if (!schema) return res.status(404).json({ error: 'Empresa no encontrada' });

        const profileCheck = await db.query(`SELECT id FROM "${schema}".profiles WHERE id = $1`, [profileId]);
        if (profileCheck.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

        await client.query('BEGIN');
        for (const p of permissions) {
            const {
                transaction_code,
            } = p;
            const {
                can_view, can_create, can_edit, can_delete,
                can_approve, can_export, can_admin
            } = normalizePermissionFlags(p);
            await client.query(`
                INSERT INTO "${schema}".profile_transaction_permissions
                    (profile_id, transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
                ON CONFLICT (profile_id, transaction_code) DO UPDATE SET
                    can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit,
                    can_delete=EXCLUDED.can_delete, can_approve=EXCLUDED.can_approve, can_export=EXCLUDED.can_export,
                    can_admin=EXCLUDED.can_admin, updated_at=NOW()
            `, [profileId, transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Permisos actualizados correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('updateProfilePermissionsFullByCompany error:', error);
        res.status(500).json({ error: 'Error al actualizar permisos' });
    } finally {
        client.release();
    }
};

// GET /api/profiles — Listar perfiles del tenant
exports.getProfiles = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        // Non-super_admin cannot see global profiles (acceso_total) nor their own profile (admin_empresa).
        // Company admins can see/manage other company profiles (consulta, operacion, supervisor).
        const whereClause = isSuperAdmin(req)
            ? ``
            : `WHERE p.code NOT IN ('acceso_total', 'admin_empresa')`;

        // module_count: número de transacciones con al menos un permiso activo (sistema actual)
        const result = await db.query(
            `SELECT p.*,
                    COUNT(DISTINCT ptp.transaction_code) AS module_count,
                    COUNT(DISTINCT utp.user_id)          AS user_count
             FROM "${schema}".profiles p
             LEFT JOIN "${schema}".profile_transaction_permissions ptp
                    ON ptp.profile_id = p.id AND ptp.can_view = TRUE
             LEFT JOIN "${schema}".user_tenant_profiles utp ON utp.profile_id = p.id
             ${whereClause}
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
        if (!isSuperAdmin(req) && isProtectedProfileCode(result.rows[0].code)) {
            return res.status(403).json({ error: 'No tienes permisos para ver este perfil' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// GET /api/profiles/:id/permissions — DEPRECATED
// Operaba sobre {schema}.modules + {schema}.profile_permissions (ambas tablas legacy).
// Usar /api/profiles/:id/permissions-full que opera sobre profile_transaction_permissions.
exports.getProfilePermissions = (_req, res) => res.status(410).json({
    error:   'Endpoint deprecado',
    message: 'Usa GET /api/profiles/:id/permissions-full para la matriz de permisos por transacción.',
});

// PUT /api/profiles/:id/permissions — DEPRECATED
// Operaba sobre {schema}.profile_permissions (tabla legacy por módulo).
// Usar PUT /api/profiles/:id/permissions-full que opera sobre profile_transaction_permissions.
exports.updateProfilePermissions = (_req, res) => res.status(410).json({
    error:   'Endpoint deprecado',
    message: 'Usa PUT /api/profiles/:id/permissions-full para actualizar permisos por transacción.',
});

// GET /api/profiles/:id/permissions-full
// Devuelve módulos habilitados de la empresa, con sus transacciones y el estado
// actual de permisos por transacción para el perfil indicado.
exports.getProfilePermissionsFull = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;

        // Verificar que el perfil existe en este tenant
        const targetProfile = await getProfileByIdInSchema(schema, id);
        if (!targetProfile)
            return res.status(404).json({ error: 'Perfil no encontrado' });
        if (!isSuperAdmin(req) && isProtectedProfileCode(targetProfile.code)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar este perfil' });
        }

        // Obtener company_id desde el JWT
        const companyId = req.user.company_id;
        if (!companyId) return res.status(400).json({ error: 'company_id no disponible en el token' });

        // Módulos habilitados para la empresa (catálogo público + company_modules)
        const modsRes = await db.query(`
            SELECT
                mc.id          AS module_id,
                mc.code        AS module_code,
                mc.name        AS module_name,
                mc.icon        AS module_icon,
                mc.group_name  AS module_group,
                mc.menu_order_default AS menu_order
            FROM public.module_catalog mc
            JOIN public.company_modules cm
                ON cm.module_id = mc.id AND cm.company_id = $1 AND cm.is_enabled = TRUE
            WHERE mc.status = 'activo'
            ORDER BY mc.menu_order_default ASC, mc.name ASC
        `, [companyId]);

        if (modsRes.rows.length === 0) return res.json([]);

        const moduleCodes = modsRes.rows.map(m => m.module_code);

        // Transacciones de esos módulos
        const txRes = await db.query(`
            SELECT
                mt.id            AS transaction_id,
                mt.module_id,
                mc.code          AS module_code,
                mt.code          AS transaction_code,
                mt.name          AS transaction_name,
                mt.icon          AS transaction_icon,
                mt.route,
                mt.tab_order
            FROM public.module_transactions mt
            JOIN public.module_catalog mc ON mc.id = mt.module_id
            WHERE mc.code = ANY($1::text[])
              AND mt.status = 'activo'
            ORDER BY mt.tab_order ASC, mt.name ASC
        `, [moduleCodes]);

        let transactionRows = txRes.rows;
        if (!isSuperAdmin(req)) {
            const allowedTxCodes = await getActorAllowedTransactionCodes(schema, req.user.id);
            transactionRows = transactionRows.filter(t => allowedTxCodes.has(t.transaction_code));
        }

        // Permisos actuales del perfil por transaction_code
        const permsRes = await db.query(`
            SELECT transaction_code,
                   can_view, can_create, can_edit, can_delete,
                   can_approve, can_export, can_admin
            FROM "${schema}".profile_transaction_permissions
            WHERE profile_id = $1
        `, [id]);

        const permsMap = {};
        for (const p of permsRes.rows) permsMap[p.transaction_code] = p;

        // Agrupar transacciones por módulo
        const result = modsRes.rows.map(mod => ({
            module_id:    mod.module_id,
            module_code:  mod.module_code,
            module_name:  mod.module_name,
            module_icon:  mod.module_icon,
            module_group: mod.module_group,
            transactions: transactionRows
                .filter(t => t.module_code === mod.module_code)
                .map(t => ({
                    transaction_code: t.transaction_code,
                    transaction_name: t.transaction_name,
                    transaction_icon: t.transaction_icon,
                    route:            t.route,
                    ...(permsMap[t.transaction_code] ?? {
                        can_view: false, can_create: false, can_edit: false,
                        can_delete: false, can_approve: false, can_export: false, can_admin: false
                    })
                }))
        }))
        .filter(mod => isSuperAdmin(req) || mod.transactions.length > 0);

        res.json(result);
    } catch (error) {
        console.error('getProfilePermissionsFull error:', error);
        res.status(500).json({ error: 'Error al obtener permisos completos del perfil' });
    }
};

// PUT /api/profiles/:id/permissions-full
// Recibe: { permissions: [{ transaction_code, can_view, ... }] }
// Upsert en profile_transaction_permissions.
exports.updateProfilePermissionsFull = async (req, res) => {
    const client = await db.getClient();
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions))
            return res.status(400).json({ error: 'El campo permissions debe ser un array' });

        const targetProfile = await getProfileByIdInSchema(schema, id);
        if (!targetProfile)
            return res.status(404).json({ error: 'Perfil no encontrado' });
        if (!isSuperAdmin(req) && isProtectedProfileCode(targetProfile.code)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar este perfil' });
        }

        let allowedTxCodes = null;
        if (!isSuperAdmin(req)) {
            allowedTxCodes = await getActorAllowedTransactionCodes(schema, req.user.id);
            const disallowed = permissions
                .map(p => p?.transaction_code)
                .filter(code => typeof code === 'string' && !allowedTxCodes.has(code));
            if (disallowed.length > 0) {
                return res.status(403).json({ error: 'No puedes modificar transacciones fuera de tu alcance' });
            }
        }

        await client.query('BEGIN');

        for (const p of permissions) {
            const {
                transaction_code,
            } = p;
            if (!transaction_code || (allowedTxCodes && !allowedTxCodes.has(transaction_code))) continue;

            const {
                can_view, can_create, can_edit, can_delete,
                can_approve, can_export, can_admin
            } = normalizePermissionFlags(p);

            await client.query(`
                INSERT INTO "${schema}".profile_transaction_permissions
                    (profile_id, transaction_code,
                     can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin,
                     updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
                ON CONFLICT (profile_id, transaction_code) DO UPDATE SET
                    can_view    = EXCLUDED.can_view,
                    can_create  = EXCLUDED.can_create,
                    can_edit    = EXCLUDED.can_edit,
                    can_delete  = EXCLUDED.can_delete,
                    can_approve = EXCLUDED.can_approve,
                    can_export  = EXCLUDED.can_export,
                    can_admin   = EXCLUDED.can_admin,
                    updated_at  = NOW()
            `, [id, transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Permisos de transacciones actualizados correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('updateProfilePermissionsFull error:', error);
        res.status(500).json({ error: 'Error al actualizar permisos de transacciones' });
    } finally {
        client.release();
    }
};

// POST /api/profiles — Crear perfil
exports.createProfile = async (req, res) => {
    try {
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { code, name, description, scope } = req.body;
        if (!code || !name) return res.status(400).json({ error: 'Código y nombre son requeridos' });

        const slugRegex = /^[a-z0-9_]+$/;
        if (!slugRegex.test(code)) return res.status(400).json({ error: 'El código solo puede contener letras minúsculas, números y guiones bajos' });
        if (!isSuperAdmin(req) && isProtectedProfileCode(code)) {
            return res.status(403).json({ error: 'No puedes crear perfiles reservados del sistema' });
        }

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
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;
        const { name, description, scope, is_active } = req.body;

        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        if (!isSuperAdmin(req) && isProtectedProfileCode(existing.rows[0].code)) {
            return res.status(403).json({ error: 'No puedes modificar un perfil reservado del sistema' });
        }

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
        const schema = getSchema(req);
        if (!schema) return res.status(400).json({ error: 'Contexto de empresa requerido' });

        const { id } = req.params;

        const existing = await db.query(`SELECT * FROM "${schema}".profiles WHERE id = $1`, [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        if (!isSuperAdmin(req) && isProtectedProfileCode(existing.rows[0].code)) {
            return res.status(403).json({ error: 'No puedes eliminar un perfil reservado del sistema' });
        }

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
