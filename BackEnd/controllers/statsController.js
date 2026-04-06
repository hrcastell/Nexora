const db = require('../config/db');

// GET /api/stats — Dashboard KPIs for super_admin
exports.getStats = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const [companies, subscriptions, paymentsMonth, solicitudes, users] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE is_active = TRUE)  AS active,
                    COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive,
                    COUNT(*) AS total
                FROM public.companies
            `),
            db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'active')   AS active,
                    COUNT(*) FILTER (WHERE status = 'past_due') AS past_due,
                    COUNT(*) FILTER (WHERE status = 'canceled') AS canceled,
                    COUNT(*) AS total
                FROM public.subscriptions
            `),
            db.query(`
                SELECT
                    COUNT(*)       AS count,
                    COALESCE(SUM(amount), 0) AS total_amount,
                    MAX(currency)  AS currency
                FROM public.payments_history
                WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
            `),
            db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
                    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                    COUNT(*) AS total
                FROM public.solicitudes
            `),
            db.query(`
                SELECT COUNT(*) AS total FROM public.users WHERE is_active = TRUE
            `)
        ]);

        res.json({
            companies:      companies.rows[0],
            subscriptions:  subscriptions.rows[0],
            payments_month: paymentsMonth.rows[0],
            solicitudes:    solicitudes.rows[0],
            users:          users.rows[0]
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error fetching stats' });
    }
};
