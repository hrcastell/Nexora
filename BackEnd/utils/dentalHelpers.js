// BackEnd/utils/dentalHelpers.js
// Shared helpers for dental controllers.

const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-z0-9_]+$/i;

/**
 * Verifies the consultation exists and belongs to the tenant.
 * Returns the consultation row or throws a structured 404 error.
 *
 * @param {string} schema       - Tenant schema name from JWT.
 * @param {number} companyId    - Tenant company ID from JWT.
 * @param {number|string} consultationId
 * @returns {Promise<Object>}   - The consultation row.
 */
async function requireConsultation(schema, companyId, consultationId) {
    if (!schema || !SCHEMA_NAME_RE.test(schema)) {
        const err = new Error('Invalid schema name');
        err.statusCode = 400;
        err.code = 'INVALID_SCHEMA';
        throw err;
    }

    const result = await db.query(
        `SELECT * FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
        [consultationId, companyId]
    );
    if (result.rows.length === 0) {
        const err = new Error('Consulta no encontrada');
        err.statusCode = 404;
        err.code = 'DENTAL_CONSULTATION_NOT_FOUND';
        throw err;
    }
    return result.rows[0];
}

module.exports = { requireConsultation };
