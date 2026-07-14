const db = require('../../config/db');

async function resolveEmployeeId(schema, userId) {
    const result = await db.query(
        `SELECT id FROM ${schema}.employees WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0]?.id || null;
}

module.exports = { resolveEmployeeId };
