const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const departmentsCtrl = require('../../controllers/hr/departmentsController');
const positionsCtrl = require('../../controllers/hr/positionsController');
const costCentersCtrl = require('../../controllers/hr/costCentersController');
const workShiftsCtrl = require('../../controllers/hr/workShiftsController');
const employeesCtrl = require('../../controllers/hr/employeesController');
const requestsCtrl = require('../../controllers/hr/requestsController');

router.use(authMiddleware);

function mountCatalog(path, controller) {
    router.get(path, controller.list);
    router.post(path, controller.create);
    router.get(`${path}/:id`, controller.getById);
    router.put(`${path}/:id`, controller.update);
    router.patch(`${path}/:id/status`, controller.toggleStatus);
}

mountCatalog('/departments', departmentsCtrl);
mountCatalog('/positions', positionsCtrl);
mountCatalog('/cost-centers', costCentersCtrl);
mountCatalog('/work-shifts', workShiftsCtrl);

router.get('/employees', employeesCtrl.list);
router.get('/employees/:id', employeesCtrl.getById);
router.put('/employees/:id', employeesCtrl.update);

router.get('/requests', requestsCtrl.list);
router.post('/requests', requestsCtrl.create);
router.get('/requests/:id', requestsCtrl.getById);
router.post('/requests/:id/approve', requestsCtrl.approve);
router.post('/requests/:id/reject', requestsCtrl.reject);
router.post('/requests/:id/annul', requestsCtrl.annul);

module.exports = router;
