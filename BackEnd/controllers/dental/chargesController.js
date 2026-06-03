const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Resolve charge status based on amounts.
 */
function resolveChargeStatus(total_amount, pending_amount) {
    if (parseFloat(pending_amount) <= 0) return 'paid';
    if (parseFloat(pending_amount) < parseFloat(total_amount)) return 'partially_paid';
    return 'pending';
}

/**
 * GET /dental/charges
 * Query: ?status=, ?customer_id=, ?date_from=, ?date_to=, ?overdue=true, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { status, customer_id, date_from, date_to, overdue, page = 1, limit = 50 } = req.query;

        const params = [companyId];
        const conditions = ['dc.tenant_id = $1'];

        if (status) {
            params.push(status);
            conditions.push(`dc.status = $${params.length}`);
        }
        if (customer_id) {
            params.push(parseInt(customer_id));
            conditions.push(`dc.customer_id = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`DATE(dc.created_at) >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`DATE(dc.created_at) <= $${params.length}`);
        }
        if (overdue === 'true') {
            conditions.push(`dc.due_date IS NOT NULL AND dc.due_date < CURRENT_DATE AND dc.status NOT IN ('paid','cancelled')`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        params.push(limitNum, offset);

        const result = await db.query(
            `SELECT dc.*,
                    c.first_name || ' ' || c.last_name AS patient_name
             FROM ${schema}.dental_charges dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             ${where}
             ORDER BY dc.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.dental_charges dc ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('chargesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar cobros') });
    }
};

/**
 * POST /dental/charges
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            customer_id,
            consultation_id = null,
            service_id = null,
            description = null,
            total_amount,
            due_date = null
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });
        if (!total_amount || parseFloat(total_amount) <= 0) {
            return res.status(400).json({ code: 'DENTAL_INVALID_AMOUNT', error: 'total_amount debe ser mayor a 0' });
        }
        if (!consultation_id) {
            return res.status(400).json({
                code: 'DENTAL_CHARGE_REQUIRES_CONSULTATION',
                error: 'Los cobros deben estar asociados a una consulta'
            });
        }

        const result = await db.query(
            `INSERT INTO ${schema}.dental_charges
             (tenant_id, customer_id, consultation_id, service_id, description, total_amount, paid_amount, pending_amount, due_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, 0, $6, $7, 'pending')
             RETURNING *`,
            [companyId, customer_id, consultation_id, service_id, description, parseFloat(total_amount), due_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('chargesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear cobro') });
    }
};

/**
 * GET /dental/charges/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT dc.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone
             FROM ${schema}.dental_charges dc
             LEFT JOIN ${schema}.customers c ON c.id = dc.customer_id
             WHERE dc.id = $1 AND dc.tenant_id = $2`,
            [req.params.id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CHARGE_NOT_FOUND', error: 'Cobro no encontrado' });
        }

        const payments = await db.query(
            `SELECT * FROM ${schema}.dental_payments WHERE charge_id = $1 AND tenant_id = $2 ORDER BY payment_date DESC`,
            [req.params.id, companyId]
        );

        const installments = await db.query(
            `SELECT * FROM ${schema}.dental_installments WHERE charge_id = $1 AND tenant_id = $2 ORDER BY installment_number ASC`,
            [req.params.id, companyId]
        );

        // Consultation info if present
        let consultation = null;
        if (result.rows[0].consultation_id) {
            const consResult = await db.query(
                `SELECT id, consultation_date, status, reason FROM ${schema}.dental_consultations WHERE id = $1 AND tenant_id = $2`,
                [result.rows[0].consultation_id, companyId]
            );
            consultation = consResult.rows[0] || null;
        }

        res.json({
            data: {
                ...result.rows[0],
                consultation,
                payments: payments.rows,
                installments: installments.rows
            }
        });
    } catch (err) {
        console.error('chargesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener cobro') });
    }
};

/**
 * POST /dental/charges/:id/payments
 * Body: { amount, payment_method?, notes? }
 */
exports.registerPayment = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { amount, payment_method = null, notes = null } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ code: 'DENTAL_INVALID_AMOUNT', error: 'amount debe ser mayor a 0' });
        }

        const chargeResult = await db.query(
            `SELECT * FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (chargeResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CHARGE_NOT_FOUND', error: 'Cobro no encontrado' });
        }

        const charge = chargeResult.rows[0];
        if (parseFloat(amount) > parseFloat(charge.pending_amount)) {
            return res.status(400).json({
                code: 'DENTAL_PAYMENT_EXCEEDS_PENDING',
                error: `El monto ($${amount}) supera el saldo pendiente ($${charge.pending_amount})`
            });
        }

        const newPaidAmount    = parseFloat(charge.paid_amount) + parseFloat(amount);
        const newPendingAmount = parseFloat(charge.pending_amount) - parseFloat(amount);
        const newStatus        = resolveChargeStatus(charge.total_amount, newPendingAmount);

        // Insert payment
        const paymentResult = await db.query(
            `INSERT INTO ${schema}.dental_payments
             (tenant_id, customer_id, charge_id, amount, payment_method, notes, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [companyId, charge.customer_id, charge.id, parseFloat(amount), payment_method, notes]
        );

        // Update charge
        await db.query(
            `UPDATE ${schema}.dental_charges
             SET paid_amount = $1, pending_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND tenant_id = $5`,
            [newPaidAmount, newPendingAmount, newStatus, charge.id, companyId]
        );

        // Sync administrative_status on the linked consultation
        if (charge.consultation_id) {
            const adminStatus =
                newStatus === 'paid'           ? 'paid' :
                newStatus === 'partially_paid' ? 'partially_paid' :
                'unpaid';

            await db.query(
                `UPDATE ${schema}.dental_consultations
                 SET administrative_status = $1, updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3`,
                [adminStatus, charge.consultation_id, companyId]
            );
        }

        res.status(201).json({ data: paymentResult.rows[0] });
    } catch (err) {
        console.error('chargesController.registerPayment error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al registrar pago') });
    }
};

/**
 * POST /dental/charges/:id/installments
 * Body: { installments_count, first_due_date }
 */
exports.createInstallments = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { installments_count, first_due_date } = req.body;

        const count = parseInt(installments_count);
        if (!count || count < 2 || count > 12) {
            return res.status(400).json({ error: 'installments_count debe ser un número entre 2 y 12' });
        }
        if (!first_due_date) {
            return res.status(400).json({ error: 'first_due_date es requerido' });
        }

        const chargeResult = await db.query(
            `SELECT * FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (chargeResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CHARGE_NOT_FOUND', error: 'Cobro no encontrado' });
        }

        const charge = chargeResult.rows[0];
        const pendingAmount = parseFloat(charge.pending_amount);

        if (pendingAmount <= 0) {
            return res.status(400).json({ error: 'El cobro no tiene saldo pendiente para cuotificar' });
        }

        // Compute per-installment amount (truncated to 2 decimal places)
        const amountPer = Math.floor((pendingAmount / count) * 100) / 100;
        const lastAmount = Math.round((pendingAmount - amountPer * (count - 1)) * 100) / 100;

        // Generate due dates: first_due_date, then +1 month each
        function addMonths(dateStr, months) {
            const d = new Date(dateStr);
            d.setMonth(d.getMonth() + months);
            return d.toISOString().slice(0, 10);
        }

        // Delete existing unpaid installments
        await db.query(
            `DELETE FROM ${schema}.dental_installments
             WHERE charge_id = $1 AND tenant_id = $2 AND status NOT IN ('paid','cancelled')`,
            [charge.id, companyId]
        );

        // Insert new installments
        const insertedRows = [];
        for (let i = 0; i < count; i++) {
            const amount = i === count - 1 ? lastAmount : amountPer;
            const dueDate = addMonths(first_due_date, i);
            const row = await db.query(
                `INSERT INTO ${schema}.dental_installments
                 (tenant_id, charge_id, customer_id, installment_number, amount, paid_amount, due_date, status)
                 VALUES ($1, $2, $3, $4, $5, 0, $6, 'pending')
                 RETURNING *`,
                [companyId, charge.id, charge.customer_id, i + 1, amount, dueDate]
            );
            insertedRows.push(row.rows[0]);
        }

        res.status(201).json({ data: insertedRows });
    } catch (err) {
        console.error('chargesController.createInstallments error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear cuotas') });
    }
};

/**
 * GET /dental/installments/overdue
 */
exports.getOverdueInstallments = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT di.*,
                    dc.total_amount AS charge_total,
                    dc.description  AS charge_description,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    c.phone AS patient_phone
             FROM ${schema}.dental_installments di
             JOIN ${schema}.dental_charges dc ON dc.id = di.charge_id
             LEFT JOIN ${schema}.customers c ON c.id = di.customer_id
             WHERE di.tenant_id = $1
               AND di.status NOT IN ('paid','cancelled')
               AND di.due_date < CURRENT_DATE
             ORDER BY di.due_date ASC`,
            [companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('chargesController.getOverdueInstallments error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener cuotas vencidas') });
    }
};

/**
 * POST /dental/installments/:id/pay
 * Body: { amount, payment_method?, notes? }
 */
exports.payInstallment = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const { amount, payment_method = null, notes = null } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ code: 'DENTAL_INVALID_AMOUNT', error: 'amount debe ser mayor a 0' });
        }

        const instResult = await db.query(
            `SELECT * FROM ${schema}.dental_installments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (instResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_INSTALLMENT_NOT_FOUND', error: 'Cuota no encontrada' });
        }

        const inst = instResult.rows[0];
        const remaining = parseFloat(inst.amount) - parseFloat(inst.paid_amount);

        if (parseFloat(amount) > remaining) {
            return res.status(400).json({
                code: 'DENTAL_PAYMENT_EXCEEDS_PENDING',
                error: `El monto ($${amount}) supera el saldo restante de la cuota ($${remaining})`
            });
        }

        const chargeResult = await db.query(
            `SELECT * FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [inst.charge_id, companyId]
        );
        if (chargeResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CHARGE_NOT_FOUND', error: 'Cobro padre no encontrado' });
        }
        const charge = chargeResult.rows[0];

        // Insert payment
        const paymentResult = await db.query(
            `INSERT INTO ${schema}.dental_payments
             (tenant_id, customer_id, charge_id, amount, payment_method, notes, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [companyId, inst.customer_id, inst.charge_id, parseFloat(amount), payment_method, notes]
        );

        // Update installment
        const newInstPaid      = parseFloat(inst.paid_amount) + parseFloat(amount);
        const newInstStatus    = newInstPaid >= parseFloat(inst.amount) ? 'paid' : 'partial';
        await db.query(
            `UPDATE ${schema}.dental_installments
             SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND tenant_id = $4`,
            [newInstPaid, newInstStatus, inst.id, companyId]
        );

        // Update parent charge
        const newChargePaid    = parseFloat(charge.paid_amount) + parseFloat(amount);
        const newChargePending = parseFloat(charge.pending_amount) - parseFloat(amount);
        const newChargeStatus  = resolveChargeStatus(charge.total_amount, newChargePending);
        await db.query(
            `UPDATE ${schema}.dental_charges
             SET paid_amount = $1, pending_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND tenant_id = $5`,
            [newChargePaid, newChargePending, newChargeStatus, charge.id, companyId]
        );

        // Sync administrative_status on the linked consultation
        if (charge.consultation_id) {
            const adminStatus =
                newChargeStatus === 'paid'           ? 'paid' :
                newChargeStatus === 'partially_paid' ? 'partially_paid' :
                'unpaid';

            await db.query(
                `UPDATE ${schema}.dental_consultations
                 SET administrative_status = $1, updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3`,
                [adminStatus, charge.consultation_id, companyId]
            );
        }

        res.status(201).json({ data: paymentResult.rows[0] });
    } catch (err) {
        console.error('chargesController.payInstallment error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al pagar cuota') });
    }
};

/**
 * GET /dental/payments
 * Query: ?customer_id=, ?date_from=, ?date_to=, ?payment_method=, ?page=1, ?limit=50
 */
exports.listPayments = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { customer_id, date_from, date_to, payment_method, page = 1, limit = 50 } = req.query;

        const params = [companyId];
        const conditions = ['dp.tenant_id = $1'];

        if (customer_id) {
            params.push(parseInt(customer_id));
            conditions.push(`dp.customer_id = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            conditions.push(`DATE(dp.payment_date) >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            conditions.push(`DATE(dp.payment_date) <= $${params.length}`);
        }
        if (payment_method) {
            params.push(payment_method);
            conditions.push(`dp.payment_method = $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        params.push(limitNum, offset);

        const result = await db.query(
            `SELECT dp.*,
                    c.first_name || ' ' || c.last_name AS patient_name,
                    dc.total_amount   AS charge_total,
                    dc.description    AS charge_description
             FROM ${schema}.dental_payments dp
             LEFT JOIN ${schema}.customers c ON c.id = dp.customer_id
             LEFT JOIN ${schema}.dental_charges dc ON dc.id = dp.charge_id
             ${where}
             ORDER BY dp.payment_date DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.dental_payments dp ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('chargesController.listPayments error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar pagos') });
    }
};

/**
 * DELETE /dental/charges/:id
 * Only allowed when paid_amount = 0 (no payments registered)
 */
exports.deleteCharge = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const chargeResult = await db.query(
            `SELECT * FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (chargeResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_CHARGE_NOT_FOUND', error: 'Cobro no encontrado' });
        }

        const charge = chargeResult.rows[0];
        if (parseFloat(charge.paid_amount) > 0) {
            return res.status(409).json({
                code: 'DENTAL_CHARGE_HAS_PAYMENTS',
                error: 'No se puede eliminar un cobro con pagos registrados'
            });
        }

        await db.query(
            `DELETE FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('chargesController.deleteCharge error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar cobro') });
    }
};

/**
 * DELETE /dental/payments/:id
 * Recalculates parent charge after deletion
 */
exports.deletePayment = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const paymentResult = await db.query(
            `SELECT * FROM ${schema}.dental_payments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_PAYMENT_NOT_FOUND', error: 'Pago no encontrado' });
        }

        const payment = paymentResult.rows[0];

        await db.query(
            `DELETE FROM ${schema}.dental_payments WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );

        // Recalculate parent charge from actual payment sum (avoids arithmetic drift)
        const chargeResult = await db.query(
            `SELECT * FROM ${schema}.dental_charges WHERE id = $1 AND tenant_id = $2`,
            [payment.charge_id, companyId]
        );
        if (chargeResult.rows.length > 0) {
            const charge = chargeResult.rows[0];
            const sumResult = await db.query(
                `SELECT COALESCE(SUM(amount), 0) AS total_paid
                 FROM ${schema}.dental_payments
                 WHERE charge_id = $1 AND tenant_id = $2`,
                [charge.id, companyId]
            );
            const newPaidAmount = parseFloat(sumResult.rows[0].total_paid);
            const newPendingAmount = parseFloat(charge.total_amount) - newPaidAmount;
            const newStatus = resolveChargeStatus(charge.total_amount, newPendingAmount);
            await db.query(
                `UPDATE ${schema}.dental_charges
                 SET paid_amount = $1, pending_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4 AND tenant_id = $5`,
                [newPaidAmount, newPendingAmount, newStatus, charge.id, companyId]
            );

            // Sync administrative_status on the linked consultation
            if (charge.consultation_id) {
                const adminStatus =
                    newStatus === 'paid'           ? 'paid' :
                    newStatus === 'partially_paid' ? 'partially_paid' :
                    'unpaid';
                await db.query(
                    `UPDATE ${schema}.dental_consultations
                     SET administrative_status = $1, updated_at = NOW()
                     WHERE id = $2 AND tenant_id = $3`,
                    [adminStatus, charge.consultation_id, companyId]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('chargesController.deletePayment error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar pago') });
    }
};

/**
 * GET /dental/finance/summary
 */
exports.getFinanceSummary = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const statsResult = await db.query(
            `SELECT
                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1 AND DATE(payment_date) = CURRENT_DATE) AS daily_total,

                (SELECT COALESCE(SUM(amount), 0) FROM ${schema}.dental_payments
                 WHERE tenant_id = $1
                   AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
                ) AS monthly_total,

                (SELECT COALESCE(SUM(pending_amount), 0) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1 AND status NOT IN ('paid','cancelled')) AS total_pending,

                (SELECT COUNT(*) FROM ${schema}.dental_charges
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')
                   AND due_date IS NOT NULL
                   AND due_date < CURRENT_DATE) AS overdue_charges_count,

                (SELECT COUNT(*) FROM ${schema}.dental_installments
                 WHERE tenant_id = $1
                   AND status NOT IN ('paid','cancelled')
                   AND due_date < CURRENT_DATE) AS overdue_installments_count`,
            [companyId]
        );

        const recentPayments = await db.query(
            `SELECT dp.*,
                    c.first_name || ' ' || c.last_name AS patient_name
             FROM ${schema}.dental_payments dp
             LEFT JOIN ${schema}.customers c ON c.id = dp.customer_id
             WHERE dp.tenant_id = $1
             ORDER BY dp.payment_date DESC
             LIMIT 5`,
            [companyId]
        );

        res.json({
            data: {
                ...statsResult.rows[0],
                recent_payments: recentPayments.rows
            }
        });
    } catch (err) {
        console.error('chargesController.getFinanceSummary error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener resumen financiero') });
    }
};
