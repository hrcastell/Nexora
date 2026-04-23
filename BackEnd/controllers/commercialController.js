const db = require('../config/db');

const isSuperAdmin = (req) => req.user.is_super_admin === true;
const isAdmin      = (req) => isSuperAdmin(req) || req.user.role === 'admin';

// ── Estado Comercial ──────────────────────────────────────────

// PATCH /api/companies/:id/commercial-status
exports.changeCommercialStatus = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el super administrador puede cambiar el estado comercial' });

        const { id } = req.params;
        const { commercial_status } = req.body;

        const valid = ['activa', 'pendiente_pago', 'suspendida', 'bloqueada'];
        if (!valid.includes(commercial_status)) {
            return res.status(400).json({ error: `Estado inválido. Valores: ${valid.join(', ')}` });
        }

        // Protect master schema from suspension/blocking
        const masterCheck = await db.query('SELECT is_master FROM public.companies WHERE id = $1', [id]);
        if (masterCheck.rows[0]?.is_master && commercial_status !== 'activa') {
            return res.status(403).json({ error: 'El schema maestro (hernancius) no puede ser suspendido ni bloqueado.' });
        }

        const result = await db.query(
            `UPDATE public.companies SET commercial_status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING id, name, commercial_status`,
            [commercial_status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Change commercial status error:', error);
        res.status(500).json({ error: 'Error al cambiar estado comercial' });
    }
};

// ── Convenios de Pago ─────────────────────────────────────────

// GET /api/companies/:id/agreements
exports.getAgreements = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId } = req.params;
        const result = await db.query(
            `SELECT pa.*, u.full_name AS created_by_name
             FROM public.payment_agreements pa
             LEFT JOIN public.users u ON pa.created_by = u.id
             WHERE pa.company_id = $1
             ORDER BY pa.created_at DESC`,
            [companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get agreements error:', error);
        res.status(500).json({ error: 'Error al obtener convenios' });
    }
};

// POST /api/companies/:id/agreements
exports.createAgreement = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Solo el super administrador puede crear convenios' });

        const { id: companyId } = req.params;
        const {
            amount,
            currency,
            frequency,
            start_date,
            due_day,
            service_description,
            grace_period_days,
            subscription_plan_id,
            replace_active
        } = req.body;

        await client.query('BEGIN');

        const companyCheck = await client.query('SELECT id FROM public.companies WHERE id = $1', [companyId]);
        if (companyCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const hasPlanField = Object.prototype.hasOwnProperty.call(req.body, 'subscription_plan_id');
        const parsedPlanId = subscription_plan_id ? Number(subscription_plan_id) : null;
        const hasPlan = Number.isInteger(parsedPlanId) && parsedPlanId > 0;
        if (hasPlanField && subscription_plan_id !== null && subscription_plan_id !== '' && !hasPlan) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El plan seleccionado no es valido' });
        }

        let resolvedAmount = amount;
        let resolvedCurrency = currency || 'CLP';
        let resolvedFrequency = frequency || 'monthly';
        let resolvedDueDay = due_day || 1;
        let resolvedDescription = service_description;
        let resolvedGrace = grace_period_days || 5;

        if (hasPlan) {
            const planRes = await client.query(
                'SELECT * FROM public.subscription_plans WHERE id = $1 AND is_active = TRUE',
                [parsedPlanId]
            );
            if (planRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El plan seleccionado no existe o esta inactivo' });
            }

            const plan = planRes.rows[0];
            resolvedAmount = plan.amount;
            resolvedCurrency = plan.currency || 'CLP';
            resolvedFrequency = plan.payment_frequency || 'monthly';
            resolvedDueDay = plan.due_day || 1;
            resolvedDescription = `Suscripcion plan ${plan.name}`;
            resolvedGrace = plan.grace_period_days || 5;

            await client.query(
                `UPDATE public.companies
                 SET subscription_plan_id = $1,
                     plan_type = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [plan.id, plan.code, companyId]
            );
        }

        const agreementStartDate = start_date || new Date().toISOString().split('T')[0];

        if (resolvedAmount === null || resolvedAmount === undefined || resolvedAmount === '' || !agreementStartDate || !resolvedDescription) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Monto, fecha de inicio y descripcion son requeridos' });
        }

        const dueDayValue = Number(resolvedDueDay);
        if (dueDayValue < 1 || dueDayValue > 28) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El dia limite debe estar entre 1 y 28' });
        }

        if (replace_active !== false) {
            await client.query(
                `UPDATE public.payment_agreements
                 SET status = 'inactivo', updated_at = CURRENT_TIMESTAMP
                 WHERE company_id = $1 AND status = 'activo'`,
                [companyId]
            );
        }

        const result = await client.query(
            `INSERT INTO public.payment_agreements
             (company_id, amount, currency, frequency, start_date, due_day,
              service_description, grace_period_days, status, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'activo',$9)
             RETURNING *`,
            [
                companyId,
                Number(resolvedAmount),
                resolvedCurrency,
                resolvedFrequency,
                agreementStartDate,
                dueDayValue,
                resolvedDescription,
                Number(resolvedGrace) || 5,
                req.user.id
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create agreement error:', error);
        res.status(500).json({ error: 'Error al crear convenio' });
    } finally {
        client.release();
    }
};
// PUT /api/companies/:id/agreements/:aId
exports.updateAgreement = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId, aId } = req.params;
        const { amount, currency, frequency, due_day, service_description, grace_period_days, status } = req.body;

        const result = await db.query(
            `UPDATE public.payment_agreements SET
                amount              = COALESCE($1, amount),
                currency            = COALESCE($2, currency),
                frequency           = COALESCE($3, frequency),
                due_day             = COALESCE($4, due_day),
                service_description = COALESCE($5, service_description),
                grace_period_days   = COALESCE($6, grace_period_days),
                status              = COALESCE($7, status),
                updated_at          = CURRENT_TIMESTAMP
             WHERE id = $8 AND company_id = $9
             RETURNING *`,
            [amount, currency, frequency, due_day, service_description, grace_period_days, status, aId, companyId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Convenio no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update agreement error:', error);
        res.status(500).json({ error: 'Error al actualizar convenio' });
    }
};

// ── Generación automática de recibo desde convenio ───────────

// POST /api/companies/:id/agreements/:aId/generate-invoice
exports.generateInvoiceFromAgreement = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId, aId } = req.params;

        // Load agreement
        const agResult = await db.query(
            'SELECT * FROM public.payment_agreements WHERE id = $1 AND company_id = $2',
            [aId, companyId]
        );
        if (agResult.rows.length === 0) return res.status(404).json({ error: 'Convenio no encontrado' });
        const agreement = agResult.rows[0];

        if (agreement.status !== 'activo') {
            return res.status(400).json({ error: 'El convenio no está activo' });
        }

        // Find the last invoice for this agreement to calculate next period
        const lastInvoice = await db.query(
            `SELECT period_end FROM public.invoices
             WHERE agreement_id = $1 AND company_id = $2
             ORDER BY period_end DESC LIMIT 1`,
            [aId, companyId]
        );

        let periodStart;
        if (lastInvoice.rows.length > 0) {
            // Next period starts the day after the last period ended
            const lastEnd = new Date(lastInvoice.rows[0].period_end);
            lastEnd.setDate(lastEnd.getDate() + 1);
            periodStart = lastEnd;
        } else {
            periodStart = new Date(agreement.start_date);
        }

        // Calculate period_end based on frequency
        const periodEnd = new Date(periodStart);
        switch (agreement.frequency) {
            case 'monthly':   periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setDate(periodEnd.getDate() - 1); break;
            case 'quarterly': periodEnd.setMonth(periodEnd.getMonth() + 3); periodEnd.setDate(periodEnd.getDate() - 1); break;
            case 'yearly':    periodEnd.setFullYear(periodEnd.getFullYear() + 1); periodEnd.setDate(periodEnd.getDate() - 1); break;
            default:          periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setDate(periodEnd.getDate() - 1); break;
        }

        // Due date = period_end + grace_period_days
        const dueDate = new Date(periodEnd);
        dueDate.setDate(dueDate.getDate() + (agreement.grace_period_days || 5));

        const fmt = (d) => d.toISOString().split('T')[0];

        const result = await db.query(
            `INSERT INTO public.invoices
             (company_id, agreement_id, period_start, period_end, issue_date,
              due_date, amount, currency, service_detail, status, notes, created_by)
             VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,'emitido',$9,$10)
             RETURNING *`,
            [
                companyId, aId, fmt(periodStart), fmt(periodEnd), fmt(dueDate),
                agreement.amount, agreement.currency || 'CLP',
                JSON.stringify([{ description: agreement.service_description, amount: agreement.amount }]),
                `Generado automáticamente desde convenio #${aId}`,
                req.user.id
            ]
        );

        // Update company commercial status
        await db.query(
            `UPDATE public.companies SET commercial_status = 'pendiente_pago', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND commercial_status = 'activa'`,
            [companyId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Generate invoice from agreement error:', error);
        res.status(500).json({ error: 'Error al generar recibo desde convenio' });
    }
};

// ── Recibos / Facturas ────────────────────────────────────────

// GET /api/companies/:id/invoices
exports.getInvoices = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId } = req.params;
        const { status } = req.query;

        let query = `SELECT i.*, u.full_name AS created_by_name,
                            pa.frequency, pa.service_description AS agreement_description
                     FROM public.invoices i
                     LEFT JOIN public.users u ON i.created_by = u.id
                     LEFT JOIN public.payment_agreements pa ON i.agreement_id = pa.id
                     WHERE i.company_id = $1`;
        const params = [companyId];
        if (status) { params.push(status); query += ` AND i.status = $${params.length}`; }
        query += ' ORDER BY i.issue_date DESC, i.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'Error al obtener recibos' });
    }
};

// POST /api/companies/:id/invoices
exports.createInvoice = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId } = req.params;
        const { agreement_id, period_start, period_end, issue_date, due_date, amount, currency, service_detail, notes } = req.body;

        if (!period_start || !period_end || !due_date || !amount) {
            return res.status(400).json({ error: 'Período, fecha límite y monto son requeridos' });
        }

        const companyCheck = await db.query('SELECT id FROM public.companies WHERE id = $1', [companyId]);
        if (companyCheck.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });

        const result = await db.query(
            `INSERT INTO public.invoices
             (company_id, agreement_id, period_start, period_end, issue_date,
              due_date, amount, currency, service_detail, status, notes, created_by)
             VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,$7,$8,$9,'emitido',$10,$11)
             RETURNING *`,
            [companyId, agreement_id || null, period_start, period_end,
             issue_date, due_date, amount, currency || 'CLP',
             service_detail ? JSON.stringify(service_detail) : null,
             notes || null, req.user.id]
        );

        await db.query(
            `UPDATE public.companies SET commercial_status = 'pendiente_pago', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND commercial_status = 'activa'`,
            [companyId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: 'Error al crear recibo' });
    }
};

// PUT /api/companies/:id/invoices/:iId
exports.updateInvoiceStatus = async (req, res) => {
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId, iId } = req.params;
        const { status, notes } = req.body;

        const valid = ['emitido', 'pendiente', 'pagado', 'vencido', 'anulado'];
        if (status && !valid.includes(status)) {
            return res.status(400).json({ error: `Estado inválido. Valores: ${valid.join(', ')}` });
        }

        const result = await db.query(
            `UPDATE public.invoices SET
                status     = COALESCE($1, status),
                notes      = COALESCE($2, notes),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND company_id = $4
             RETURNING *`,
            [status, notes, iId, companyId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Recibo no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ error: 'Error al actualizar recibo' });
    }
};

// ── Pagos ─────────────────────────────────────────────────────

// POST /api/companies/:id/invoices/:iId/payment
exports.registerPayment = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId, iId } = req.params;
        const { amount, payment_date, payment_method, reference, period_billed, notes } = req.body;

        if (!amount) return res.status(400).json({ error: 'El monto es requerido' });

        await client.query('BEGIN');

        const invoiceRes = await client.query(
            'SELECT * FROM public.invoices WHERE id = $1 AND company_id = $2', [iId, companyId]
        );
        if (invoiceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recibo no encontrado' });
        }
        const invoice = invoiceRes.rows[0];

        const payDate = payment_date || new Date().toISOString().split('T')[0];

        const paymentResult = await client.query(
            `INSERT INTO public.payments_history
             (company_id, subscription_id, invoice_id, amount, currency,
              payment_date, payment_method, reference, period_billed, notes, registered_by)
             VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [companyId, iId, amount, invoice.currency || 'CLP',
             payDate, payment_method || null, reference || null,
             period_billed || invoice.period_start, notes || null, req.user.id]
        );

        await client.query(
            `UPDATE public.invoices SET status = 'pagado', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [iId]
        );

        const pendingCount = await client.query(
            `SELECT COUNT(*) FROM public.invoices
             WHERE company_id = $1 AND status IN ('emitido','pendiente','vencido')`,
            [companyId]
        );

        if (parseInt(pendingCount.rows[0].count) === 0) {
            await client.query(
                `UPDATE public.companies SET commercial_status = 'activa', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [companyId]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ payment: paymentResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Register payment error:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    } finally {
        client.release();
    }
};

// GET /api/companies/:id/payments
exports.getPaymentHistory = async (req, res) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Acceso denegado' });

        const { id: companyId } = req.params;

        const result = await db.query(
            `SELECT ph.*,
                    u.full_name AS registered_by_name,
                    i.period_start, i.period_end, i.due_date AS invoice_due_date
             FROM public.payments_history ph
             LEFT JOIN public.users u ON ph.registered_by = u.id
             LEFT JOIN public.invoices i ON ph.invoice_id = i.id
             WHERE ph.company_id = $1
             ORDER BY ph.payment_date DESC, ph.created_at DESC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Error al obtener historial de pagos' });
    }
};

