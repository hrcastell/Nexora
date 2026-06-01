const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const INCOME_TYPES  = ['income'];
const EXPENSE_TYPES = ['expense', 'saving', 'debt'];

/**
 * Validates that the period exists and belongs to the user.
 * Returns the period row or null.
 */
async function validatePeriod(schema, periodId, userId) {
    const result = await db.query(
        `SELECT * FROM ${schema}.financial_periods
         WHERE id = $1 AND user_id = $2`,
        [periodId, userId]
    );
    return result.rows[0] || null;
}

/**
 * GET /financial/periods/:periodId/summary
 */
exports.getSummary = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const period = await validatePeriod(schema, req.params.periodId, req.user.id);
        if (!period) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }

        // Budget totals by category type
        const budgetResult = await db.query(
            `SELECT fc.type, SUM(bp.planned_amount) AS total
             FROM ${schema}.budget_plans bp
             JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
             WHERE bp.user_id = $1 AND bp.period_id = $2
             GROUP BY fc.type`,
            [req.user.id, period.id]
        );

        // Transaction totals by type
        const txResult = await db.query(
            `SELECT type, SUM(amount) AS total
             FROM ${schema}.financial_transactions
             WHERE user_id = $1 AND period_id = $2
             GROUP BY type`,
            [req.user.id, period.id]
        );

        const budget = {};
        for (const row of budgetResult.rows) budget[row.type] = parseInt(row.total) || 0;

        const tx = {};
        for (const row of txResult.rows) tx[row.type] = parseInt(row.total) || 0;

        const plannedIncome   = budget['income']   || 0;
        const realIncome      = tx['income']        || 0;
        const plannedExpenses = (budget['expense'] || 0) + (budget['saving'] || 0) + (budget['debt'] || 0);
        const realExpenses    = (tx['expense']     || 0) + (tx['saving']    || 0) + (tx['debt']    || 0);
        const plannedSavings  = budget['saving']   || 0;
        const realSavings     = tx['saving']       || 0;

        const netCashflow  = realIncome - realExpenses;
        const finalBalance = period.initial_balance + netCashflow;
        const savingsRate  = realIncome > 0
            ? Math.round((realSavings / realIncome) * 10000) / 100
            : 0;
        const expenseExecutionRate = plannedExpenses > 0
            ? Math.round((realExpenses / plannedExpenses) * 10000) / 100
            : 0;

        // Debt installment summary
        const debtResult = await db.query(
            `SELECT
                fc.id AS category_id,
                fc.name AS category_name,
                fc.total_installments,
                bp.current_installment,
                bp.planned_amount,
                COALESCE(SUM(ft.amount), 0) AS real_amount
             FROM ${schema}.budget_plans bp
             JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
             LEFT JOIN ${schema}.financial_transactions ft
                 ON ft.category_id = bp.category_id
                 AND ft.period_id = bp.period_id
                 AND ft.user_id = bp.user_id
             WHERE bp.user_id = $1 AND bp.period_id = $2 AND fc.type = 'debt'
             GROUP BY fc.id, fc.name, fc.total_installments, bp.current_installment, bp.planned_amount`,
            [req.user.id, period.id]
        );

        const debts = debtResult.rows.map(row => {
            const totalInstallments  = row.total_installments  ? parseInt(row.total_installments)  : null;
            const currentInstallment = row.current_installment ? parseInt(row.current_installment) : null;
            const remainingInstallments = (totalInstallments !== null && currentInstallment !== null)
                ? totalInstallments - currentInstallment
                : null;
            const estimatedRemaining = remainingInstallments !== null
                ? parseInt(row.planned_amount) * remainingInstallments
                : null;
            return {
                category_id:            row.category_id,
                category_name:          row.category_name,
                planned_amount:         parseInt(row.planned_amount),
                real_amount:            parseInt(row.real_amount),
                total_installments:     totalInstallments,
                current_installment:    currentInstallment,
                remaining_installments: remainingInstallments,
                estimated_remaining:    estimatedRemaining,
            };
        });

        const totalDebtMonthly   = debts.reduce((s, d) => s + d.real_amount, 0);
        const totalEstimatedDebt = debts.reduce((s, d) => s + (d.estimated_remaining ?? 0), 0);

        res.json({
            period: {
                id: period.id,
                year: period.year,
                month: period.month,
                status: period.status,
                initial_balance: period.initial_balance
            },
            summary: {
                planned_income:          plannedIncome,
                real_income:             realIncome,
                income_difference:       realIncome - plannedIncome,
                planned_expenses:        plannedExpenses,
                real_expenses:           realExpenses,
                expense_difference:      plannedExpenses - realExpenses,
                planned_savings:         plannedSavings,
                real_savings:            realSavings,
                savings_difference:      realSavings - plannedSavings,
                net_cashflow:            netCashflow,
                final_balance:           finalBalance,
                savings_rate:            savingsRate,
                expense_execution_rate:  expenseExecutionRate
            },
            debt_summary: {
                total_debt_monthly:   totalDebtMonthly,
                total_estimated_debt: totalEstimatedDebt,
                debts
            }
        });
    } catch (err) {
        console.error('summaryController.getSummary error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener resumen' });
    }
};

/**
 * GET /financial/periods/:periodId/breakdown
 * Returns per-category breakdown with budget vs real comparison.
 */
exports.getBreakdown = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const period = await validatePeriod(schema, req.params.periodId, req.user.id);
        if (!period) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }

        // All categories with a budget plan in this period
        const budgetRows = await db.query(
            `SELECT fc.id AS category_id, fc.name AS category_name, fc.type AS category_type,
                    fc.is_fixed, fc.is_essential, bp.planned_amount
             FROM ${schema}.budget_plans bp
             JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
             WHERE bp.user_id = $1 AND bp.period_id = $2`,
            [req.user.id, period.id]
        );

        // Real amounts per category
        const txRows = await db.query(
            `SELECT category_id, SUM(amount) AS real_amount
             FROM ${schema}.financial_transactions
             WHERE user_id = $1 AND period_id = $2
             GROUP BY category_id`,
            [req.user.id, period.id]
        );

        // Categories that have transactions but no budget plan
        const noPlanRows = await db.query(
            `SELECT fc.id AS category_id, fc.name AS category_name, fc.type AS category_type,
                    fc.is_fixed, fc.is_essential, SUM(ft.amount) AS real_amount
             FROM ${schema}.financial_transactions ft
             JOIN ${schema}.financial_categories fc ON fc.id = ft.category_id
             WHERE ft.user_id = $1 AND ft.period_id = $2
               AND ft.category_id NOT IN (
                   SELECT category_id FROM ${schema}.budget_plans
                   WHERE user_id = $1 AND period_id = $2
               )
             GROUP BY fc.id, fc.name, fc.type, fc.is_fixed, fc.is_essential`,
            [req.user.id, period.id]
        );

        const txMap = {};
        for (const r of txRows.rows) txMap[r.category_id] = parseInt(r.real_amount) || 0;

        const breakdown = [];

        for (const row of budgetRows.rows) {
            const planned = parseInt(row.planned_amount) || 0;
            const real    = txMap[row.category_id] || 0;
            const isIncome = INCOME_TYPES.includes(row.category_type);

            let difference, status;
            if (isIncome) {
                difference = real - planned;
                status     = real >= planned ? 'over_budget' : 'under_budget';
            } else {
                difference = planned - real;
                status     = real > planned ? 'over_budget' : real === planned ? 'on_track' : 'under_budget';
            }

            breakdown.push({
                category_id:   row.category_id,
                category_name: row.category_name,
                category_type: row.category_type,
                is_fixed:      row.is_fixed,
                is_essential:  row.is_essential,
                planned_amount: planned,
                real_amount:   real,
                difference,
                status
            });
        }

        // Add no-plan categories
        for (const row of noPlanRows.rows) {
            breakdown.push({
                category_id:   row.category_id,
                category_name: row.category_name,
                category_type: row.category_type,
                is_fixed:      row.is_fixed,
                is_essential:  row.is_essential,
                planned_amount: 0,
                real_amount:   parseInt(row.real_amount) || 0,
                difference:    -(parseInt(row.real_amount) || 0),
                status: 'no_plan'
            });
        }

        res.json({ data: breakdown });
    } catch (err) {
        console.error('summaryController.getBreakdown error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener breakdown' });
    }
};

/**
 * GET /financial/periods/:periodId/deviations
 * Returns only deviating categories: over_budget, under_budget, no_plan
 */
exports.getDeviations = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const period = await validatePeriod(schema, req.params.periodId, req.user.id);
        if (!period) {
            return res.status(404).json({ code: 'FINANCIAL_PERIOD_NOT_FOUND', error: 'Período no encontrado' });
        }

        // Reuse breakdown logic and filter
        const breakdownRes = await exports._buildBreakdown(schema, period, req.user.id);
        const deviations = breakdownRes.filter(r => r.status !== 'on_track');

        res.json({ data: deviations });
    } catch (err) {
        console.error('summaryController.getDeviations error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener desviaciones' });
    }
};

/**
 * POST /financial/categories/seed
 * Seeds default categories for the authenticated user.
 */
exports.seedDefaultCategories = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);

        // Check if user already has categories
        const existing = await db.query(
            `SELECT COUNT(*) FROM ${schema}.financial_categories WHERE user_id = $1`,
            [req.user.id]
        );
        if (parseInt(existing.rows[0].count) > 0) {
            return res.status(409).json({ error: 'El usuario ya tiene categorías configuradas' });
        }

        const defaults = [
            { name: 'Sueldo',                          type: 'income',   is_fixed: true,  is_essential: true  },
            { name: 'Sodexo',                          type: 'income',   is_fixed: false, is_essential: false },
            { name: 'Bonificaciones',                  type: 'income',   is_fixed: false, is_essential: false },
            { name: 'Intereses',                       type: 'income',   is_fixed: false, is_essential: false },
            { name: 'Otros ingresos',                  type: 'income',   is_fixed: false, is_essential: false },
            { name: 'Ahorro - me pago a mí primero',   type: 'saving',   is_fixed: true,  is_essential: true  },
            { name: 'Alquiler',                        type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Préstamos',                       type: 'debt',     is_fixed: true,  is_essential: true  },
            { name: 'Plataformas de Streaming',        type: 'expense',  is_fixed: true,  is_essential: false },
            { name: 'Aporte familiar',                 type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Alimentación',                    type: 'expense',  is_fixed: false, is_essential: true  },
            { name: 'Gasolina',                        type: 'expense',  is_fixed: false, is_essential: true  },
            { name: 'Flujo de efectivo',               type: 'expense',  is_fixed: false, is_essential: false },
            { name: 'Peajes',                          type: 'expense',  is_fixed: false, is_essential: false },
            { name: 'Internet',                        type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Agua',                            type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Luz',                             type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Gas',                             type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Condominio',                      type: 'expense',  is_fixed: true,  is_essential: true  },
            { name: 'Estacionamiento',                 type: 'expense',  is_fixed: true,  is_essential: false },
        ];

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const inserted = [];
            for (const cat of defaults) {
                const r = await client.query(
                    `INSERT INTO ${schema}.financial_categories (user_id, name, type, is_fixed, is_essential)
                     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [req.user.id, cat.name, cat.type, cat.is_fixed, cat.is_essential]
                );
                inserted.push(r.rows[0]);
            }
            await client.query('COMMIT');
            res.status(201).json({ message: 'Categorías por defecto creadas', data: inserted });
        } catch (innerErr) {
            await client.query('ROLLBACK');
            throw innerErr;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('summaryController.seedDefaultCategories error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear categorías por defecto' });
    }
};

/**
 * Internal helper used by getDeviations to avoid code duplication.
 */
exports._buildBreakdown = async (schema, period, userId) => {
    const budgetRows = await db.query(
        `SELECT fc.id AS category_id, fc.name AS category_name, fc.type AS category_type,
                fc.is_fixed, fc.is_essential, bp.planned_amount
         FROM ${schema}.budget_plans bp
         JOIN ${schema}.financial_categories fc ON fc.id = bp.category_id
         WHERE bp.user_id = $1 AND bp.period_id = $2`,
        [userId, period.id]
    );

    const txRows = await db.query(
        `SELECT category_id, SUM(amount) AS real_amount
         FROM ${schema}.financial_transactions
         WHERE user_id = $1 AND period_id = $2
         GROUP BY category_id`,
        [userId, period.id]
    );

    const noPlanRows = await db.query(
        `SELECT fc.id AS category_id, fc.name AS category_name, fc.type AS category_type,
                fc.is_fixed, fc.is_essential, SUM(ft.amount) AS real_amount
         FROM ${schema}.financial_transactions ft
         JOIN ${schema}.financial_categories fc ON fc.id = ft.category_id
         WHERE ft.user_id = $1 AND ft.period_id = $2
           AND ft.category_id NOT IN (
               SELECT category_id FROM ${schema}.budget_plans
               WHERE user_id = $1 AND period_id = $2
           )
         GROUP BY fc.id, fc.name, fc.type, fc.is_fixed, fc.is_essential`,
        [userId, period.id]
    );

    const txMap = {};
    for (const r of txRows.rows) txMap[r.category_id] = parseInt(r.real_amount) || 0;

    const breakdown = [];

    for (const row of budgetRows.rows) {
        const planned = parseInt(row.planned_amount) || 0;
        const real    = txMap[row.category_id] || 0;
        const isIncome = INCOME_TYPES.includes(row.category_type);
        let difference, status;
        if (isIncome) {
            difference = real - planned;
            status     = real >= planned ? 'over_budget' : 'under_budget';
        } else {
            difference = planned - real;
            status     = real > planned ? 'over_budget' : real === planned ? 'on_track' : 'under_budget';
        }
        breakdown.push({
            category_id: row.category_id, category_name: row.category_name,
            category_type: row.category_type, is_fixed: row.is_fixed,
            is_essential: row.is_essential, planned_amount: planned,
            real_amount: real, difference, status
        });
    }

    for (const row of noPlanRows.rows) {
        breakdown.push({
            category_id: row.category_id, category_name: row.category_name,
            category_type: row.category_type, is_fixed: row.is_fixed,
            is_essential: row.is_essential, planned_amount: 0,
            real_amount: parseInt(row.real_amount) || 0,
            difference: -(parseInt(row.real_amount) || 0),
            status: 'no_plan'
        });
    }

    return breakdown;
};
