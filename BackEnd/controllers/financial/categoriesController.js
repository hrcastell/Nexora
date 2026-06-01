const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /financial/categories
 * Query: ?type=income|expense|saving|debt|transfer, ?active=true
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { type, active } = req.query;

        const params = [req.user.id];
        const conditions = ['user_id = $1'];

        if (type) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }
        if (active === 'true') {
            conditions.push('is_active = TRUE');
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const result = await db.query(
            `SELECT * FROM ${schema}.financial_categories
             ${where}
             ORDER BY type ASC, name ASC`,
            params
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('financialCategoriesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar categorías' });
    }
};

/**
 * GET /financial/categories/:categoryId
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.financial_categories
             WHERE id = $1 AND user_id = $2`,
            [req.params.categoryId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'Categoría no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('financialCategoriesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener categoría' });
    }
};

/**
 * POST /financial/categories
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, type, parent_id = null, is_fixed = false, is_essential = false, total_installments } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });
        if (!type) return res.status(400).json({ error: 'type es requerido' });

        const validTypes = ['income', 'expense', 'saving', 'debt', 'transfer'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `type debe ser uno de: ${validTypes.join(', ')}` });
        }

        // total_installments only applies to debt categories
        const resolvedInstallments = (type === 'debt' && total_installments != null)
            ? parseInt(total_installments)
            : null;

        const result = await db.query(
            `INSERT INTO ${schema}.financial_categories
             (user_id, name, type, parent_id, is_fixed, is_essential, total_installments)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.id, name.trim(), type, parent_id || null, Boolean(is_fixed), Boolean(is_essential), resolvedInstallments]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('financialCategoriesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear categoría' });
    }
};

/**
 * PUT /financial/categories/:categoryId
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { name, type, is_fixed, is_essential, total_installments } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

        if (type) {
            const validTypes = ['income', 'expense', 'saving', 'debt', 'transfer'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `type debe ser uno de: ${validTypes.join(', ')}` });
            }
        }

        // total_installments only applies to debt. If type is changing to non-debt, clear it.
        // If total_installments is not in the payload at all, use COALESCE to leave the DB value unchanged.
        let resolvedInstallments = null;
        const isDebt = type === 'debt' || (!type && total_installments !== undefined);
        if (total_installments !== undefined) {
            resolvedInstallments = (type !== 'debt' && type != null) ? null
                : (total_installments != null ? parseInt(total_installments) : null);
        }

        const result = await db.query(
            `UPDATE ${schema}.financial_categories
             SET name = $1,
                 type = COALESCE($2, type),
                 is_fixed = COALESCE($3, is_fixed),
                 is_essential = COALESCE($4, is_essential),
                 total_installments = CASE
                     WHEN $5 = TRUE THEN $6::INTEGER
                     ELSE total_installments
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND user_id = $8 RETURNING *`,
            [name.trim(),
             type || null,
             is_fixed !== undefined ? Boolean(is_fixed) : null,
             is_essential !== undefined ? Boolean(is_essential) : null,
             total_installments !== undefined,   // $5: whether to update installments
             resolvedInstallments,               // $6: new value (null clears it)
             req.params.categoryId,
             req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'Categoría no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('financialCategoriesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar categoría' });
    }
};

/**
 * PATCH /financial/categories/:categoryId/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { is_active } = req.body;

        if (is_active === undefined) return res.status(400).json({ error: 'is_active es requerido' });

        const result = await db.query(
            `UPDATE ${schema}.financial_categories
             SET is_active = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3 RETURNING id, is_active`,
            [Boolean(is_active), req.params.categoryId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'Categoría no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('financialCategoriesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

/**
 * DELETE /financial/categories/:categoryId
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'OperaciÃ³n no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const categoryId = req.params.categoryId;

        const category = await db.query(
            `SELECT id FROM ${schema}.financial_categories
             WHERE id = $1 AND user_id = $2`,
            [categoryId, req.user.id]
        );
        if (category.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'CategorÃ­a no encontrada' });
        }

        const usage = await db.query(
            `SELECT
                (SELECT COUNT(*)::int FROM ${schema}.budget_plans WHERE category_id = $1 AND user_id = $2) AS budget_plans,
                (SELECT COUNT(*)::int FROM ${schema}.financial_transactions WHERE category_id = $1 AND user_id = $2) AS transactions,
                (SELECT COUNT(*)::int FROM ${schema}.financial_categories WHERE parent_id = $1 AND user_id = $2) AS child_categories`,
            [categoryId, req.user.id]
        );

        const { budget_plans, transactions, child_categories } = usage.rows[0];
        if (budget_plans > 0 || transactions > 0 || child_categories > 0) {
            return res.status(409).json({
                code: 'FINANCIAL_CATEGORY_IN_USE',
                error: 'La categorÃ­a estÃ¡ en uso. Desactivala o eliminÃ¡ primero sus planes, transacciones y subcategorÃ­as.',
                usage: { budget_plans, transactions, child_categories }
            });
        }

        await db.query(
            `DELETE FROM ${schema}.financial_categories
             WHERE id = $1 AND user_id = $2`,
            [categoryId, req.user.id]
        );
        res.json({ message: 'CategorÃ­a eliminada' });
    } catch (err) {
        console.error('financialCategoriesController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar categorÃ­a' });
    }
};
