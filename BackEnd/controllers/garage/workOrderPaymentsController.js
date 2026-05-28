const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Recalcula amount_paid, amount_pending y payment_status en work_orders.
 * Llama siempre dentro de una transacción (client).
 */
async function recalculatePaymentStatus(workOrderId, schema, client) {
    await client.query(
        `UPDATE ${schema}.work_orders wo
         SET amount_paid    = COALESCE((
                 SELECT SUM(amount) FROM ${schema}.work_order_payments
                 WHERE work_order_id = wo.id
             ), 0),
             amount_pending = GREATEST(0, wo.total_amount - COALESCE((
                 SELECT SUM(amount) FROM ${schema}.work_order_payments
                 WHERE work_order_id = wo.id
             ), 0)),
             payment_status = CASE
                 WHEN wo.total_amount <= 0 THEN 'pending'
                 WHEN COALESCE((SELECT SUM(amount) FROM ${schema}.work_order_payments WHERE work_order_id = wo.id), 0) <= 0
                     THEN 'pending'
                 WHEN COALESCE((SELECT SUM(amount) FROM ${schema}.work_order_payments WHERE work_order_id = wo.id), 0)
                      >= wo.total_amount
                     THEN 'paid'
                 ELSE 'partial'
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE wo.id = $1`,
        [workOrderId]
    );
}

/**
 * GET /garage/work-orders/:id/payments
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT wop.*
             FROM ${schema}.work_order_payments wop
             WHERE wop.work_order_id = $1
             ORDER BY wop.payment_date DESC, wop.created_at DESC`,
            [req.params.id]
        );

        const summary = await db.query(
            `SELECT total_amount, amount_paid, amount_pending, payment_status, currency
             FROM ${schema}.work_orders WHERE id = $1`,
            [req.params.id]
        );

        res.json({
            payments: result.rows,
            summary: summary.rows[0] || { total_amount: 0, amount_paid: 0, amount_pending: 0, payment_status: 'pending', currency: 'CLP' }
        });
    } catch (err) {
        console.error('workOrderPaymentsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar pagos' });
    }
};

/**
 * POST /garage/work-orders/:id/payments
 */
exports.create = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        const { amount, currency, payment_method, reference, notes, payment_date } = req.body;
        if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount debe ser mayor a 0' });

        const woCheck = await db.query(
            `SELECT id, total_amount FROM ${schema}.work_orders WHERE id = $1`,
            [req.params.id]
        );
        if (woCheck.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO ${schema}.work_order_payments
             (work_order_id, amount, currency, payment_method, reference, notes, payment_date, registered_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [
                req.params.id, Number(amount),
                currency || 'CLP',
                payment_method || null,
                reference || null,
                notes || null,
                payment_date || new Date().toISOString().split('T')[0],
                req.user?.id || null
            ]
        );

        await recalculatePaymentStatus(parseInt(req.params.id), schema, client);
        await client.query('COMMIT');

        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderPaymentsController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al registrar pago' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /garage/work-orders/:id/payments/:paymentId
 */
exports.remove = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const { schema } = await resolveSchema(req);

        await client.query('BEGIN');

        const result = await client.query(
            `DELETE FROM ${schema}.work_order_payments WHERE id = $1 AND work_order_id = $2 RETURNING id`,
            [req.params.paymentId, req.params.id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        await recalculatePaymentStatus(parseInt(req.params.id), schema, client);
        await client.query('COMMIT');

        res.json({ message: 'Pago eliminado' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('workOrderPaymentsController.remove error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar pago' });
    } finally {
        client.release();
    }
};
