const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const suppliersCtrl = require('../../controllers/inventory/suppliersController');
const warehousesCtrl = require('../../controllers/inventory/warehousesController');

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

module.exports = router;
