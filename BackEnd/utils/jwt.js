const jwt = require('jsonwebtoken');

exports.generateToken = (user, companyId = null, schemaName = null, extra = {}) => {
  return jwt.sign(
    {
      id:             user.id,
      email:          user.email,
      is_super_admin: user.is_super_admin,
      is_system_user: user.is_system_user || false,
      role:           user.role || (user.is_super_admin ? 'super_admin' : 'inner_user'),
      status:         user.status || 'activo',
      company_id:     companyId,
      schema_name:    schemaName,
      read_only:      extra.read_only || false,
      commercial_status: extra.commercial_status || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};
