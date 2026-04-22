const db = require('../config/db');

const isSuperAdmin = (req) => req.user?.is_super_admin === true;

// GET /api/catalog/modules — lista global de módulos del sistema
exports.getCatalogModules = async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM public.module_catalog';
        const params = [];
        if (status) {
            params.push(status);
            query += ` WHERE status = $${params.length}`;
        }
        query += ' ORDER BY menu_order_default ASC, name ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get catalog modules error:', error);
        res.status(500).json({ error: 'Error al obtener catálogo de módulos' });
    }
};

// GET /api/catalog/modules/:id — detalle de un módulo global + sus transacciones
exports.getCatalogModuleById = async (req, res) => {
    try {
        const { id } = req.params;
        const moduleRes = await db.query('SELECT * FROM public.module_catalog WHERE id = $1', [id]);
        if (moduleRes.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });

        const txRes = await db.query(
            `SELECT * FROM public.module_transactions WHERE module_id = $1 ORDER BY tab_order ASC, name ASC`,
            [id]
        );

        res.json({ ...moduleRes.rows[0], transactions: txRes.rows });
    } catch (error) {
        console.error('Get catalog module error:', error);
        res.status(500).json({ error: 'Error al obtener módulo' });
    }
};

// GET /api/catalog/transactions?module_id=X — transacciones de un módulo (o todas)
exports.getCatalogTransactions = async (req, res) => {
    try {
        const { module_id, module_code, status } = req.query;
        const conditions = [];
        const params = [];

        let query = `SELECT t.*, m.code AS module_code, m.name AS module_name
                     FROM public.module_transactions t
                     JOIN public.module_catalog m ON m.id = t.module_id`;

        if (module_id) {
            params.push(module_id);
            conditions.push(`t.module_id = $${params.length}`);
        }
        if (module_code) {
            params.push(module_code);
            conditions.push(`m.code = $${params.length}`);
        }
        if (status) {
            params.push(status);
            conditions.push(`t.status = $${params.length}`);
        }

        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY m.menu_order_default ASC, t.tab_order ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get catalog transactions error:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};

// PUT /api/catalog/modules/:id — super_admin edita metadata del módulo global
exports.updateCatalogModule = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo super_admin puede editar el catálogo' });

        const { id } = req.params;
        const { name, description, icon, group_name, is_core, is_global, menu_visible_default, menu_order_default, status } = req.body;

        const existing = await db.query('SELECT * FROM public.module_catalog WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });

        const result = await db.query(
            `UPDATE public.module_catalog SET
                name                 = COALESCE($1, name),
                description          = COALESCE($2, description),
                icon                 = COALESCE($3, icon),
                group_name           = COALESCE($4, group_name),
                is_core              = COALESCE($5, is_core),
                is_global            = COALESCE($6, is_global),
                menu_visible_default = COALESCE($7, menu_visible_default),
                menu_order_default   = COALESCE($8, menu_order_default),
                status               = COALESCE($9, status),
                updated_at           = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING *`,
            [name, description, icon, group_name, is_core, is_global, menu_visible_default, menu_order_default, status, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update catalog module error:', error);
        res.status(500).json({ error: 'Error al actualizar módulo' });
    }
};

// PUT /api/catalog/transactions/:id — super_admin edita transacción
exports.updateCatalogTransaction = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo super_admin puede editar el catálogo' });

        const { id } = req.params;
        const { name, description, route, icon, tab_order, menu_visible, status } = req.body;

        const result = await db.query(
            `UPDATE public.module_transactions SET
                name         = COALESCE($1, name),
                description  = COALESCE($2, description),
                route        = COALESCE($3, route),
                icon         = COALESCE($4, icon),
                tab_order    = COALESCE($5, tab_order),
                menu_visible = COALESCE($6, menu_visible),
                status       = COALESCE($7, status),
                updated_at   = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [name, description, route, icon, tab_order, menu_visible, status, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Transacción no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update catalog transaction error:', error);
        res.status(500).json({ error: 'Error al actualizar transacción' });
    }
};
