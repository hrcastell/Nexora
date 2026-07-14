const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const counterpartiesCtrl = require('../../controllers/treasury/counterpartiesController');
const paymentTermsCtrl = require('../../controllers/treasury/paymentTermsController');
const cashRegistersCtrl = require('../../controllers/treasury/cashRegistersController');

const router = express.Router({ mergeParams: true });
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

module.exports = router;
