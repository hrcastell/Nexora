const db = require('../config/db');

const isSuperAdmin = (req) => req.user?.is_super_admin === true;

// GET /api/subscription-plans
// ?all=true  → devuelve todos los planes (para UI de administración)
// default    → devuelve solo planes activos (para dropdowns)
exports.getPlans = async (req, res) => {
  try {
    const showAll = req.query.all === 'true' && isSuperAdmin(req);
    const sql = showAll
      ? 'SELECT * FROM public.subscription_plans ORDER BY id ASC'
      : 'SELECT * FROM public.subscription_plans WHERE is_active = TRUE ORDER BY id ASC';
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ error: 'Error al obtener planes de suscripción' });
  }
};

// POST /api/subscription-plans
exports.createPlan = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ error: 'Solo el super administrador puede crear planes' });
    }

    const {
      code, name, description, amount, currency,
      payment_frequency, due_day, grace_period_days, discount, is_active
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Código y nombre son requeridos' });
    }
    const day = parseInt(due_day) || 1;
    if (day < 1 || day > 28) {
      return res.status(400).json({ error: 'El día límite de pago debe estar entre 1 y 28' });
    }

    const result = await db.query(
      `INSERT INTO public.subscription_plans
         (code, name, description, amount, currency, payment_frequency,
          due_day, grace_period_days, discount, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        code.toLowerCase().trim(),
        name.trim(),
        description || null,
        parseFloat(amount) || 0,
        currency || 'CLP',
        payment_frequency || 'monthly',
        day,
        parseInt(grace_period_days) ?? 5,
        parseFloat(discount) || 0,
        is_active !== false
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un plan con ese código' });
    }
    console.error('Create subscription plan error:', error);
    res.status(500).json({ error: 'Error al crear plan de suscripción' });
  }
};

// PUT /api/subscription-plans/:id
exports.updatePlan = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const {
      name, description, amount, currency,
      payment_frequency, due_day, grace_period_days, discount, is_active
    } = req.body;

    if (due_day !== undefined) {
      const day = parseInt(due_day);
      if (day < 1 || day > 28) {
        return res.status(400).json({ error: 'El día límite de pago debe estar entre 1 y 28' });
      }
    }

    const result = await db.query(
      `UPDATE public.subscription_plans SET
         name              = COALESCE($1, name),
         description       = COALESCE($2, description),
         amount            = COALESCE($3, amount),
         currency          = COALESCE($4, currency),
         payment_frequency = COALESCE($5, payment_frequency),
         due_day           = COALESCE($6, due_day),
         grace_period_days = COALESCE($7, grace_period_days),
         discount          = COALESCE($8, discount),
         is_active         = COALESCE($9, is_active),
         updated_at        = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        name || null,
        description !== undefined ? description : null,
        amount !== undefined ? parseFloat(amount) : null,
        currency || null,
        payment_frequency || null,
        due_day !== undefined ? parseInt(due_day) : null,
        grace_period_days !== undefined ? parseInt(grace_period_days) : null,
        discount !== undefined ? parseFloat(discount) : null,
        is_active !== undefined ? is_active : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({ error: 'Error al actualizar plan de suscripción' });
  }
};

// DELETE /api/subscription-plans/:id
exports.deletePlan = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;

    const usageCheck = await db.query(
      'SELECT COUNT(*) FROM public.companies WHERE subscription_plan_id = $1',
      [id]
    );
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar este plan porque hay empresas que lo usan. Cambia su plan primero.'
      });
    }

    const result = await db.query(
      'DELETE FROM public.subscription_plans WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({ error: 'Error al eliminar plan de suscripción' });
  }
};
