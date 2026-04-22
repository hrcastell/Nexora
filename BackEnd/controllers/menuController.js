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
 *     transactions: [{ id, code, name, route, icon, tab_order, menu_visible }]
 *   }]
 * }
 *
 * Orden de autorización:
 *   1. compañía actual (JWT)
 *   2. módulo habilitado (company_modules.is_enabled)
 *   3. transacción habilitada (por ahora todas las del catálogo activas)
 *   4. TODO: permisos de perfil (fase futura)
 */
exports.getMyMenu = async (req, res) => {
    try {
        const companyId = req.user.company_id;
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

        // Agrupar transacciones por módulo
        const txByModule = {};
        for (const tx of txRes.rows) {
            if (!txByModule[tx.module_id]) txByModule[tx.module_id] = [];
            txByModule[tx.module_id].push(tx);
        }

        const tree = modules.map(m => ({
            ...m,
            transactions: txByModule[m.id] || []
        }));

        res.json({ company_id: companyId, modules: tree });
    } catch (error) {
        console.error('Get my menu error:', error);
        res.status(500).json({ error: 'Error al obtener menú', detail: process.env.NODE_ENV !== 'production' ? error.message : undefined });
    }
};
