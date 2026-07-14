const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const suppliersCtrl = require('../../controllers/inventory/suppliersController');
const warehousesCtrl = require('../../controllers/inventory/warehousesController');
const purchaseDocumentsCtrl = require('../../controllers/inventory/purchaseDocumentsController');
const stockReceiptsCtrl = require('../../controllers/inventory/stockReceiptsController');
const stockCtrl = require('../../controllers/inventory/stockController');

router.use(authMiddleware);

router.get('/suppliers', suppliersCtrl.list);
router.post('/suppliers', suppliersCtrl.create);
router.get('/suppliers/:id', suppliersCtrl.getById);
router.put('/suppliers/:id', suppliersCtrl.update);
router.patch('/suppliers/:id/status', suppliersCtrl.toggleStatus);

router.get('/warehouses', warehousesCtrl.list);
router.post('/warehouses', warehousesCtrl.create);
router.get('/warehouses/:id', warehousesCtrl.getById);
router.put('/warehouses/:id', warehousesCtrl.update);
router.patch('/warehouses/:id/status', warehousesCtrl.toggleStatus);

router.get('/purchase-documents', purchaseDocumentsCtrl.list);
router.post('/purchase-documents', purchaseDocumentsCtrl.create);
router.get('/purchase-documents/:id', purchaseDocumentsCtrl.getById);
router.put('/purchase-documents/:id', purchaseDocumentsCtrl.update);
router.patch('/purchase-documents/:id/status', purchaseDocumentsCtrl.changeStatus);
router.get('/stock-receipts', stockReceiptsCtrl.list); router.post('/stock-receipts', stockReceiptsCtrl.create); router.get('/stock-receipts/:id', stockReceiptsCtrl.getById); router.post('/stock-receipts/:id/confirm', stockReceiptsCtrl.confirm);
router.get('/stock-by-product', stockCtrl.getStockByProduct); router.get('/stock-by-warehouse', stockCtrl.getStockByWarehouse);

module.exports = router;
