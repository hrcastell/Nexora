/**
 * moduleState.js
 *
 * Shared helper to check whether a public.module_catalog module is enabled
 * ("active") for a company. Single source of truth for module-enablement
 * checks — consumed by:
 *   - BackEnd/middleware/requireModule.js  (route guard, AND/OR semantics)
 *   - BackEnd/controllers/menuController.js (GET /api/menu/me tree builder)
 *   - Phase 3 domain controllers (e.g. productsController field-authority,
 *     which needs a live "is Inventory active for this company?" check)
 *
 * Also expresses the OR-semantics "virtual" enablement rule for the
 * `products` module (design §1, ADR-1): `products` has NO row in
 * public.company_modules — it is derived, active whenever EITHER
 * `garage_operations` OR `inventory` is active for the company.
 *
 * Small in-memory cache (30s TTL) keyed by companyId, mirroring the cache
 * that previously lived inline in requireModule.js — kept here so every
 * consumer shares one cache instead of each maintaining its own.
 */

const db = require('../config/db');

const CACHE_TTL_MS = 30 * 1000;
const CACHE = new Map(); // companyId -> { set: Set<code>, expiresAt: number }

/**
 * getEnabledModuleCodes(companyId) -> Promise<Set<string>>
 * Returns the set of module_catalog codes currently enabled+active for the
 * company. Cached per companyId for CACHE_TTL_MS.
 *
 * companyId is coerced to Number for the cache key: callers pass it as a
 * JS number when it comes from the JWT (req.user.company_id, pg int4) but
 * as a string when it comes from an Express route param (req.params.id) —
 * without normalizing, those would be two different Map keys for the same
 * company and cache invalidation (see below) would silently miss.
 */
async function getEnabledModuleCodes(companyId) {
    const key = Number(companyId);
    const cached = CACHE.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.set;
    }

    const result = await db.query(
        `SELECT m.code FROM public.module_catalog m
         JOIN public.company_modules cm ON cm.module_id = m.id
         WHERE cm.company_id = $1 AND cm.is_enabled = TRUE AND m.status = 'activo'`,
        [key]
    );

    const set = new Set(result.rows.map(r => r.code));
    CACHE.set(key, { set, expiresAt: Date.now() + CACHE_TTL_MS });
    return set;
}

/**
 * invalidateCompanyModuleCache(companyId)
 * Call right after toggling public.company_modules for a company (e.g. from
 * companyModulesController.upsertCompanyModule) so subsequent reads are not
 * stale for up to CACHE_TTL_MS. See getEnabledModuleCodes for why companyId
 * is coerced to Number.
 */
function invalidateCompanyModuleCache(companyId) {
    CACHE.delete(Number(companyId));
}

/**
 * isModuleActive(companyId, moduleCode) -> Promise<boolean>
 * Live (cached) check: is the given real module code enabled for the
 * company? Do NOT call this with 'products' — it has no company_modules
 * row (see isProductsModuleActive below).
 */
async function isModuleActive(companyId, moduleCode) {
    if (!companyId || !moduleCode) return false;
    const codes = await getEnabledModuleCodes(companyId);
    return codes.has(moduleCode);
}

/**
 * isAnyModuleActive(companyId, moduleCodes) -> Promise<boolean>
 * Generic OR helper: true if ANY of the given module codes is active for
 * the company. Used by requireModule.js for routes declaring
 * semantics:'OR', and by isProductsModuleActive below.
 */
async function isAnyModuleActive(companyId, moduleCodes) {
    if (!companyId || !Array.isArray(moduleCodes) || moduleCodes.length === 0) return false;
    const codes = await getEnabledModuleCodes(companyId);
    return moduleCodes.some(code => codes.has(code));
}

/**
 * isProductsModuleActive(companyId) -> Promise<boolean>
 * Virtual OR-enablement rule for the `products` module (no persisted
 * public.company_modules row — see module header / ADR-1).
 */
async function isProductsModuleActive(companyId) {
    return isAnyModuleActive(companyId, ['garage_operations', 'inventory']);
}

module.exports = {
    isModuleActive,
    isAnyModuleActive,
    isProductsModuleActive,
    getEnabledModuleCodes,
    invalidateCompanyModuleCache,
};
