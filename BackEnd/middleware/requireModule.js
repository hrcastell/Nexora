/**
 * requireModule.js
 *
 * Middleware que valida que la compañía actual tenga habilitado el
 * módulo correspondiente a la ruta (según routeModuleMap).
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

const db = require('../config/db');
const { resolveRouteModule } = require('../config/routeModuleMap');

const MODE = (process.env.MODULE_GUARD || 'log-only').toLowerCase();
const STRICT = MODE === 'strict';

// Caché simple por companyId → { code → bool }
// Se invalida automáticamente cada 30s
const CACHE = new Map();
const CACHE_TTL_MS = 30 * 1000;

async function getEnabledModulesForCompany(companyId) {
    const cached = CACHE.get(companyId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.map;
    }

    const res = await db.query(
        `SELECT m.code FROM public.module_catalog m
         JOIN public.company_modules cm ON cm.module_id = m.id
         WHERE cm.company_id = $1 AND cm.is_enabled = TRUE AND m.status = 'activo'`,
        [companyId]
    );

    const map = new Set(res.rows.map(r => r.code));
    CACHE.set(companyId, { map, expiresAt: Date.now() + CACHE_TTL_MS });
    return map;
}

/**
 * Middleware global: resuelve la ruta al par (module, transaction) y
 * valida contra los módulos habilitados de la compañía del usuario.
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

        const enabled = await getEnabledModulesForCompany(req.user.company_id);
        if (enabled.has(mapping.module)) return next();

        // Módulo no habilitado
        const logMsg = `[module-guard:${MODE}] user=${req.user.id} company=${req.user.company_id} tried ${req.method} ${path} → module=${mapping.module} NOT enabled`;

        if (STRICT) {
            console.warn(logMsg);
            return res.status(403).json({
                error: 'Módulo no habilitado para esta compañía',
                module: mapping.module,
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
