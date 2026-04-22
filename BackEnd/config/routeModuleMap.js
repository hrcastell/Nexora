/**
 * routeModuleMap.js
 *
 * Mapeo central de rutas del backend a su módulo/transacción correspondiente
 * según el catálogo global (public.module_catalog + public.module_transactions).
 *
 * Usado por el middleware `requireModule` para validar (en modo log-only
 * durante la fase 3) que el usuario tenga acceso al módulo de la compañía
 * antes de ejecutar el controller.
 *
 * Formato: { 'METHOD /path': { module: 'code', transaction: 'code' } }
 * - module:      código en public.module_catalog
 * - transaction: código en public.module_transactions (opcional)
 *
 * Las rutas usan el path base después de /api/... y aceptan comodines
 * básicos mediante path-to-regex style: `:id`, `:userId`, etc.
 *
 * Si una ruta NO está en el mapa, el middleware no valida (default-permit).
 */

const ROUTE_MODULE_MAP = {
    // ── Catálogo y menú (accesibles para todo user autenticado) ──
    // No se mapean → default-permit

    // ── Configuration: Companies ──
    'GET    /companies':                   { module: 'configuration', transaction: 'companies' },
    'POST   /companies':                   { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'PUT    /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'DELETE /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id/config':        { module: 'configuration', transaction: 'companies' },
    'PUT    /companies/:id/config':        { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id/roles':         { module: 'configuration', transaction: 'companies' },

    // ── Configuration: Users ──
    'GET    /companies/:id/users':                           { module: 'configuration', transaction: 'users' },
    'POST   /companies/:id/users':                           { module: 'configuration', transaction: 'users' },
    'PUT    /companies/:id/users/:userId':                   { module: 'configuration', transaction: 'users' },
    'PATCH  /companies/:id/users/:userId/status':            { module: 'configuration', transaction: 'users' },
    'POST   /companies/:id/users/:userId/profiles':          { module: 'configuration', transaction: 'users' },
    'DELETE /companies/:id/users/:userId/profiles/:profileId': { module: 'configuration', transaction: 'users' },
    'DELETE /companies/:id/users/:userId':                   { module: 'configuration', transaction: 'users' },
    'GET    /users':                                         { module: 'configuration', transaction: 'users' },
    'POST   /users/avatar':                                  { module: 'configuration', transaction: 'users' },

    // ── Configuration: Profiles (company-scoped, super_admin) ──
    'GET    /companies/:id/profiles':                              { module: 'configuration', transaction: 'profiles' },
    'POST   /companies/:id/profiles':                             { module: 'configuration', transaction: 'profiles' },
    'PUT    /companies/:id/profiles/:profileId':                  { module: 'configuration', transaction: 'profiles' },
    'DELETE /companies/:id/profiles/:profileId':                  { module: 'configuration', transaction: 'profiles' },
    'GET    /companies/:id/profiles/:profileId/permissions-full': { module: 'configuration', transaction: 'profiles' },
    'PUT    /companies/:id/profiles/:profileId/permissions-full': { module: 'configuration', transaction: 'profiles' },

    // ── Configuration: Profiles ──
    'GET    /profiles':                    { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id':                { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id/permissions':         { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id/permissions':         { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id/permissions-full':    { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id/permissions-full':    { module: 'configuration', transaction: 'profiles' },
    'POST   /profiles':                    { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id':                { module: 'configuration', transaction: 'profiles' },
    'DELETE /profiles/:id':                { module: 'configuration', transaction: 'profiles' },

    // ── Configuration: Modules (catálogo y tenant legacy) ──
    'GET    /modules':                     { module: 'configuration', transaction: 'modules' },
    'GET    /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'POST   /modules':                     { module: 'configuration', transaction: 'modules' },
    'PUT    /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'PATCH  /modules/:id/status':          { module: 'configuration', transaction: 'modules' },
    'DELETE /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/modules':             { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/modules/:id':         { module: 'configuration', transaction: 'modules' },
    'PUT    /catalog/modules/:id':         { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/transactions':        { module: 'configuration', transaction: 'modules' },
    'PUT    /catalog/transactions/:id':    { module: 'configuration', transaction: 'modules' },
    'GET    /companies/:id/modules':       { module: 'configuration', transaction: 'modules' },
    'PUT    /companies/:id/modules/:moduleCode': { module: 'configuration', transaction: 'modules' },

    // ── Configuration: Reports ──
    'GET    /stats':                       { module: 'configuration', transaction: 'reports' },

    // ── Configuration: Commercial ──
    'PATCH  /companies/:id/commercial-status':               { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/agreements':                      { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/agreements':                      { module: 'configuration', transaction: 'commercial' },
    'PUT    /companies/:id/agreements/:aId':                 { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/agreements/:aId/generate-invoice': { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/invoices':                        { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/invoices':                        { module: 'configuration', transaction: 'commercial' },
    'PUT    /companies/:id/invoices/:iId':                   { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/invoices/:iId/payment':           { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/payments':                        { module: 'configuration', transaction: 'commercial' },

    // ── Configuration: Subscriptions ──
    'GET    /subscriptions/company/:companyId':              { module: 'configuration', transaction: 'subscriptions' },
    'GET    /subscriptions/company/:companyId/payments':     { module: 'configuration', transaction: 'subscriptions' },
    'POST   /subscriptions':                                 { module: 'configuration', transaction: 'subscriptions' },
    'PUT    /subscriptions/:id':                             { module: 'configuration', transaction: 'subscriptions' },
    'POST   /subscriptions/:id/payment':                     { module: 'configuration', transaction: 'subscriptions' },

    // ── Configuration: Requests (Solicitudes) ──
    'GET    /solicitudes':                 { module: 'configuration', transaction: 'requests' },
    'PUT    /solicitudes/:id':             { module: 'configuration', transaction: 'requests' },
    // POST /solicitudes/public is public — no mapeo
};

/**
 * Convierte un path con parámetros (ej: /companies/:id) en una regex.
 */
function pathToRegex(path) {
    const escaped = path
        .replace(/[-/\\^$*+?.()|[\]{}]/g, (c) => c === '/' ? '/' : `\\${c}`)
        .replace(/\\:(\w+)/g, '[^/]+');
    return new RegExp(`^${escaped}$`);
}

// Pre-compile regex para todas las rutas del mapa
const COMPILED = Object.entries(ROUTE_MODULE_MAP).map(([key, value]) => {
    const [method, path] = key.trim().split(/\s+/);
    return {
        method: method.toUpperCase(),
        regex:  pathToRegex(path),
        path,
        ...value
    };
});

/**
 * Resuelve módulo/transacción para una ruta + método.
 * Retorna null si la ruta no está mapeada (default-permit).
 */
function resolveRouteModule(method, path) {
    const m = method.toUpperCase();
    for (const entry of COMPILED) {
        if (entry.method === m && entry.regex.test(path)) {
            return { module: entry.module, transaction: entry.transaction };
        }
    }
    return null;
}

module.exports = {
    ROUTE_MODULE_MAP,
    resolveRouteModule
};
