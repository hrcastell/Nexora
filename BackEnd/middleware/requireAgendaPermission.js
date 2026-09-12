const requirePermission = require('./requirePermission');
const { isModuleActive } = require('../utils/moduleState');

// Agenda access is always enforced, even when the global module guard is log-only.
// Mount after authMiddleware so roles and read_only reflect the current user.
module.exports = function requireAgendaPermission(moduleCode, transactionCode, flag = 'can_view') {
    const checks = [async (req, res, next) => {
        if (req.user?.read_only && req.method !== 'GET') {
            return res.status(403).json({ error: 'Acceso de solo lectura' });
        }
        if (req.user?.is_super_admin === true) return next();
        const companyId = req.user?.company_id;
        if (!companyId || !/^[a-z_][a-z0-9_]*$/i.test(req.user?.schema_name || '')) {
            return res.status(403).json({ error: 'Sin contexto de empresa' });
        }
        if (req.params.companyId && Number(req.params.companyId) !== Number(companyId)) {
            return res.status(403).json({ error: 'Sin acceso a esta empresa' });
        }
        try {
            if (!await isModuleActive(companyId, moduleCode)) {
                return res.status(403).json({ error: 'Módulo no habilitado para esta compañía', module: moduleCode });
            }
            return next();
        } catch (error) {
            console.error('[agenda-permissions] error:', error.message);
            return res.status(500).json({ error: 'Error al validar acceso a la agenda' });
        }
    }, requirePermission(transactionCode, 'can_view')];
    if (flag !== 'can_view') checks.push(requirePermission(transactionCode, flag));
    return checks;
};
