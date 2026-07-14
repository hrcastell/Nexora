const db = require('../config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['system', 'users', 'subscriptions', 'requests', 'billing', 'modules', 'dental', 'inventory'];

/**
 * Construye la cláusula WHERE y el array de parámetros base para filtrar
 * notificaciones del usuario autenticado en su compañía actual.
 */
function buildBaseFilter(req) {
    const userId    = req.user.id;
    const companyId = req.user.company_id || null;
    const conditions = ['n.user_id = $1', 'n.is_dismissed = FALSE'];
    const params     = [userId];
    let   paramIdx   = 2;

    if (companyId) {
        conditions.push(`n.company_id = $${paramIdx}`);
        params.push(companyId);
        paramIdx++;
    }

    return { conditions, params, paramIdx };
}

// ── GET /api/notifications ────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
    try {
        const page       = Math.max(1, parseInt(req.query.page)  || 1);
        const limit      = Math.min(100, parseInt(req.query.limit) || 20);
        const offset     = (page - 1) * limit;
        const unreadOnly = req.query.unread_only === 'true';
        const category   = req.query.category;

        const { conditions, params, paramIdx: pi } = buildBaseFilter(req);
        let paramIdx = pi;

        if (unreadOnly) {
            conditions.push('n.is_read = FALSE');
        }
        if (category && VALID_CATEGORIES.includes(category)) {
            conditions.push(`n.category = $${paramIdx}`);
            params.push(category);
            paramIdx++;
        }

        const where = conditions.join(' AND ');

        const [dataRes, countRes] = await Promise.all([
            db.query(
                `SELECT id, user_id, company_id, type, category, title, body,
                        action_url, is_read, is_dismissed, created_at
                 FROM public.notifications n
                 WHERE ${where}
                 ORDER BY n.created_at DESC
                 LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...params, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*)::int AS total
                 FROM public.notifications n
                 WHERE ${where}`,
                params
            )
        ]);

        res.json({
            notifications: dataRes.rows,
            total:  countRes.rows[0].total,
            page,
            limit,
        });
    } catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
};

// ── GET /api/notifications/unread-count ──────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
    try {
        const userId    = req.user.id;
        const companyId = req.user.company_id || null;

        let query;
        let params;

        if (companyId) {
            query  = `SELECT COUNT(*)::int AS count FROM public.notifications
                      WHERE user_id = $1 AND company_id = $2 AND is_read = FALSE AND is_dismissed = FALSE`;
            params = [userId, companyId];
        } else {
            query  = `SELECT COUNT(*)::int AS count FROM public.notifications
                      WHERE user_id = $1 AND is_read = FALSE AND is_dismissed = FALSE`;
            params = [userId];
        }

        const result = await db.query(query, params);
        res.json({ count: result.rows[0].count });
    } catch (err) {
        console.error('getUnreadCount error:', err);
        res.status(500).json({ error: 'Error al obtener conteo de notificaciones' });
    }
};

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId    = req.user.id;
        const companyId = req.user.company_id || null;

        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = TRUE
             WHERE id = $1 AND user_id = $2 AND ($3::int IS NULL OR company_id = $3)
             RETURNING id`,
            [id, userId, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json({ message: 'Notificación marcada como leída' });
    } catch (err) {
        console.error('markRead error:', err);
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
};

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
exports.markAllRead = async (req, res) => {
    try {
        const userId    = req.user.id;
        const companyId = req.user.company_id || null;

        let query;
        let params;

        if (companyId) {
            query  = `UPDATE public.notifications
                      SET is_read = TRUE
                      WHERE user_id = $1 AND company_id = $2 AND is_read = FALSE AND is_dismissed = FALSE`;
            params = [userId, companyId];
        } else {
            query  = `UPDATE public.notifications
                      SET is_read = TRUE
                      WHERE user_id = $1 AND is_read = FALSE AND is_dismissed = FALSE`;
            params = [userId];
        }

        await db.query(query, params);
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
        console.error('markAllRead error:', err);
        res.status(500).json({ error: 'Error al marcar todas las notificaciones' });
    }
};

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
exports.dismiss = async (req, res) => {
    try {
        const { id } = req.params;
        const userId    = req.user.id;
        const companyId = req.user.company_id || null;

        const result = await db.query(
            `UPDATE public.notifications
             SET is_dismissed = TRUE
             WHERE id = $1 AND user_id = $2 AND ($3::int IS NULL OR company_id = $3)
             RETURNING id`,
            [id, userId, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json({ message: 'Notificación eliminada' });
    } catch (err) {
        console.error('dismiss error:', err);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
};

// ── GET /api/notifications/preferences ───────────────────────────────────────
exports.getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            'SELECT user_id, categories, show_toast, updated_at FROM public.notification_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Devolver preferencias por defecto si no existen aún
            return res.json({
                user_id: userId,
                categories: {
                    system: true, users: true, subscriptions: true,
                    requests: true, billing: true, modules: true, dental: true, inventory: true
                },
                show_toast: true,
                updated_at: null
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('getPreferences error:', err);
        res.status(500).json({ error: 'Error al obtener preferencias' });
    }
};

// ── PUT /api/notifications/preferences ───────────────────────────────────────
exports.savePreferences = async (req, res) => {
    try {
        const userId     = req.user.id;
        const { categories, show_toast } = req.body;

        // Validar categorías si se envían
        if (categories !== undefined) {
            if (typeof categories !== 'object' || Array.isArray(categories)) {
                return res.status(400).json({ error: 'categories debe ser un objeto' });
            }
            for (const key of Object.keys(categories)) {
                if (!VALID_CATEGORIES.includes(key)) {
                    return res.status(400).json({ error: `Categoría inválida: ${key}` });
                }
                if (typeof categories[key] !== 'boolean') {
                    return res.status(400).json({ error: `El valor de la categoría '${key}' debe ser booleano` });
                }
            }
        }

        const result = await db.query(
            `INSERT INTO public.notification_preferences (user_id, categories, show_toast, updated_at)
             VALUES ($1, COALESCE($2, '{"system":true,"users":true,"subscriptions":true,"requests":true,"billing":true,"modules":true,"dental":true,"inventory":true}'), COALESCE($3, TRUE), NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                categories = COALESCE($2::jsonb, public.notification_preferences.categories),
                show_toast = COALESCE($3, public.notification_preferences.show_toast),
                updated_at = NOW()
             RETURNING *`,
            [
                userId,
                categories !== undefined ? JSON.stringify(categories) : null,
                show_toast !== undefined ? show_toast : null
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('savePreferences error:', err);
        res.status(500).json({ error: 'Error al guardar preferencias' });
    }
};
