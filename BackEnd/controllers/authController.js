const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

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

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
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
    // Verify user belongs to company
    const result = await db.query(
      `SELECT c.id, c.name, c.schema_name 
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

    const cs     = companyFull.rows[0]?.commercial_status || 'activa';
    const uFull  = userFull.rows[0] || {};
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
