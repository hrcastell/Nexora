const crypto = require('crypto');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/mailer');

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 30;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Find user in public.users
    const result = await db.query(
      `SELECT * FROM public.users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (user.status === 'bloqueado' && !user.is_system_user) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Demasiados intentos fallidos. Probá de nuevo en ${minutesLeft} minuto${minutesLeft === 1 ? '' : 's'}.` });
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const attemptsResult = await db.query(
        `UPDATE public.users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE
               WHEN failed_login_attempts + 1 >= $1 THEN CURRENT_TIMESTAMP + ($2 || ' minutes')::interval
               ELSE locked_until
             END
         WHERE id = $3
         RETURNING failed_login_attempts, locked_until`,
        [MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES, user.id]
      );
      const { locked_until: newLockedUntil } = attemptsResult.rows[0];
      if (newLockedUntil && new Date(newLockedUntil) > new Date()) {
        return res.status(429).json({ error: `Demasiados intentos fallidos. Probá de nuevo en ${LOCKOUT_MINUTES} minutos.` });
      }
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Successful password check: clear any accumulated lockout state
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await db.query(
        'UPDATE public.users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [user.id]
      );
    }

    // 3. Get User Companies with commercial_status
    const companiesResult = await db.query(
      `SELECT c.id, c.name, c.schema_name, c.commercial_status,
              cu.is_company_admin
       FROM public.companies c
       JOIN public.company_users cu ON c.id = cu.company_id
       WHERE cu.user_id = $1 AND c.is_active = TRUE`,
      [user.id]
    );

    const companies = companiesResult.rows;

    // Update last_login_at
    await db.query(
      'UPDATE public.users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const preAuthToken = generateToken(user);

    res.json({
      message: 'Login exitoso',
      user: {
        id:             user.id,
        email:          user.email,
        full_name:      user.full_name,
        first_name:     user.first_name,
        last_name:      user.last_name,
        avatar_url:     user.avatar_url,
        role:           user.role,
        status:         user.status,
        is_super_admin: user.is_super_admin,
        is_system_user: user.is_system_user
      },
      companies,
      token: preAuthToken
    });

  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error during login', detail: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

exports.selectCompany = async (req, res) => {
  const { companyId } = req.body;
  const userId = req.user.id; // From middleware

  try {
    // Verify user belongs to company — super_admin can operate in any
    // company regardless of company_users membership (mirrors the same
    // bypass already used in companyController.getAllCompanies).
    const result = req.user.is_super_admin
      ? await db.query(
          `SELECT c.id, c.name, c.schema_name, c.is_master
           FROM public.companies c
           WHERE c.id = $1`,
          [companyId]
        )
      : await db.query(
          `SELECT c.id, c.name, c.schema_name, c.is_master
           FROM public.companies c
           JOIN public.company_users cu ON c.id = cu.company_id
           WHERE c.id = $1 AND cu.user_id = $2`,
          [companyId, userId]
        );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access to this company denied' });
    }

    const company = result.rows[0];
    const userResult = await db.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Get company commercial_status and user status for the token extra payload
    const companyFull = await db.query(
      'SELECT commercial_status FROM public.companies WHERE id = $1', [company.id]
    );
    const userFull = await db.query(
      'SELECT status, is_system_user, role FROM public.users WHERE id = $1', [userId]
    );

    let cs     = companyFull.rows[0]?.commercial_status || 'activa';
    const uFull  = userFull.rows[0] || {};

    // Auto-bloqueo por morosidad (solo para empresas no maestras)
    if (!company.is_master) {
      const overdueRes = await db.query(
        `SELECT (CURRENT_DATE - due_date)::integer AS days_overdue
         FROM public.invoices
         WHERE company_id = $1
           AND status IN ('emitido', 'pendiente')
           AND due_date < CURRENT_DATE
         ORDER BY days_overdue DESC
         LIMIT 1`,
        [company.id]
      );
      if (overdueRes.rows.length > 0) {
        const daysOverdue = overdueRes.rows[0].days_overdue;
        const graceRes = await db.query(
          `SELECT COALESCE(
             (SELECT grace_period_days FROM public.payment_agreements
              WHERE company_id = $1 AND status = 'activo'
              ORDER BY created_at DESC LIMIT 1),
             (SELECT grace_period_days FROM public.companies WHERE id = $1)
           ) AS grace_period_days`,
          [company.id]
        );
        const graceDays = parseInt(graceRes.rows[0]?.grace_period_days) || 5;
        const newStatus = daysOverdue > graceDays ? 'bloqueada' : 'pendiente_pago';
        if (cs !== newStatus) {
          await db.query(
            'UPDATE public.companies SET commercial_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newStatus, company.id]
          );
          cs = newStatus;
        }
      }
    }

    const readOnly = uFull.status === 'suspendido' || cs === 'suspendida';

    if (cs === 'bloqueada' && !uFull.is_system_user) {
      return res.status(403).json({
        error: 'Esta empresa tiene acceso bloqueado por estado comercial.',
        commercial_status: cs
      });
    }

    const token = generateToken(
      { ...user, role: uFull.role, status: uFull.status, is_system_user: uFull.is_system_user },
      company.id,
      company.schema_name,
      { read_only: readOnly, commercial_status: cs }
    );

    res.json({
      message: 'Empresa seleccionada',
      company: { ...company, commercial_status: cs },
      token,
      read_only: readOnly
    });

  } catch (error) {
    console.error('Select company error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error selecting company' });
  }
};

exports.getVisualConfig = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT visual_config FROM public.users WHERE id = $1',
            [req.user.id]
        );
        const config = result.rows[0]?.visual_config ?? null;
        res.json(config ?? {});
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración visual' });
    }
};

exports.updateVisualConfig = async (req, res) => {
    try {
        const payload = (req.body && typeof req.body === 'object') ? req.body : {};
        await db.query(
            'UPDATE public.users SET visual_config = $1::jsonb WHERE id = $2',
            [JSON.stringify(payload), req.user.id]
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('updateVisualConfig error:', error.message);
        res.status(500).json({ error: 'Error al guardar configuración visual' });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Invalid token context' });
        }
        const userId = req.user.id;
        const userResult = await db.query('SELECT id, email, full_name, is_super_admin FROM public.users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const u = userResult.rows[0];
        res.json({
          user: u,
          context: {
            company_id:        req.user.company_id,
            schema:            req.user.schema_name,
            read_only:         req.user.read_only || false,
            commercial_status: req.user.commercial_status || null
          }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
}

const GENERIC_FORGOT_PASSWORD_MESSAGE = 'Si el correo existe en el sistema, te enviamos instrucciones para recuperar tu contraseña.';

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await db.query(
      `SELECT id, email, full_name, is_active, password_reset_last_sent_at
       FROM public.users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    const lastSent = user.password_reset_last_sent_at;
    if (lastSent && (Date.now() - new Date(lastSent).getTime()) < PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000) {
      return res.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    await db.query(
      `UPDATE public.users
       SET password_reset_token_hash  = $1,
           password_reset_expires     = CURRENT_TIMESTAMP + ($2 || ' minutes')::interval,
           password_reset_last_sent_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [tokenHash, PASSWORD_RESET_TOKEN_TTL_MINUTES, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink, user.full_name);
    } catch (mailError) {
      console.error('forgotPassword: failed to send reset email:', mailError.message);
    }

    res.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    console.error('forgotPassword error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error during password recovery' });
  }
};

// POST /api/auth/change-password — self-service, requires an authenticated
// session and the current password as proof of identity. Works for ANY
// user including is_system_user, unlike the admin usersController path
// (which explicitly refuses to touch the system/root account).
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const result = await db.query('SELECT password_hash FROM public.users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE public.users
       SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [newHash, req.user.id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('changePassword error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error changing password' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const result = await db.query(
      `SELECT id FROM public.users
       WHERE email = $1
         AND password_reset_token_hash = $2
         AND password_reset_expires > CURRENT_TIMESTAMP`,
      [email, tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'El link de recuperación es inválido o expiró. Solicitá uno nuevo.' });
    }

    const user = result.rows[0];
    const newHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE public.users
       SET password_hash = $1,
           password_reset_token_hash   = NULL,
           password_reset_expires      = NULL,
           password_reset_last_sent_at = NULL,
           failed_login_attempts       = 0,
           locked_until                = NULL
       WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error('resetPassword error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error during password reset' });
  }
};

