/**
 * requirePermission.js
 *
 * Middleware factory para validar permisos granulares a nivel de transacción.
 * Reemplaza el shortcut role='admin' con verificación real contra profile_transaction_permissions.
 *
 * Uso:
 *   const rp = require('../middleware/requirePermission');
 *   router.post('/profiles', auth, rp('profiles', 'can_create'), ctrl.createProfile);
 *
 * Lógica:
 *   1. super_admin → bypass total (next)
 *   2. read_only + flag mutante → 403
 *   3. Sin contexto de empresa → 403
 *   4. Consulta user_tenant_profiles + profile_transaction_permissions con bool_or()
 *   5. Si permitido → next(), sino → 403
 */

const db = require('../config/db');

// Flags válidos para prevenir SQL injection (el nombre se interpola en la query)
const VALID_FLAGS = new Set([
    'can_view',
    'can_create',
    'can_edit',
    'can_delete',
    'can_approve',
    'can_export',
    'can_admin'
]);

// Flags que modifican datos (no permitidos en modo read_only)
const MUTATING_FLAGS = new Set([
    'can_create',
    'can_edit',
    'can_delete',
    'can_approve',
    'can_admin'
]);

/**
 * Factory que retorna middleware Express de validación de permisos
 * @param {string} transactionCode - código de transacción (ej: 'profiles', 'users')
 * @param {string} flag - flag a validar (default: 'can_view')
 * @returns {Function} Express middleware (req, res, next)
 */
function requirePermission(transactionCode, flag = 'can_view') {
    // Validación en tiempo de definición de ruta
    if (!transactionCode || typeof transactionCode !== 'string') {
        throw new Error('requirePermission: transactionCode debe ser string no vacío');
    }
    if (!VALID_FLAGS.has(flag)) {
        throw new Error(`requirePermission: flag inválido '${flag}'. Debe ser uno de: ${[...VALID_FLAGS].join(', ')}`);
    }

    // Retorna el middleware
    return async function requirePermissionMiddleware(req, res, next) {
        try {
            // 1. super_admin → bypass total
            if (req.user && req.user.is_super_admin === true) {
                return next();
            }

            // 2. read_only + flag mutante → 403
            if (req.user && req.user.read_only === true && MUTATING_FLAGS.has(flag)) {
                return res.status(403).json({
                    error: 'Acceso de solo lectura',
                    detail: 'Tu empresa está suspendida. Solo puedes consultar información.'
                });
            }

            // 3. Sin contexto de empresa → 403
            const schema = req.user?.schema_name;
            const userId = req.user?.id;
            if (!schema || !userId) {
                return res.status(403).json({
                    error: 'Sin contexto de empresa',
                    detail: 'Debes tener una empresa seleccionada para realizar esta acción.'
                });
            }

            // 4. Consultar permisos del usuario: bool_or() de todos sus perfiles
            const result = await db.query(
                `SELECT bool_or(ptp.${flag}) AS allowed
                 FROM "${schema}".user_tenant_profiles utp
                 JOIN "${schema}".profile_transaction_permissions ptp
                   ON ptp.profile_id = utp.profile_id
                 WHERE utp.user_id = $1
                   AND ptp.transaction_code = $2`,
                [userId, transactionCode]
            );

            // 5. Si algún perfil otorga el permiso → next(), sino → 403
            if (result.rows[0]?.allowed === true) {
                return next();
            }

            // Usuario no tiene el permiso requerido
            return res.status(403).json({
                error: 'Permiso insuficiente',
                detail: `No tienes permiso para realizar esta acción (${flag}) en ${transactionCode}.`,
                transaction: transactionCode,
                permission: flag
            });

        } catch (error) {
            console.error('[requirePermission] error:', error.message);
            // Fail-closed: ante error, negar acceso
            return res.status(500).json({
                error: 'Error al validar permisos',
                detail: 'Ocurrió un error al verificar tus permisos. Intenta nuevamente.'
            });
        }
    };
}

module.exports = requirePermission;
