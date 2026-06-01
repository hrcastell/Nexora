const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /financial/periods/:periodId/budget-plans
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

        const result = await db.query(
            `SELECT bp.*, fc.name AS category_name, fc.type AS category_type,
                    fc.is_fixed, fc.is_essential
             FROM ${schema}.budget_plans bp
             JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
             WHERE bp.user_id = $1 AND bp.period_id = $2
             ORDER BY fc.type ASC, fc.name ASC`,
            [req.user.id, req.params.periodId]
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('budgetPlansController.listByPeriod error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar planes de presupuesto' });
    }
};

/**
 * POST /financial/periods/:periodId/budget-plans
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { category_id, planned_amount = 0, notes = null, current_installment } = req.body;

        if (!category_id) return res.status(400).json({ error: 'category_id es requerido' });
        if (parseInt(planned_amount) < 0) {
            return res.status(400).json({ code: 'INVALID_AMOUNT', error: 'planned_amount no puede ser negativo' });
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

        // Validate category ownership and get type + total_installments
        const category = await db.query(
            `SELECT id, type, total_installments FROM ${schema}.financial_categories
             WHERE id = $1 AND user_id = $2`,
            [category_id, req.user.id]
        );
        if (category.rows.length === 0) {
            return res.status(404).json({ code: 'FINANCIAL_CATEGORY_NOT_FOUND', error: 'Categoría no encontrada' });
        }

        const cat = category.rows[0];
        let resolvedCurrentInstallment = null;
        if (cat.type === 'debt' && current_installment != null) {
            const ci = parseInt(current_installment);
            if (cat.total_installments != null && ci > parseInt(cat.total_installments)) {
                return res.status(400).json({
                    code: 'INVALID_INSTALLMENT',
                    error: `current_installment (${ci}) no puede superar total_installments (${cat.total_installments})`
                });
            }
            resolvedCurrentInstallment = ci;
        }

        const result = await db.query(
            `INSERT INTO ${schema}.budget_plans (user_id, period_id, category_id, planned_amount, notes, current_installment)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.id, req.params.periodId, category_id, parseInt(planned_amount), notes || null, resolvedCurrentInstallment]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ code: 'BUDGET_PLAN_ALREADY_EXISTS', error: 'Ya existe un plan para esa categoría en este período' });
        }
        console.error('budgetPlansController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear plan de presupuesto' });
    }
};

/**
 * PUT /financial/budget-plans/:budgetPlanId
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { planned_amount, notes, current_installment } = req.body;

        if (planned_amount !== undefined && parseInt(planned_amount) < 0) {
            return res.status(400).json({ code: 'INVALID_AMOUNT', error: 'planned_amount no puede ser negativo' });
        }

        // Resolve current_installment: fetch the plan's category to validate
        let resolvedCurrentInstallment;
        if (current_installment !== undefined) {
            const planRow = await db.query(
                `SELECT bp.id, fc.type, fc.total_installments
                 FROM ${schema}.budget_plans bp
                 JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
                 WHERE bp.id = $1 AND bp.user_id = $2`,
                [req.params.budgetPlanId, req.user.id]
            );
            if (planRow.rows.length > 0) {
                const cat = planRow.rows[0];
                if (cat.type === 'debt' && current_installment != null) {
                    const ci = parseInt(current_installment);
                    if (cat.total_installments != null && ci > parseInt(cat.total_installments)) {
                        return res.status(400).json({
                            code: 'INVALID_INSTALLMENT',
                            error: `current_installment (${ci}) no puede superar total_installments (${cat.total_installments})`
                        });
                    }
                    resolvedCurrentInstallment = ci;
                } else {
                    resolvedCurrentInstallment = null;
                }
            }
        }

        const result = await db.query(
            `UPDATE ${schema}.budget_plans
             SET planned_amount = COALESCE($1, planned_amount),
                 notes = COALESCE($2, notes),
                 current_installment = CASE
                     WHEN $3 = TRUE THEN $4::INTEGER
                     ELSE current_installment
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6 RETURNING *`,
            [planned_amount !== undefined ? parseInt(planned_amount) : null,
             notes !== undefined ? (notes || null) : null,
             current_installment !== undefined,       // $3: whether to update
             resolvedCurrentInstallment ?? null,      // $4: new value
             req.params.budgetPlanId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan de presupuesto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('budgetPlansController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar plan de presupuesto' });
    }
};

/**
 * DELETE /financial/budget-plans/:budgetPlanId
 */
exports.remove = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `DELETE FROM ${schema}.budget_plans
             WHERE id = $1 AND user_id = $2 RETURNING id`,
            [req.params.budgetPlanId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan de presupuesto no encontrado' });
        }
        res.json({ message: 'Plan eliminado' });
    } catch (err) {
        console.error('budgetPlansController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar plan de presupuesto' });
    }
};
