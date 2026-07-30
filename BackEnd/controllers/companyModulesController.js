const db = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { invalidateCompanyModuleCache } = require('../utils/moduleState');

const isSuperAdmin = (req) => req.user?.is_super_admin === true;
const isAdmin      = (req) => isSuperAdmin(req) || req.user?.role === 'admin';

const DEFAULT_PROFILE_PERMISSION_FLAGS = {
    acceso_total:  [true, true, true, true, true, true, true],
    admin_empresa: [true, true, true, true, true, true, true],
};

/**
 * Seed default profile_transaction_permissions when a module is enabled for a
 * company. This keeps the two-layer model aligned:
 *   1) public.company_modules enables the module for the company
 *   2) {tenant}.profile_transaction_permissions makes it visible to profiles
 *
 * ON CONFLICT DO NOTHING is intentional: never overwrite permissions the user
 * already customized for a profile.
 */
async function seedDefaultProfilePermissionsForModule(client, { companyId, moduleId }) {
    const companyRes = await client.query(
        'SELECT schema_name FROM public.companies WHERE id = $1',
        [companyId]
    );
    const schema = companyRes.rows[0]?.schema_name;
    if (!schema) return;

    const txRes = await client.query(
        `SELECT code
         FROM public.module_transactions
         WHERE module_id = $1 AND status = 'activo'`,
        [moduleId]
    );
    const transactionCodes = txRes.rows.map(r => r.code);
    if (transactionCodes.length === 0) return;

    // Buscar solo el perfil admin_empresa
    const adminProfileRes = await client.query(
        `SELECT id FROM "${schema}".profiles WHERE code = 'admin_empresa' LIMIT 1`
    );

    if (adminProfileRes.rows.length === 0) {
        console.warn(`No admin_empresa profile found in ${schema} - skipping permission seed`);
        return;
    }

    const adminProfileId = adminProfileRes.rows[0].id;

    // Seedear permisos completos solo para admin_empresa
    for (const transactionCode of transactionCodes) {
        await client.query(
            `INSERT INTO "${schema}".profile_transaction_permissions
             (profile_id, transaction_code, can_view, can_create, can_edit,
              can_delete, can_approve, can_export, can_admin)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (profile_id, transaction_code) DO NOTHING`,
            [adminProfileId, transactionCode, true, true, true, true, true, true, true]
        );
    }
}

/**
 * Seed default profile_transaction_permissions for the virtual `products`
 * transaction (public.module_catalog code='products', ADR-1: no
 * company_modules row for it — see BackEnd/utils/moduleState.js) when
 * `garage_operations` or `inventory` is enabled for a company.
 *
 * This mirrors Database/04_migrations/53_products_cotizaciones_profile_permissions.sql's
 * one-time backfill, but going forward for companies enabling either core
 * AFTER that migration ran — otherwise admin_empresa would never see the
 * neutral Products node for newly-onboarded/newly-enabled companies.
 */
async function seedVirtualProductsPermissions(client, companyId) {
    const companyRes = await client.query(
        'SELECT schema_name FROM public.companies WHERE id = $1',
        [companyId]
    );
    const schema = companyRes.rows[0]?.schema_name;
    if (!schema) return;

    const adminProfileRes = await client.query(
        `SELECT id FROM "${schema}".profiles WHERE code = 'admin_empresa' LIMIT 1`
    );
    if (adminProfileRes.rows.length === 0) {
        console.warn(`No admin_empresa profile found in ${schema} - skipping products permission seed`);
        return;
    }
    const adminProfileId = adminProfileRes.rows[0].id;

    await client.query(
        `INSERT INTO "${schema}".profile_transaction_permissions
         (profile_id, transaction_code, can_view, can_create, can_edit,
          can_delete, can_approve, can_export, can_admin)
         VALUES ($1, 'products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
         ON CONFLICT (profile_id, transaction_code) DO NOTHING`,
        [adminProfileId]
    );
}

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
                m.id AS module_id, m.code, m.name, m.description, m.icon, m.group_name,
                m.is_core, m.is_global, m.is_system, m.menu_order_default, m.status,
                COALESCE(m.category, 'core_base') AS category,
                COALESCE(m.version,  '1.0.0')     AS version,
                cm.id AS assignment_id,
                COALESCE(cm.is_enabled,  FALSE) AS is_enabled,
                COALESCE(cm.is_visible,  TRUE)  AS is_visible,
                COALESCE(cm.is_required, FALSE) AS is_required,
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

        const enabled  = is_enabled !== undefined ? !!is_enabled : true;
        const visible  = is_visible !== undefined ? !!is_visible : true;
        const orderVal = Number.isFinite(menu_order) ? menu_order : null;

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
                -- Pre-existing bug fixed here: EXCLUDED.menu_order is the
                -- INSERT-list value, which is already COALESCE($6, 0) above
                -- — so it's never actually NULL by this point, and the old
                -- "COALESCE(EXCLUDED.menu_order, ...)" fallback could never
                -- fire. Every plain enable/disable (no menu_order in the
                -- request) was silently resetting menu_order to 0. Compare
                -- against the raw parameter $6 instead, which IS NULL when
                -- the caller didn't send menu_order.
                menu_order  = COALESCE($6, public.company_modules.menu_order),
                enabled_at  = CASE WHEN EXCLUDED.is_enabled = TRUE  AND public.company_modules.is_enabled = FALSE THEN CURRENT_TIMESTAMP ELSE public.company_modules.enabled_at END,
                disabled_at = CASE WHEN EXCLUDED.is_enabled = FALSE AND public.company_modules.is_enabled = TRUE  THEN CURRENT_TIMESTAMP ELSE public.company_modules.disabled_at END,
                notes       = COALESCE(EXCLUDED.notes, public.company_modules.notes)
            RETURNING *`;

        const result = await client.query(upsertQuery, [
            companyId, moduleId, enabled, visible, is_core, orderVal, notes ?? null
        ]);

        if (enabled) {
            await seedDefaultProfilePermissionsForModule(client, { companyId, moduleId });
            if (moduleCode === 'garage_operations' || moduleCode === 'inventory') {
                await seedVirtualProductsPermissions(client, companyId);
            }
        }

        await client.query('COMMIT');
        invalidateCompanyModuleCache(companyId);

        const actionLabel = enabled ? 'habilitado' : 'deshabilitado';
        createNotification({
            userId:    req.user.id,
            companyId: Number(companyId),
            type:      enabled ? 'success' : 'warning',
            category:  'modules',
            title:     `Módulo ${actionLabel}`,
            body:      `El módulo '${moduleCode}' fue ${actionLabel} en la empresa.`,
            actionUrl: `/admin/modules`
        });

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
 * PUT /api/companies/:id/modules/reorder
 * Reordena en una sola operación transaccional los módulos de una compañía
 * (evita N PUTs secuenciales por cada drag-and-drop).
 *
 * Body: { codes: string[] } — códigos de module_catalog en el orden deseado
 *       (el índice determina el nuevo menu_order).
 *
 * Reglas:
 *  - Solo super_admin (mismo gate que upsertCompanyModule).
 *  - menu_order se asigna en huecos de 10 (10, 20, 30, ...) — nunca 0, porque
 *    menuController.js trata cm.menu_order = 0 como "sin asignar" y cae al
 *    menu_order_default (COALESCE(NULLIF(cm.menu_order, 0), ...)).
 *  - Un módulo sin fila previa en company_modules se inserta con
 *    is_enabled = FALSE — arrastrar un módulo nunca lo habilita.
 *  - Un módulo con fila previa solo actualiza menu_order — is_enabled,
 *    is_visible, notes, enabled_at/disabled_at quedan intactos.
 *  - No dispara createNotification: reordenar no es un evento de negocio
 *    como habilitar/deshabilitar, y una notificación por cada drag sería
 *    ruido en la campana de notificaciones.
 */
exports.reorderCompanyModules = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isSuperAdmin(req)) {
            return res.status(403).json({ error: 'Solo super_admin puede reordenar módulos' });
        }

        const { id: companyId } = req.params;
        const { codes } = req.body;

        if (!Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({ error: 'Se requiere un arreglo "codes" con el nuevo orden' });
        }
        if (new Set(codes).size !== codes.length) {
            return res.status(400).json({ error: 'El arreglo "codes" contiene códigos duplicados' });
        }

        const menuOrders = codes.map((_, i) => (i + 1) * 10); // 10, 20, 30, ... never 0

        await client.query('BEGIN');

        const result = await client.query(
            `WITH input(code, menu_order) AS (
                SELECT * FROM UNNEST($2::text[], $3::int[])
             ),
             resolved AS (
                SELECT m.id AS module_id, m.code, m.is_core, i.menu_order
                FROM input i
                JOIN public.module_catalog m ON m.code = i.code AND m.status = 'activo'
             ),
             upserted AS (
                INSERT INTO public.company_modules
                    (company_id, module_id, is_enabled, is_visible, is_required, menu_order)
                SELECT $1, r.module_id, FALSE, TRUE, r.is_core, r.menu_order
                FROM resolved r
                ON CONFLICT (company_id, module_id) DO UPDATE SET
                    menu_order = EXCLUDED.menu_order
                RETURNING module_id, menu_order
             )
             SELECT r.code, u.menu_order
             FROM upserted u
             JOIN resolved r ON r.module_id = u.module_id`,
            [companyId, codes, menuOrders]
        );

        await client.query('COMMIT');
        invalidateCompanyModuleCache(companyId);

        res.json({ updated: result.rowCount, order: result.rows }); // order: [{ code, menu_order }, ...]
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reorder company modules error:', error);
        res.status(500).json({ error: 'Error al reordenar módulos de la compañía' });
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
