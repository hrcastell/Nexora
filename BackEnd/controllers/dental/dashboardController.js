const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /dental/dashboard
 * Combined stats summary.
 */
exports.getSummary = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const today = new Date().toISOString().slice(0, 10);

        const statsResult = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM ${schema}.dental_appointments
                 WHERE tenant_id = $1
                   AND DATE(scheduled_start) = $2
                   AND status NOT IN ('cancelled')) AS today_appointments,

                (SELECT row_to_json(a)
                 FROM (
                     SELECT da.id, da.scheduled_start, da.scheduled_end, da.status,
                            c.first_name || ' ' || c.last_name AS patient_name
                     FROM ${schema}.dental_appointments da
                     LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
                     WHERE da.tenant_id = $1
                       AND da.scheduled_start > NOW()
                       AND da.status NOT IN ('cancelled','no_show')
                     ORDER BY da.scheduled_start ASC
                     LIMIT 1
                 ) a
                ) AS next_appointment,

                (SELECT COUNT(*) FROM ${schema}.dental_consultations
                 WHERE tenant_id = $1
                   AND DATE(consultation_date) = $2
                   AND status IN ('finalizada_clinicamente', 'cerrada', 'pendiente_pago')) AS patients_seen_today,

                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1
                   AND DATE(payment_date) = $2) AS charged_today,

                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1
                   AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
                ) AS charged_this_month,

                (SELECT COALESCE(SUM(pending_amount), 0) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')) AS total_pending,

                (SELECT COUNT(*) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')
                   AND due_date IS NOT NULL
                   AND due_date < CURRENT_DATE) AS overdue_charges_count,

                (SELECT COUNT(*) FROM ${schema}.dental_installments
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')
                   AND due_date < CURRENT_DATE) AS overdue_installments_count`,
            [companyId, today]
        );

        res.json({ data: statsResult.rows[0] });
    } catch (err) {
        console.error('dashboardController.getSummary error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener resumen del dashboard') });
    }
};

/**
 * GET /dental/dashboard/today
 * Today's appointments with patient info.
 */
exports.getToday = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const today = new Date().toISOString().slice(0, 10);

        const result = await db.query(
            `SELECT da.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone
             FROM ${schema}.dental_appointments da
             LEFT JOIN ${schema}.customers c ON c.id = da.customer_id
             WHERE da.tenant_id = $1
               AND DATE(da.scheduled_start) = $2
             ORDER BY da.scheduled_start ASC`,
            [companyId, today]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('dashboardController.getToday error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener citas de hoy') });
    }
};

/**
 * GET /dental/dashboard/finance
 * Financial summary.
 */
exports.getFinance = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT
                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1
                   AND DATE(payment_date) = CURRENT_DATE) AS daily_total,

                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1
                   AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
                ) AS monthly_total,

                (SELECT COALESCE(SUM(pending_amount), 0) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')) AS total_pending,

                (SELECT COUNT(*) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')
                   AND due_date IS NOT NULL
                   AND due_date < CURRENT_DATE) AS overdue_count`,
            [companyId]
        );

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('dashboardController.getFinance error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener resumen financiero') });
    }
};
