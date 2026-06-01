const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /financial/periods
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.financial_periods
             WHERE user_id = $1
             ORDER BY year DESC, month DESC`,
            [req.user.id]
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('financialPeriodsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar períodos' });
    }
};

/**
 * GET /financial/periods/current
 */
exports.getCurrent = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);

        // Return the most recent open period; if none, the most recent period overall
        const openResult = await db.query(
            `SELECT * FROM ${schema}.financial_periods
             WHERE user_id = $1 AND status = 'open'
             ORDER BY year DESC, month DESC
             LIMIT 1`,
            [req.user.id]
        );
        if (openResult.rows[0]) {
            return res.json({ data: openResult.rows[0] });
        }

        const latestResult = await db.query(
            `SELECT * FROM ${schema}.financial_periods
             WHERE user_id = $1
             ORDER BY year DESC, month DESC
             LIMIT 1`,
            [req.user.id]
        );
        res.json({ data: latestResult.rows[0] || null });
    } catch (err) {
        console.error('financialPeriodsController.getCurrent error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener período actual' });
    }
};

/**
 * GET /financial/periods/:periodId
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.financial_periods
             WHERE id = $1 AND user_id = $2`,
            [req.params.periodId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('financialPeriodsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener período' });
    }
};

/**
 * POST /financial/periods
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { year, month, initial_balance = 0 } = req.body;

        if (!year || !month) return res.status(400).json({ error: 'year y month son requeridos' });

        const m = parseInt(month);
        if (m < 1 || m > 12) {
            return res.status(400).json({ code: 'INVALID_MONTH', error: 'El mes debe estar entre 1 y 12' });
        }

        // Check for existing period
        const existing = await db.query(
            `SELECT id FROM ${schema}.financial_periods
             WHERE user_id = $1 AND year = $2 AND month = $3`,
            [req.user.id, parseInt(year), m]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ code: 'FINANCIAL_PERIOD_ALREADY_EXISTS', error: 'Ya existe un período para ese año y mes' });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.financial_periods (user_id, year, month, initial_balance)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, parseInt(year), m, parseInt(initial_balance) || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('financialPeriodsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear período' });
    }
};

/**
 * POST /financial/periods/:periodId/close
 */
exports.close = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);

        const period = await db.query(
            `SELECT * FROM ${schema}.financial_periods
             WHERE id = $1 AND user_id = $2`,
            [req.params.periodId, req.user.id]
        );
        if (period.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }
        if (period.rows[0].status !== 'open') {
            return res.status(422).json({ code: 'FINANCIAL_PERIOD_CLOSED', error: 'El período no está abierto' });
        }

        const result = await db.query(
            `UPDATE ${schema}.financial_periods
             SET status = 'closed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 RETURNING *`,
            [req.params.periodId, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('financialPeriodsController.close error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cerrar período' });
    }
};
