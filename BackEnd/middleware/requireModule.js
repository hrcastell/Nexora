/**
 * requireModule.js
 *
 * Middleware que valida que la compañía actual tenga habilitado el
 * módulo correspondiente a la ruta (según routeModuleMap).
 *
 * Soporta dos semánticas por ruta (routeModuleMap `resolveRouteModule`):
 *   - AND (default, comportamiento histórico): TODOS los módulos listados
 *     deben estar habilitados.
 *   - OR (nuevo, products-catalog-transversal): BASTA con que UNO de los
 *     módulos listados esté habilitado (p.ej. `/products*` con
 *     `modules:['garage_operations','inventory']`).
 *
 * MODO LOG-ONLY (default en fase 3):
 *   - Si la compañía NO tiene el módulo habilitado, SOLO se registra en log.
 *   - Se deja pasar la request al siguiente middleware.
 *
 * MODO BLOQUEANTE (fase 7):
 *   - Si la compañía NO tiene el módulo habilitado → 403.
 *
 * Activación del modo bloqueante: env var MODULE_GUARD=strict
 * (cualquier otro valor = modo log-only).
 */

const { resolveRouteModule } = require('../config/routeModuleMap');
const { getEnabledModuleCodes } = require('../utils/moduleState');

const MODE = (process.env.MODULE_GUARD || 'log-only').toLowerCase();
const STRICT = MODE === 'strict';

/**
 * Middleware global: resuelve la ruta a su(s) módulo(s)/semántica/transacción
 * y valida contra los módulos habilitados de la compañía del usuario.
 *
 * Se monta DESPUÉS del routing para que la ruta ya esté resuelta.
 */
async function requireModuleMiddleware(req, res, next) {
    try {
        // Solo aplica a rutas autenticadas con contexto de compañía
        if (!req.user || !req.user.id) return next();
        if (!req.user.company_id)       return next();
        if (req.user.is_super_admin)    return next(); // super_admin todo permitido

        // req.path aquí es relativo al mount point (/api). No incluye /api.
        const path = req.path || '/';

        const mapping = resolveRouteModule(req.method, path);
        if (!mapping) return next(); // default-permit para rutas no mapeadas

        const codes = mapping.modules ?? [];
        if (codes.length === 0) return next(); // mapeo sin módulos = default-permit

        const semantics = mapping.semantics === 'OR' ? 'OR' : 'AND';

        const enabled = await getEnabledModuleCodes(req.user.company_id);
        const evaluated = codes.map(code => enabled.has(code));
        const pass = semantics === 'OR' ? evaluated.some(Boolean) : evaluated.every(Boolean);

        if (pass) return next();

        // Módulo(s) no habilitado(s)
        const logMsg = `[module-guard:${MODE}] user=${req.user.id} company=${req.user.company_id} tried ${req.method} ${path} → modules=[${codes.join(',')}] (${semantics}) NOT enabled`;

        if (STRICT) {
            console.warn(logMsg);
            return res.status(403).json({
                error: 'Módulo no habilitado para esta compañía',
                modules: codes,
                semantics,
                transaction: mapping.transaction
            });
        }

        // log-only: dejar pasar
        console.log(logMsg);
        return next();
    } catch (error) {
        console.error('[module-guard] error:', error.message);
        // Nunca romper por error del guard; dejar pasar
        return next();
    }
}

module.exports = requireModuleMiddleware;
module.exports.STRICT = STRICT;
