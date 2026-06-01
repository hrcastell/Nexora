const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /financial/periods/:periodId/transactions
 * Query: ?type=, ?category_id=, ?date_from=, ?date_to=, ?page=1, ?limit=50
 */
exports.listByPeriod = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);

        // Validate period ownership
        const period = await db.query(
            `SELECT id FROM ${schema}.financial_periods
             WHERE id = $1 AND user_id = $2`,
            [req.params.periodId, req.user.id]
        );
        if (period.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }

        const { type, category_id, date_from, date_to, page = 1, limit = 50 } = req.query;
        const params = [req.user.id, req.params.periodId];
        const conditions = ['ft.user_id = $1', 'ft.period_id = $2'];

        if (type) {
            params.push(type);
            conditions.push(`ft.type = $${params.length}`);
        }
        if (category_id) {
            params.push(parseInt(category_id));
            conditions.push(`ft.category_id = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`ft.date >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`ft.date <= $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT ft.*, fc.name AS category_name, fc.type AS category_type
             FROM ${schema}.financial_transactions ft
             JOIN ${schema}.financial_categories fc ON fc.id = ft.category_id
             ${where}
             ORDER BY ft.date DESC, ft.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.financial_transactions ft ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('transactionsController.listByPeriod error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar transacciones' });
    }
};

/**
 * GET /financial/transactions/:transactionId
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT ft.*, fc.name AS category_name, fc.type AS category_type
             FROM ${schema}.financial_transactions ft
             JOIN ${schema}.financial_categories fc ON fc.id = ft.category_id
             WHERE ft.id = $1 AND ft.user_id = $2`,
            [req.params.transactionId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'TRANSACTION_NOT_FOUND', error: 'Transacción no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('transactionsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener transacción' });
    }
};

/**
 * POST /financial/periods/:periodId/transactions
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { category_id, type, amount, date, description = null, payment_method = null, source = null } = req.body;

        if (!category_id) return res.status(400).json({ error: 'category_id es requerido' });
        if (!type) return res.status(400).json({ error: 'type es requerido' });
        if (!amount || parseInt(amount) <= 0) {
            return res.status(400).json({ code: 'INVALID_AMOUNT', error: 'amount debe ser mayor a 0' });
        }
        if (!date) return res.status(400).json({ error: 'date es requerido' });

        const validTypes = ['income', 'expense', 'saving', 'debt', 'transfer'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `type debe ser uno de: ${validTypes.join(', ')}` });
        }

        // Validate period is open and owned by user
        const period = await db.query(
            `SELECT id, status FROM ${schema}.financial_periods
             WHERE id = $1 AND user_id = $2`,
            [req.params.periodId, req.user.id]
        );
        if (period.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }
        if (period.rows[0].status !== 'open') {
            return res.status(422).json({ code: 'FINANCIAL_PERIOD_CLOSED', error: 'El período está cerrado' });
        }

        // Validate category is active and owned by user
        const category = await db.query(
            `SELECT id, is_active FROM ${schema}.financial_categories
             WHERE id = $1 AND user_id = $2`,
            [category_id, req.user.id]
        );
        if (category.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'Categoría no encontrada' });
        }
        if (!category.rows[0].is_active) {
            return res.status(422).json({ code: 'FINANCIAL_CATEGORY_INACTIVE', error: 'La categoría está inactiva' });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.financial_transactions
             (user_id, period_id, category_id, type, amount, date, description, payment_method, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user.id, req.params.periodId, category_id, type,
             parseInt(amount), date, description || null,
             payment_method || null, source || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('transactionsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear transacción' });
    }
};

/**
 * PATCH /financial/transactions/:transactionId
 * Only description, date, payment_method are editable after creation.
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { description, date, payment_method } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.financial_transactions
             SET description     = COALESCE($1, description),
                 date            = COALESCE($2, date),
                 payment_method  = COALESCE($3, payment_method),
                 updated_at      = CURRENT_TIMESTAMP
             WHERE id = $4 AND user_id = $5 RETURNING *`,
            [description !== undefined ? (description || null) : null,
             date || null,
             payment_method !== undefined ? (payment_method || null) : null,
             req.params.transactionId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'TRANSACTION_NOT_FOUND', error: 'Transacción no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('transactionsController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar transacción' });
    }
};

/**
 * DELETE /financial/transactions/:transactionId
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `DELETE FROM ${schema}.financial_transactions
             WHERE id = $1 AND user_id = $2 RETURNING id`,
            [req.params.transactionId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'TRANSACTION_NOT_FOUND', error: 'Transacción no encontrada' });
        }
        res.json({ message: 'Transacción eliminada' });
    } catch (err) {
        console.error('transactionsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar transacción' });
    }
};
