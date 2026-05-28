const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');
const { createNotification } = require('../utils/notifications');

const isSuperAdmin = (req) => req.user.is_super_admin === true;

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

const normalizeProfileIds = (input) => {
    if (!Array.isArray(input)) return null;
    return [...new Set(
        input
            .map((v) => Number(v))
            .filter((v) => Number.isInteger(v) && v > 0)
    )];
};

const defaultRoleNameFromUserRole = (role) => {
    if (role === 'admin') return 'admin';
    return 'user';
};

const defaultProfileCodeFromUserRole = ({ role, isCompanyAdmin }) => {
    if (role === 'admin' || isCompanyAdmin) return 'admin_empresa';
    if (role === 'outer_user') return 'consulta';
    if (role === 'inner_user') return 'operacion';
    return null;
};

async function resolveRoleId(client, schemaName, explicitRoleId, roleNameHint) {
    if (explicitRoleId) return explicitRoleId;
    const roleName = roleNameHint || 'user';
    const roleRes = await client.query(
        `SELECT id FROM "${schemaName}".roles WHERE name = $1 LIMIT 1`,
        [roleName]
    );
    return roleRes.rows[0]?.id || null;
}

async function resolveProfileIds(client, schemaName, normalizedProfileIds, role, isCompanyAdmin) {
    if (normalizedProfileIds !== null) return normalizedProfileIds;

    const defaultProfileCode = defaultProfileCodeFromUserRole({ role, isCompanyAdmin });
    if (!defaultProfileCode) return [];

    const profRes = await client.query(
        `SELECT id FROM "${schemaName}".profiles WHERE code = $1 LIMIT 1`,
        [defaultProfileCode]
    );
    if (profRes.rows.length === 0) return [];
    return [profRes.rows[0].id];
}

async function assertProfilesExist(client, schemaName, profileIds) {
    if (!profileIds.length) return;
    const check = await client.query(
        `SELECT id FROM "${schemaName}".profiles WHERE id = ANY($1::int[])`,
        [profileIds]
    );
    if (check.rows.length !== profileIds.length) {
        throw Object.assign(new Error('Uno o más perfiles seleccionados no existen en esta empresa'), { code: 'INVALID_PROFILE' });
    }
}

// ── Protección de usuario raíz ────────────────────────────────
const assertNotSystemUser = async (userId, client) => {
    const conn = client || db;
    const r = await conn.query('SELECT is_system_user FROM public.users WHERE id = $1', [userId]);
    if (r.rows.length > 0 && r.rows[0].is_system_user) {
        throw Object.assign(new Error('No se puede modificar el usuario raíz del sistema'), { code: 'SYSTEM_USER' });
    }
};

// GET /api/users — List all users across all companies (super_admin only)
exports.getAllUsers = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Acceso denegado. Solo super administrador.' });
        }

        const result = await db.query(
            `SELECT u.id, u.email, u.full_name, u.first_name, u.last_name,
                    u.phone, u.country, u.state_region, u.city, u.commune,
                    u.avatar_url, u.role, u.status, u.is_super_admin, u.is_system_user,
                    u.is_active, u.last_login_at, u.created_at, u.updated_at,
                    COUNT(DISTINCT cu.company_id) AS company_count
             FROM public.users u
             LEFT JOIN public.company_users cu ON u.id = cu.user_id
             GROUP BY u.id
             ORDER BY u.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// GET /api/companies/:id/users — List users of a company with extended fields
exports.getCompanyUsers = async (req, res) => {
    try {
        const { id: companyId} = req.params;

        const companyResult = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1', [companyId]
        );
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }
        const schemaName = companyResult.rows[0].schema_name;

        // Filter out super_admin users for non-super_admin requests
        const whereClause = isSuperAdmin(req) 
            ? `WHERE cu.company_id = $1`
            : `WHERE cu.company_id = $1 AND (u.is_super_admin IS NULL OR u.is_super_admin = FALSE)`;

        const result = await db.query(
            `SELECT u.id, u.email, u.full_name, u.first_name, u.last_name,
                    u.phone, u.country, u.state_region, u.city, u.commune,
                    u.avatar_url, u.role, u.status, u.is_super_admin, u.is_system_user,
                    u.is_active, u.last_login_at, u.created_at, u.updated_at,
                    cu.is_company_admin, cu.id AS company_user_id,
                    up.role_id, r.name AS role_name, up.status AS tenant_status,
                    up.job_title, up.access_level,
                    COALESCE(
                        JSON_AGG(
                            DISTINCT JSONB_BUILD_OBJECT('id', pr.id, 'code', pr.code, 'name', pr.name, 'is_primary', utp.is_primary)
                        ) FILTER (WHERE pr.id IS NOT NULL), '[]'
                    ) AS profiles
             FROM public.users u
             JOIN public.company_users cu ON u.id = cu.user_id
             LEFT JOIN "${schemaName}".user_profiles up ON u.id = up.user_id
             LEFT JOIN "${schemaName}".roles r ON up.role_id = r.id
             LEFT JOIN "${schemaName}".user_tenant_profiles utp ON u.id = utp.user_id
             LEFT JOIN "${schemaName}".profiles pr ON utp.profile_id = pr.id
             ${whereClause}
             GROUP BY u.id, cu.is_company_admin, cu.id, up.role_id, r.name,
                      up.status, up.job_title, up.access_level
             ORDER BY cu.is_company_admin DESC, u.full_name ASC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get company users error:', error);
        res.status(500).json({ error: 'Error al obtener usuarios de la empresa' });
    }
};

// POST /api/companies/:id/users — Crear usuario completo y vincularlo a empresa
exports.inviteUser = async (req, res) => {
    const client = await db.getClient();
    try {
        const { id: companyId } = req.params;
        const {
            email, first_name, last_name, full_name, password,
            phone, country, state_region, city, commune,
            role, is_company_admin, role_id, status, job_title, access_level,
            profile_ids
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        if (!first_name && !full_name) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial'
            });
        }

        await client.query('BEGIN');

        const companyResult = await client.query(
            'SELECT schema_name FROM public.companies WHERE id = $1', [companyId]
        );
        if (companyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }
        const schemaName = companyResult.rows[0].schema_name;

        const fName = first_name || (full_name ? full_name.split(' ')[0] : '');
        const lName = last_name  || (full_name ? full_name.split(' ').slice(1).join(' ') : '');
        const displayName = full_name || `${fName} ${lName}`.trim();

        let userResult = await client.query(
            'SELECT id FROM public.users WHERE email = $1', [email]
        );

        let userId;
        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
        } else {
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await client.query(
                `INSERT INTO public.users
                 (email, password_hash, full_name, first_name, last_name,
                  phone, country, state_region, city, commune,
                  role, status, is_super_admin, is_active, is_system_user, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,FALSE,TRUE,FALSE,$13)
                 RETURNING id`,
                [
                    email, passwordHash, displayName, fName, lName,
                    phone || null, country || null, state_region || null,
                    city || null, commune || null,
                    role || 'inner_user',
                    status || 'activo',
                    req.user.id
                ]
            );
            userId = newUser.rows[0].id;
        }

        const existingLink = await client.query(
            'SELECT id FROM public.company_users WHERE company_id = $1 AND user_id = $2',
            [companyId, userId]
        );
        if (existingLink.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El usuario ya está vinculado a esta empresa' });
        }

        await client.query(
            'INSERT INTO public.company_users (company_id, user_id, is_company_admin) VALUES ($1,$2,$3)',
            [companyId, userId, is_company_admin || false]
        );

        const assignedRoleId = await resolveRoleId(
            client,
            schemaName,
            role_id || null,
            defaultRoleNameFromUserRole(role || 'inner_user')
        );
        if (assignedRoleId) {
            await client.query(
                `INSERT INTO "${schemaName}".user_profiles
                 (user_id, role_id, is_active, status, job_title, access_level)
                 VALUES ($1,$2,TRUE,$3,$4,$5)
                 ON CONFLICT (user_id) DO UPDATE SET
                    role_id      = EXCLUDED.role_id,
                    status       = EXCLUDED.status,
                    job_title    = EXCLUDED.job_title,
                    access_level = EXCLUDED.access_level`,
                [userId, assignedRoleId, status || 'activo', job_title || null, access_level || 'por_modulo']
            );
        }

        const normalizedProfileIds = normalizeProfileIds(profile_ids);
        const requestedProfiles = (normalizedProfileIds && normalizedProfileIds.length > 0)
            ? normalizedProfileIds
            : null;
        const finalProfileIds = await resolveProfileIds(
            client,
            schemaName,
            requestedProfiles,
            role || 'inner_user',
            !!is_company_admin
        );
        await assertProfilesExist(client, schemaName, finalProfileIds);

        if (finalProfileIds.length > 0) {
            for (let i = 0; i < finalProfileIds.length; i++) {
                await client.query(
                    `INSERT INTO "${schemaName}".user_tenant_profiles (user_id, profile_id, is_primary, assigned_by)
                     VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, profile_id) DO NOTHING`,
                    [userId, finalProfileIds[i], i === 0, req.user.id]
                );
            }
        }

        await client.query('COMMIT');

        // Notificar al administrador que creó el usuario
        createNotification({
            userId:    req.user.id,
            companyId: Number(companyId),
            type:      'success',
            category:  'users',
            title:     'Usuario creado',
            body:      `El usuario ${displayName} (${email}) fue creado correctamente.`,
            actionUrl: `/admin/users`
        });

        res.status(201).json({ message: 'Usuario creado correctamente', userId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create user error:', error);
        if (error.code === 'SYSTEM_USER') return res.status(403).json({ error: error.message });
        if (error.code === 'INVALID_PROFILE') return res.status(400).json({ error: error.message });
        if (error.code === '23505')       return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
        res.status(500).json({ error: 'Error al crear usuario' });
    } finally {
        client.release();
    }
};

// PUT /api/companies/:id/users/:userId — Editar usuario completo
exports.updateCompanyUser = async (req, res) => {
    const client = await db.getClient();
    try {
        const { id: companyId, userId } = req.params;
        const {
            first_name, last_name, phone, country, state_region, city, commune,
            role, is_company_admin, role_id, status, job_title, access_level, profile_ids
        } = req.body;

        await client.query('BEGIN');

        await assertNotSystemUser(userId, client);

        const companyRes = await client.query(
            'SELECT schema_name FROM public.companies WHERE id = $1', [companyId]
        );
        if (companyRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }
        const schemaName = companyRes.rows[0].schema_name;

        const fullName = (first_name || '') + ' ' + (last_name || '');
        await client.query(
            `UPDATE public.users SET
                first_name   = COALESCE($1, first_name),
                last_name    = COALESCE($2, last_name),
                full_name    = CASE WHEN $1 IS NOT NULL OR $2 IS NOT NULL
                                    THEN TRIM(COALESCE($1, first_name) || ' ' || COALESCE($2, last_name))
                                    ELSE full_name END,
                phone        = COALESCE($3, phone),
                country      = COALESCE($4, country),
                state_region = COALESCE($5, state_region),
                city         = COALESCE($6, city),
                commune      = COALESCE($7, commune),
                role         = COALESCE($8, role),
                updated_by   = $9,
                updated_at   = CURRENT_TIMESTAMP
             WHERE id = $10`,
            [first_name, last_name, phone, country, state_region, city, commune,
             role, req.user.id, userId]
        );

        if (is_company_admin !== undefined) {
            await client.query(
                `UPDATE public.company_users SET is_company_admin = $1
                 WHERE company_id = $2 AND user_id = $3`,
                [is_company_admin, companyId, userId]
            );
        }

        const shouldUpsertUserProfile =
            role_id !== undefined ||
            status !== undefined ||
            job_title !== undefined ||
            access_level !== undefined ||
            role !== undefined ||
            is_company_admin !== undefined;

        if (shouldUpsertUserProfile) {
            const roleHint = role !== undefined
                ? role
                : (is_company_admin === true ? 'admin' : 'inner_user');
            const resolvedRoleId = await resolveRoleId(
                client,
                schemaName,
                role_id || null,
                defaultRoleNameFromUserRole(roleHint)
            );
            await client.query(
                `INSERT INTO "${schemaName}".user_profiles
                 (user_id, role_id, is_active, status, job_title, access_level)
                 VALUES ($1, COALESCE($2,
                     (SELECT id FROM "${schemaName}".roles WHERE name='user' LIMIT 1)
                 ), TRUE, COALESCE($3,'activo'), $4, COALESCE($5,'por_modulo'))
                 ON CONFLICT (user_id) DO UPDATE SET
                    role_id      = COALESCE(EXCLUDED.role_id, "${schemaName}".user_profiles.role_id),
                    status       = COALESCE($3, "${schemaName}".user_profiles.status),
                    job_title    = COALESCE($4, "${schemaName}".user_profiles.job_title),
                    access_level = COALESCE($5, "${schemaName}".user_profiles.access_level),
                    updated_at   = CURRENT_TIMESTAMP`,
                [userId, resolvedRoleId, status, job_title, access_level]
            );
        }

        const normalizedProfileIds = normalizeProfileIds(profile_ids);
        if (normalizedProfileIds !== null) {
            await assertProfilesExist(client, schemaName, normalizedProfileIds);
            await client.query(
                `DELETE FROM "${schemaName}".user_tenant_profiles WHERE user_id = $1`,
                [userId]
            );

            for (let i = 0; i < normalizedProfileIds.length; i++) {
                await client.query(
                    `INSERT INTO "${schemaName}".user_tenant_profiles (user_id, profile_id, is_primary, assigned_by)
                     VALUES ($1,$2,$3,$4)
                     ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
                    [userId, normalizedProfileIds[i], i === 0, req.user.id]
                );
            }
        } else if (role === 'admin' || is_company_admin === true) {
            const currentProfiles = await client.query(
                `SELECT COUNT(*)::int AS count FROM "${schemaName}".user_tenant_profiles WHERE user_id = $1`,
                [userId]
            );
            if ((currentProfiles.rows[0]?.count || 0) === 0) {
                const defaults = await resolveProfileIds(client, schemaName, null, 'admin', true);
                await assertProfilesExist(client, schemaName, defaults);
                for (let i = 0; i < defaults.length; i++) {
                    await client.query(
                        `INSERT INTO "${schemaName}".user_tenant_profiles (user_id, profile_id, is_primary, assigned_by)
                         VALUES ($1,$2,$3,$4)
                         ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
                        [userId, defaults[i], i === 0, req.user.id]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update company user error:', error);
        if (error.code === 'SYSTEM_USER') return res.status(403).json({ error: error.message });
        if (error.code === 'INVALID_PROFILE') return res.status(400).json({ error: error.message });
        res.status(500).json({ error: 'Error al actualizar usuario' });
    } finally {
        client.release();
    }
};

// PATCH /api/companies/:id/users/:userId/status — Cambiar estado del usuario
exports.changeUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['activo', 'suspendido', 'bloqueado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` });
        }

        const userCheck = await db.query('SELECT is_system_user FROM public.users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (userCheck.rows[0].is_system_user) {
            return res.status(403).json({ error: 'No se puede cambiar el estado del usuario raíz del sistema' });
        }

        const isActive = status === 'activo';
        await db.query(
            `UPDATE public.users SET status = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [status, isActive, userId]
        );

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Change user status error:', error);
        res.status(500).json({ error: 'Error al cambiar estado del usuario' });
    }
};

// POST /api/companies/:id/users/:userId/profiles — Asignar perfil a usuario
exports.assignUserProfile = async (req, res) => {
    try {
        const { id: companyId, userId } = req.params;
        const { profile_id, is_primary } = req.body;

        if (!profile_id) return res.status(400).json({ error: 'profile_id es requerido' });

        const companyRes = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1', [companyId]
        );
        if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
        const schemaName = companyRes.rows[0].schema_name;

        if (is_primary) {
            await db.query(
                `UPDATE "${schemaName}".user_tenant_profiles SET is_primary = FALSE WHERE user_id = $1`,
                [userId]
            );
        }

        await db.query(
            `INSERT INTO "${schemaName}".user_tenant_profiles (user_id, profile_id, is_primary, assigned_by)
             VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
            [userId, profile_id, is_primary || false, req.user.id]
        );

        res.json({ message: 'Perfil asignado correctamente' });
    } catch (error) {
        console.error('Assign profile error:', error);
        res.status(500).json({ error: 'Error al asignar perfil' });
    }
};

// DELETE /api/companies/:id/users/:userId/profiles/:profileId — Quitar perfil de usuario
exports.removeUserProfile = async (req, res) => {
    try {
        const { id: companyId, userId, profileId } = req.params;

        const companyRes = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1', [companyId]
        );
        if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
        const schemaName = companyRes.rows[0].schema_name;

        const result = await db.query(
            `DELETE FROM "${schemaName}".user_tenant_profiles
             WHERE user_id = $1 AND profile_id = $2 RETURNING id`,
            [userId, profileId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado para este usuario' });
        res.json({ message: 'Perfil removido correctamente' });
    } catch (error) {
        console.error('Remove profile error:', error);
        res.status(500).json({ error: 'Error al remover perfil' });
    }
};

// POST /api/users/upload-avatar — Subir foto de usuario
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se proporcionó ningún archivo' });

        const { userId } = req.body;
        const targetId = userId ? parseInt(userId) : req.user.id;

        if (targetId !== req.user.id && !isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Solo puedes subir tu propio avatar' });
        }

        const existing = await db.query('SELECT avatar_url FROM public.users WHERE id = $1', [targetId]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const oldAvatar = existing.rows[0].avatar_url;
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        await db.query(
            'UPDATE public.users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, targetId]
        );

        if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(__dirname, '..', oldAvatar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        res.json({ message: 'Avatar actualizado correctamente', avatar_url: avatarUrl });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Error al subir avatar' });
    }
};

// DELETE /api/users/:userId — Eliminar usuario global (super_admin only)
// Used when the user has no remaining company associations (orphaned after company deletion).
exports.deleteUser = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo super_admin puede eliminar usuarios globalmente' });

        const { userId } = req.params;
        await assertNotSystemUser(userId);

        const existing = await db.query('SELECT id, full_name FROM public.users WHERE id = $1', [userId]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Check if the user still belongs to any company
        const linked = await db.query('SELECT company_id FROM public.company_users WHERE user_id = $1 LIMIT 1', [userId]);
        if (linked.rows.length > 0) {
            return res.status(409).json({ error: 'El usuario aún pertenece a una o más empresas. Desvincúlalo primero.' });
        }

        await db.query('DELETE FROM public.users WHERE id = $1', [userId]);
        res.json({ message: 'Usuario eliminado del sistema' });
    } catch (error) {
        console.error('Delete user error:', error);
        if (error.code === 'SYSTEM_USER') return res.status(403).json({ error: error.message });
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};

// DELETE /api/companies/:id/users/:userId — Desvincular usuario de empresa
exports.removeCompanyUser = async (req, res) => {
    try {
        const { id: companyId, userId } = req.params;

        await assertNotSystemUser(userId);

        const result = await db.query(
            'DELETE FROM public.company_users WHERE company_id = $1 AND user_id = $2 RETURNING id',
            [companyId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado en esta empresa' });
        }

        res.json({ message: 'Usuario desvinculado de la empresa' });
    } catch (error) {
        console.error('Remove company user error:', error);
        if (error.code === 'SYSTEM_USER') return res.status(403).json({ error: error.message });
        res.status(500).json({ error: 'Error al desvincular usuario' });
    }
};

