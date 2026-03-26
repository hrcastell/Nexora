const jwt = require('jsonwebtoken');

exports.generateToken = (user, companyId = null, schemaName = null) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_super_admin: user.is_super_admin,
      company_id: companyId,
      schema_name: schemaName
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};
