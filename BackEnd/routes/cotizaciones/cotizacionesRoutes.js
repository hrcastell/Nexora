const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const quotesCtrl = require('../../controllers/cotizaciones/quotesController');

// Cotizaciones — standalone module (spec: Cotizaciones Module domain;
// design §1 ADR-6). Mounted at /api/cotizaciones (see app.js). Path shapes
// below match routeModuleMap.js's `cotizaciones` entries exactly so the
// module guard engages (transaction: 'quotes').
router.use(authMiddleware);

router.get('/quotes', quotesCtrl.list);
router.post('/quotes', quotesCtrl.create);
router.get('/quotes/:id', quotesCtrl.getById);
router.put('/quotes/:id', quotesCtrl.update);
router.get('/quotes/:id/print', quotesCtrl.getPrintData);

router.post('/quotes/:id/lines', quotesCtrl.addLine);
router.put('/quotes/:id/lines/:lineId', quotesCtrl.updateLine);
router.delete('/quotes/:id/lines/:lineId', quotesCtrl.deleteLine);

router.post('/quotes/:id/send', quotesCtrl.send);
router.post('/quotes/:id/accept', quotesCtrl.accept);
router.post('/quotes/:id/reject', quotesCtrl.reject);
router.post('/quotes/:id/draft', quotesCtrl.revertToDraft);
router.post('/quotes/:id/expire', quotesCtrl.expire);

module.exports = router;
