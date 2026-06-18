const db = require('../config/db');
const { grantBrowseAccessForTenants } = require('../utils/tenantBrowseAccess');

exports.grantBrowseAccess = async (req, res) => {
  if (!req.user?.is_super_admin) {
    return res.status(403).json({ error: 'Access denied. Super Admin only.' });
  }

  const client = await db.getClient();
  try {
    const result = await grantBrowseAccessForTenants(client);
    return res.json({
      message: result.roleExists
        ? 'Permisos de navegacion sincronizados.'
        : 'No se sincronizaron permisos porque el rol PostgreSQL no existe.',
      ...result,
    });
  } catch (error) {
    console.error('Grant browse access error:', error);
    return res.status(500).json({ error: 'Server error granting browse access' });
  } finally {
    client.release();
  }
};
