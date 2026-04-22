const db = require('../config/db');

const isSuperAdmin = (req) => req.user?.is_super_admin === true;
const isAdmin      = (req) => isSuperAdmin(req) || req.user?.role === 'admin';

/**
 * GET /api/companies/:id/modules
 * Lista los módulos del catálogo global con el estado para esta compañía.
 * Incluye todos los módulos del catálogo, marcando cuáles están habilitados.
 */
exports.getCompanyModules = async (req, res) => {
    try {
        const { id: companyId } = req.params;

        // Validar acceso a la compañía: super_admin ve todo; admin solo su compañía actual
        if (!isSuperAdmin(req)) {
            if (String(req.user.company_id) !== String(companyId)) {
                return res.status(403).json({ error: 'Acceso denegado' });
            }
        }

        const result = await db.query(
            `SELECT
                m.id, m.code, m.name, m.description, m.icon, m.group_name,
                m.is_core, m.is_global, m.is_system, m.menu_order_default, m.status,
                cm.id AS assignment_id, cm.is_enabled, cm.is_visible, cm.is_required,
                cm.menu_order, cm.enabled_at, cm.disabled_at, cm.notes
             FROM public.module_catalog m
             LEFT JOIN public.company_modules cm
                    ON cm.module_id = m.id AND cm.company_id = $1
             WHERE m.status = 'activo'
             ORDER BY COALESCE(cm.menu_order, m.menu_order_default) ASC, m.name ASC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get company modules error:', error);
        res.status(500).json({ error: 'Error al obtener módulos de la compañía' });
    }
};

/**
 * PUT /api/companies/:id/modules/:moduleCode
 * Habilitar / deshabilitar / editar la asignación de un módulo a una compañía.
 * No se permite deshabilitar módulos core.
 */
exports.upsertCompanyModule = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Solo super_admin puede gestionar módulos por compañía' });
        }

        const { id: companyId, moduleCode } = req.params;
        const { is_enabled, is_visible, menu_order, notes } = req.body;

        const modRes = await client.query(
            'SELECT id, is_core FROM public.module_catalog WHERE code = $1',
            [moduleCode]
        );
        if (modRes.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado en el catálogo' });
        const { id: moduleId, is_core } = modRes.rows[0];

        // Proteger módulos core
        if (is_core && is_enabled === false) {
            return res.status(403).json({ error: 'No se puede deshabilitar un módulo core obligatorio' });
        }

        await client.query('BEGIN');

        const enabled    = is_enabled !== undefined ? !!is_enabled : true;
        const visible    = is_visible !== undefined ? !!is_visible : true;
        const orderVal   = Number.isFinite(menu_order) ? menu_order : null;
        const disabledAt = enabled ? null : 'CURRENT_TIMESTAMP';

        const upsertQuery = `
            INSERT INTO public.company_modules
                (company_id, module_id, is_enabled, is_visible, is_required, menu_order, enabled_at, disabled_at, notes)
            VALUES
                ($1, $2, $3, $4, $5, COALESCE($6, 0),
                 CASE WHEN $3 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
                 CASE WHEN $3 = FALSE THEN CURRENT_TIMESTAMP ELSE NULL END,
                 $7)
            ON CONFLICT (company_id, module_id) DO UPDATE SET
                is_enabled  = EXCLUDED.is_enabled,
                is_visible  = EXCLUDED.is_visible,
                menu_order  = COALESCE(EXCLUDED.menu_order, public.company_modules.menu_order),
                enabled_at  = CASE WHEN EXCLUDED.is_enabled = TRUE  AND public.company_modules.is_enabled = FALSE THEN CURRENT_TIMESTAMP ELSE public.company_modules.enabled_at END,
                disabled_at = CASE WHEN EXCLUDED.is_enabled = FALSE AND public.company_modules.is_enabled = TRUE  THEN CURRENT_TIMESTAMP ELSE public.company_modules.disabled_at END,
                notes       = COALESCE(EXCLUDED.notes, public.company_modules.notes)
            RETURNING *`;

        const result = await client.query(upsertQuery, [
            companyId, moduleId, enabled, visible, is_core, orderVal, notes ?? null
        ]);

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Upsert company module error:', error);
        res.status(500).json({ error: 'Error al actualizar módulo de compañía' });
    } finally {
        client.release();
    }
};

/**
 * Helper reutilizable: registrar los módulos core en una compañía nueva.
 * Se llama desde createCompany después de crear el tenant.
 */
exports.registerCompanyCoreModules = async (companyId, client) => {
    await client.query(
        `INSERT INTO public.company_modules (company_id, module_id, is_enabled, is_visible, is_required, menu_order)
         SELECT $1, m.id, TRUE, TRUE, m.is_core, m.menu_order_default
         FROM public.module_catalog m
         WHERE m.is_core = TRUE AND m.status = 'activo'
         ON CONFLICT (company_id, module_id) DO NOTHING`,
        [companyId]
    );
};
