const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/catalogController');

router.use(auth);

router.get('/modules',             ctrl.getCatalogModules);
router.get('/modules/:id',         ctrl.getCatalogModuleById);
router.put('/modules/:id',         ctrl.updateCatalogModule);
router.get('/transactions',        ctrl.getCatalogTransactions);
router.put('/transactions/reorder', ctrl.reorderCatalogTransactions); // MUST precede /transactions/:id
router.put('/transactions/:id',    ctrl.updateCatalogTransaction);

module.exports = router;
