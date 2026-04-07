const jwt = require('jsonwebtoken');
const db  = require('../config/db');

module.exports = async function(req, res, next) {
  if (req.method === 'OPTIONS') return next();

  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  // ── 1. Verificar firma del JWT (errores aquí = 401) ────────────
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Por favor inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.user = decoded;

  // ── 2. Consultas DB de validación (errores aquí = 500) ─────────
  try {
    const userRes = await db.query(
      'SELECT status, is_system_user, role FROM public.users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const user = userRes.rows[0];

    if (user.status === 'bloqueado' && !user.is_system_user) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
    }

    req.user.status         = user.status;
    req.user.role           = user.role || decoded.role;
    req.user.is_system_user = user.is_system_user;
    req.user.read_only      = user.status === 'suspendido';

    if (decoded.company_id && !user.is_system_user) {
      const companyRes = await db.query(
        'SELECT commercial_status FROM public.companies WHERE id = $1',
        [decoded.company_id]
      );

      if (companyRes.rows.length > 0) {
        const cs = companyRes.rows[0].commercial_status;
        req.user.commercial_status = cs;

        if (cs === 'bloqueada') {
          return res.status(403).json({
            error: 'El acceso a esta empresa está bloqueado por estado comercial. Contacta al administrador del sistema.',
            commercial_status: cs
          });
        }
        if (cs === 'suspendida') {
          req.user.read_only = true;
        }
      }
    }

    next();
  } catch (err) {
    console.error('Auth middleware DB error:', err.message);
    res.status(500).json({ error: 'Error de servidor durante la autenticación' });
  }
};
