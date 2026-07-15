const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const counterpartiesCtrl = require('../../controllers/treasury/counterpartiesController');
const paymentTermsCtrl = require('../../controllers/treasury/paymentTermsController');
const cashRegistersCtrl = require('../../controllers/treasury/cashRegistersController');
const cashSessionsCtrl = require('../../controllers/treasury/cashSessionsController');

router.use(authMiddleware);

function mountCatalog(path, controller) {
    router.get(path, controller.list);
    router.post(path, controller.create);
    router.get(`${path}/:id`, controller.getById);
    router.put(`${path}/:id`, controller.update);
    router.patch(`${path}/:id/status`, controller.toggleStatus);
}

mountCatalog('/counterparties', counterpartiesCtrl);
mountCatalog('/payment-terms', paymentTermsCtrl);
mountCatalog('/cash-registers', cashRegistersCtrl);

router.get('/cash-sessions', cashSessionsCtrl.list);
router.post('/cash-sessions/open', cashSessionsCtrl.open);
router.post('/cash-sessions/movements', cashSessionsCtrl.recordMovement);
router.post('/cash-sessions/:id/close', cashSessionsCtrl.close);
router.get('/cash-sessions/:id', cashSessionsCtrl.getById);

module.exports = router;
