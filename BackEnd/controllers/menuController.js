const db = require('../config/db');

/**
 * GET /api/menu/me
 *
 * Devuelve el árbol de módulos+transacciones autorizados para
 * la compañía actual y el usuario actual.
 *
 * Contrato:
 * {
 *   company_id: number,
 *   modules: [{
 *     id, code, name, icon, group_name, is_core, is_required,
 *     menu_order, is_visible,
 *     transactions: [{
 *       id, code, name, route, icon, tab_order, menu_visible,
 *       can_view, can_create, can_edit, can_delete,
 *       can_approve, can_export, can_admin
 *     }]
 *   }]
 * }
 *
 * Orden de autorización:
 *   1. compañía actual (JWT)
 *   2. módulo habilitado (company_modules.is_enabled)
 *   3. transacción activa en catálogo
 *   4. perfil del usuario (profile_transaction_permissions.can_view) — super_admin omite este filtro
 *   5. flags granulares adjuntados a cada transacción para uso de canDo() en frontend
 */
exports.getMyMenu = async (req, res) => {
    try {
        const companyId    = req.user.company_id;
        const isSuperAdmin = req.user.is_super_admin === true;
        const schema       = req.user.schema_name;
        const userId       = req.user.id;

        if (!companyId) {
            return res.status(400).json({ error: 'Contexto de empresa requerido' });
        }

        // Módulos habilitados para la compañía
        const modulesRes = await db.query(
            `SELECT
                m.id, m.code, m.name, m.description, m.icon, m.group_name,
                m.is_core, m.is_global, m.is_system,
                cm.is_enabled, cm.is_visible, cm.is_required,
                COALESCE(NULLIF(cm.menu_order, 0), m.menu_order_default) AS menu_order,
                m.status
             FROM public.module_catalog m
             JOIN public.company_modules cm ON cm.module_id = m.id
             WHERE cm.company_id = $1
               AND cm.is_enabled = TRUE
               AND m.status = 'activo'
             ORDER BY menu_order ASC, m.name ASC`,
            [companyId]
        );

        const modules = modulesRes.rows;
        if (modules.length === 0) {
            return res.json({ company_id: companyId, modules: [] });
        }

        const moduleIds = modules.map(m => m.id);

        // Transacciones de esos módulos
        const txRes = await db.query(
            `SELECT id, module_id, code, name, description, route, icon, tab_order, menu_visible, status
             FROM public.module_transactions
             WHERE module_id = ANY($1::int[])
               AND status = 'activo'
             ORDER BY tab_order ASC, name ASC`,
            [moduleIds]
        );

        let allTx = txRes.rows;

        // Mapa de flags granulares por transaction_code (vacío para super_admin)
        // Para super_admin todos los flags son TRUE implícitamente — se añaden en el mapeo final.
        const permsMap = new Map();

        if (!isSuperAdmin && schema) {
            try {
                // Perfiles asignados al usuario en este tenant
                const profilesRes = await db.query(
                    `SELECT profile_id FROM "${schema}".user_tenant_profiles WHERE user_id = $1`,
                    [userId]
                );
                const profileIds = profilesRes.rows.map(r => r.profile_id);

                if (profileIds.length > 0) {
                    // Flags consolidados: OR lógico entre todos los perfiles del usuario
                    // (si cualquier perfil permite la acción, el usuario puede hacerla)
                    const flagsRes = await db.query(
                        `SELECT
                            transaction_code,
                            bool_or(can_view)    AS can_view,
                            bool_or(can_create)  AS can_create,
                            bool_or(can_edit)    AS can_edit,
                            bool_or(can_delete)  AS can_delete,
                            bool_or(can_approve) AS can_approve,
                            bool_or(can_export)  AS can_export,
                            bool_or(can_admin)   AS can_admin
                         FROM "${schema}".profile_transaction_permissions
                         WHERE profile_id = ANY($1::int[])
                         GROUP BY transaction_code`,
                        [profileIds]
                    );

                    for (const row of flagsRes.rows) {
                        permsMap.set(row.transaction_code, row);
                    }

                    // Filtrar transacciones visibles: solo las que can_view = TRUE
                    allTx = allTx.filter(tx => permsMap.get(tx.code)?.can_view === true);
                } else {
                    // Sin perfil asignado: no se muestra ninguna transacción
                    allTx = [];
                }
            } catch (error) {
                // Fail closed: si no podemos leer permisos, nunca exponemos
                // transacciones a usuarios no-super_admin.
                console.error('Get my menu permissions error:', {
                    userId,
                    companyId,
                    schema,
                    message: error.message,
                    code: error.code,
                    table: error.table,
                    constraint: error.constraint
                });
                allTx = [];
            }
        }

        // Agrupar transacciones por módulo, adjuntando flags granulares
        const txByModule = {};
        for (const tx of allTx) {
            if (!txByModule[tx.module_id]) txByModule[tx.module_id] = [];

            const flags = isSuperAdmin
                ? { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true, can_admin: true }
                : (permsMap.get(tx.code) ?? { can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false, can_export: false, can_admin: false });

            txByModule[tx.module_id].push({ ...tx, ...flags });
        }

        // Excluir módulos sin ninguna transacción visible (salvo super_admin)
        const tree = modules
            .map(m => ({ ...m, transactions: txByModule[m.id] || [] }))
            .filter(m => isSuperAdmin || m.transactions.length > 0);

        res.json({ company_id: companyId, modules: tree });
    } catch (error) {
        console.error('Get my menu error:', error);
        res.status(500).json({ error: 'Error al obtener menú', detail: process.env.NODE_ENV !== 'production' ? error.message : undefined });
    }
};
