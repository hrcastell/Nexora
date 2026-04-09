const express = require('express');
const router  = express.Router({ mergeParams: true });
const auth    = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/commercialController');

router.use(auth);

router.patch('/commercial-status',             ctrl.changeCommercialStatus);
router.get('/agreements',                      ctrl.getAgreements);
router.post('/agreements',                     ctrl.createAgreement);
router.put('/agreements/:aId',                 ctrl.updateAgreement);
router.post('/agreements/:aId/generate-invoice', ctrl.generateInvoiceFromAgreement);
router.get('/invoices',                        ctrl.getInvoices);
router.post('/invoices',                       ctrl.createInvoice);
router.put('/invoices/:iId',                   ctrl.updateInvoiceStatus);
router.post('/invoices/:iId/payment',          ctrl.registerPayment);
router.get('/payments',                        ctrl.getPaymentHistory);

module.exports = router;
