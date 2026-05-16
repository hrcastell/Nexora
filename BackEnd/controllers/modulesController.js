/**
 * modulesController.js — DEPRECATED
 *
 * Este controlador operaba sobre la tabla {schema}.modules del tenant,
 * que era un duplicado local del catálogo global de módulos.
 *
 * ARQUITECTURA ACTUAL:
 *   - El catálogo global vive en public.module_catalog + public.module_transactions
 *   - La asignación empresa↔módulo vive en public.company_modules
 *   - El gestor correcto es companyModulesController.js + catalogController.js
 *   - La vista correcta es ModulesManagerView.vue (ruta /admin/modules)
 *
 * Todos los endpoints de este controlador retornan 410 Gone para evitar
 * confusión. La tabla {schema}.modules fue deprecada junto con este controlador.
 */

const GONE_RESPONSE = {
    error:   'Endpoint deprecado',
    message: 'Los módulos se gestionan a través del catálogo global. Usa /api/companies/:id/modules o /api/catalog/modules.',
    migration: 'Ver companyModulesController.js y catalogController.js'
};

exports.getModules       = (_req, res) => res.status(410).json(GONE_RESPONSE);
exports.getModuleById    = (_req, res) => res.status(410).json(GONE_RESPONSE);
exports.createModule     = (_req, res) => res.status(410).json(GONE_RESPONSE);
exports.updateModule     = (_req, res) => res.status(410).json(GONE_RESPONSE);
exports.changeModuleStatus = (_req, res) => res.status(410).json(GONE_RESPONSE);
exports.deleteModule     = (_req, res) => res.status(410).json(GONE_RESPONSE);
