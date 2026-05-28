const db = require('../config/db');

/**
 * tenantResolver.js
 * 
 * Centraliza la resolución del schema del tenant para cualquier operación
 * de un Core de negocio. Nunca concatenar schemas sin pasar por este helper.
 *
 * Uso:
 *   const { schema, companyId } = await resolveSchema(req);
 *   const result = await db.query(`SELECT * FROM ${schema}.customers`, []);
 */

/**
 * Resuelve el schema del tenant para la request actual.
 *
 * Lógica:
 *  - Si el usuario es super_admin Y hay un companyId en req.params → opera sobre esa empresa
 *  - Si el usuario es super_admin SIN companyId en params → opera sobre su propia empresa (hernancius)
 *  - Si el usuario NO es super_admin → opera sobre su empresa del token
 *
 * @param {object} req  - Express request con req.user (del authMiddleware)
 * @param {object} opts - Opciones adicionales
 * @param {boolean} opts.allowSuspended - Si TRUE, permite operar en empresa suspendida (default false)
 * @returns {Promise<{ schema: string, companyId: number }>}
 * @throws {Error} con .statusCode si hay problema de acceso o empresa inválida
 */
async function resolveSchema(req, opts = {}) {
    const { allowSuspended = false } = opts;

    const isSuperAdmin = req.user?.is_super_admin === true;

    // Determinar el companyId a resolver
    let targetCompanyId;

    if (isSuperAdmin && req.params.companyId) {
        // Ruta cross-company: /api/companies/:companyId/garage/*
        targetCompanyId = parseInt(req.params.companyId, 10);
        if (isNaN(targetCompanyId)) {
            const err = new Error('companyId inválido');
            err.statusCode = 400;
            throw err;
        }
    } else if (isSuperAdmin && req.params.id && req.baseUrl && req.baseUrl.includes('/companies/')) {
        // Alternativa: /api/companies/:id/garage/*
        targetCompanyId = parseInt(req.params.id, 10);
        if (isNaN(targetCompanyId)) {
            const err = new Error('companyId inválido');
            err.statusCode = 400;
            throw err;
        }
    } else {
        // Usuario normal o super_admin sin param → usa su empresa del token
        if (!req.user?.company_id) {
            const err = new Error('No hay empresa asociada al usuario');
            err.statusCode = 403;
            throw err;
        }
        targetCompanyId = parseInt(req.user.company_id, 10);
    }

    // Obtener la empresa y validar su estado
    const companyRes = await db.query(
        `SELECT id, schema_name, commercial_status, is_master
         FROM public.companies
         WHERE id = $1`,
        [targetCompanyId]
    );

    if (companyRes.rows.length === 0) {
        const err = new Error('Empresa no encontrada');
        err.statusCode = 404;
        throw err;
    }

    const company = companyRes.rows[0];

    // Validar estado comercial
    if (company.commercial_status === 'bloqueada') {
        const err = new Error('El acceso a esta empresa está bloqueado');
        err.statusCode = 403;
        throw err;
    }

    if (!allowSuspended && company.commercial_status === 'suspendida') {
        const err = new Error('La empresa está suspendida. No se permiten operaciones de escritura.');
        err.statusCode = 403;
        throw err;
    }

    // Validar que el schema no esté vacío
    if (!company.schema_name || typeof company.schema_name !== 'string') {
        const err = new Error('Schema de empresa inválido');
        err.statusCode = 500;
        throw err;
    }

    // Sanitizar el schema_name para prevenir SQL injection
    // Solo caracteres alfanuméricos y guión bajo
    const safe = /^[a-z0-9_]+$/i;
    if (!safe.test(company.schema_name)) {
        const err = new Error('Nombre de schema contiene caracteres inválidos');
        err.statusCode = 500;
        throw err;
    }

    return {
        schema: company.schema_name,
        companyId: company.id,
        isMaster: company.is_master === true,
        commercialStatus: company.commercial_status
    };
}

/**
 * Verifica si el usuario actual tiene acceso a la empresa indicada.
 * No resuelve el schema, solo valida la autorización.
 *
 * @param {object} req
 * @param {number} targetCompanyId
 * @returns {boolean}
 */
function canAccessCompany(req, targetCompanyId) {
    if (req.user?.is_super_admin) return true;
    return String(req.user?.company_id) === String(targetCompanyId);
}

module.exports = { resolveSchema, canAccessCompany };
