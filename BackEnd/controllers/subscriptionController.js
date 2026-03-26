const db = require('../config/db');

exports.getSubscriptionByCompany = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const { companyId } = req.params;
        
        const result = await db.query(
            'SELECT * FROM public.subscriptions WHERE company_id = $1 ORDER BY created_at DESC',
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const { 
            company_id, 
            status, 
            start_date, 
            end_date, 
            amount, 
            payment_frequency, 
            next_payment_date,
            notes 
        } = req.body;

        const result = await db.query(
            `INSERT INTO public.subscriptions 
            (company_id, status, start_date, end_date, amount, payment_frequency, next_payment_date, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [company_id, status || 'active', start_date, end_date, amount, payment_frequency || 'monthly', next_payment_date, notes]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateSubscription = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const { id } = req.params;
        const { 
            status, 
            end_date, 
            amount, 
            last_payment_date, 
            next_payment_date,
            notes 
        } = req.body;

        const result = await db.query(
            `UPDATE public.subscriptions 
             SET status = COALESCE($1, status), 
                 end_date = COALESCE($2, end_date),
                 amount = COALESCE($3, amount),
                 last_payment_date = COALESCE($4, last_payment_date),
                 next_payment_date = COALESCE($5, next_payment_date),
                 notes = COALESCE($6, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [status, end_date, amount, last_payment_date, next_payment_date, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Also useful: Get payments history or register a payment event
// For now, the table 'subscriptions' seems to hold the current state, 
// but usually we'd have a separate 'payments' table for history.
// The prompt asked for "Ventana de Pago" which implies managing payments.
// I'll add a simple payment registration that updates the subscription state.

exports.registerPayment = async (req, res) => {
     try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const { id } = req.params; // Subscription ID
        const { amount, payment_date, next_due_date, notes } = req.body;

        // In a real system, insert into a 'payments_history' table here.
        // For this schema, we just update the subscription record.
        
        const result = await db.query(
            `UPDATE public.subscriptions 
             SET last_payment_date = $1,
                 next_payment_date = $2,
                 status = 'active',
                 notes = COALESCE($3, '') || ' | Payment registered: ' || $1::text
             WHERE id = $4
             RETURNING *`,
            [payment_date || new Date(), next_due_date, notes, id]
        );

         if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(result.rows[0]);

     } catch (error) {
        console.error('Register payment error:', error);
        res.status(500).json({ error: 'Server error' });
     }
}
