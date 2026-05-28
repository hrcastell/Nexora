const db = require('../config/db');

/**
 * Crea una notificación en public.notifications respetando las preferencias del destinatario.
 *
 * @param {object} opts
 * @param {number}  opts.userId     - ID del usuario destinatario
 * @param {number}  opts.companyId  - ID de la empresa (puede ser null para super_admin)
 * @param {string}  opts.type       - 'info' | 'success' | 'warning' | 'error'
 * @param {string}  opts.category   - 'system' | 'users' | 'subscriptions' | 'requests' | 'billing' | 'modules'
 * @param {string}  opts.title      - Título de la notificación
 * @param {string}  [opts.body]     - Cuerpo / detalle adicional
 * @param {string}  [opts.actionUrl] - Ruta interna navegable (ej: /admin/users)
 * @returns {Promise<object|null>}  La fila insertada, o null si las preferencias lo bloquean
 */
async function createNotification({ userId, companyId, type, category, title, body, actionUrl }) {
    try {
        // Verificar preferencias del usuario
        const prefRes = await db.query(
            'SELECT categories, show_toast FROM public.notification_preferences WHERE user_id = $1',
            [userId]
        );

        if (prefRes.rows.length > 0) {
            const categories = prefRes.rows[0].categories || {};
            // Si la categoría está explícitamente desactivada, no insertar
            if (categories[category] === false) {
                return null;
            }
        }

        const result = await db.query(
            `INSERT INTO public.notifications
             (user_id, company_id, type, category, title, body, action_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, companyId || null, type, category, title, body || null, actionUrl || null]
        );

        return result.rows[0];
    } catch (err) {
        // No propagamos el error: las notificaciones son secundarias y no deben romper flujos principales
        console.error('[createNotification] Error al crear notificación:', err.message);
        return null;
    }
}

module.exports = { createNotification };
