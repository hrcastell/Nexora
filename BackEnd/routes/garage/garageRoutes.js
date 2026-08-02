const express      = require('express');
const router       = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const { resolveSchema } = require('../../utils/tenantResolver');

const catalogsCtrl         = require('../../controllers/garage/catalogsController');
const customersCtrl        = require('../../controllers/garage/customersController');
const vehiclesCtrl         = require('../../controllers/garage/vehiclesController');
const employeesCtrl        = require('../../controllers/garage/employeesController');
const laborRatesCtrl       = require('../../controllers/garage/laborRatesController');
const productsCtrl         = require('../../controllers/garage/productsController');
const serviceTemplatesCtrl = require('../../controllers/garage/serviceTemplatesController');
const appointmentsCtrl     = require('../../controllers/garage/appointmentsController');
const workOrdersCtrl       = require('../../controllers/garage/workOrdersController');
const workOrderServicesCtrl  = require('../../controllers/garage/workOrderServicesController');
const workOrderPaymentsCtrl  = require('../../controllers/garage/workOrderPaymentsController');
const vehicleHistoryCtrl     = require('../../controllers/garage/vehicleHistoryController');

// All garage routes require authentication
router.use(authMiddleware);

/**
 * Middleware: inyecta req.garageSchema para que makeGarageUpload pueda
 * construir la carpeta de destino de archivos correctamente.
 * Se ejecuta antes de las rutas que suben archivos.
 */
async function injectGarageSchema(req, res, next) {
    try {
        const { schema } = await resolveSchema(req);
        req.garageSchema = schema;
        next();
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message || 'Error resolviendo schema del tenant' });
    }
}

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const db = require('../../config/db');

        const [orders, appointments, customers, vehicles] = await Promise.all([
            db.query(
                `SELECT status, COUNT(*) AS count FROM ${schema}.work_orders
                 WHERE status NOT IN ('delivered','cancelled')
                 GROUP BY status`,
                []
            ),
            db.query(
                `SELECT COUNT(*) AS count FROM ${schema}.appointments
                 WHERE scheduled_start >= CURRENT_DATE
                   AND scheduled_start < CURRENT_DATE + INTERVAL '1 day'
                   AND status NOT IN ('cancelled','no_show','converted_to_work_order')`,
                []
            ),
            db.query(`SELECT COUNT(*) AS count FROM ${schema}.customers WHERE status = 'active'`, []),
            db.query(`SELECT COUNT(*) AS count FROM ${schema}.vehicles WHERE status = 'active'`, [])
        ]);

        const ordersByStatus = {};
        for (const row of orders.rows) ordersByStatus[row.status] = parseInt(row.count);

        res.json({
            orders_open:       (ordersByStatus['received'] || 0) + (ordersByStatus['draft'] || 0),
            orders_diagnosis:  ordersByStatus['diagnosis'] || 0,
            orders_in_progress: ordersByStatus['in_progress'] || 0,
            orders_waiting_parts: ordersByStatus['waiting_parts'] || 0,
            orders_completed:  ordersByStatus['completed'] || 0,
            appointments_today: parseInt(appointments.rows[0].count),
            active_customers:  parseInt(customers.rows[0].count),
            active_vehicles:   parseInt(vehicles.rows[0].count)
        });
    } catch (err) {
        console.error('garage/dashboard error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener dashboard' });
    }
});

// ─── CATÁLOGOS ────────────────────────────────────────────────
router.get('/catalogs/:type',             catalogsCtrl.list);
router.post('/catalogs/:type',            catalogsCtrl.create);
router.put('/catalogs/:type/:id',         catalogsCtrl.update);
router.patch('/catalogs/:type/:id/status', catalogsCtrl.toggleStatus);

// ─── CLIENTES ─────────────────────────────────────────────────
router.get('/customers',                customersCtrl.list);
router.post('/customers',               customersCtrl.create);
router.get('/customers/:id',            customersCtrl.getById);
router.put('/customers/:id',            customersCtrl.update);
router.patch('/customers/:id/status',   customersCtrl.toggleStatus);
router.post('/customers/:id/photo',     injectGarageSchema, ...customersCtrl.uploadPhoto);
router.delete('/customers/:id/photo',   customersCtrl.deletePhoto);
router.get('/customers/:customerId/vehicles', vehiclesCtrl.listByCustomer);

// ─── VEHÍCULOS ────────────────────────────────────────────────
router.get('/vehicles',                         vehiclesCtrl.list);
router.post('/vehicles',                        vehiclesCtrl.create);
router.get('/vehicles/:id',                     vehiclesCtrl.getById);
router.put('/vehicles/:id',                     vehiclesCtrl.update);
router.patch('/vehicles/:id/status',            vehiclesCtrl.toggleStatus);
router.get('/vehicles/:id/history',             vehicleHistoryCtrl.getVehicleHistory);
router.get('/vehicles/:id/photos',              vehiclesCtrl.listPhotos);
router.post('/vehicles/:id/photos',             injectGarageSchema, ...vehiclesCtrl.uploadPhoto);
router.delete('/vehicles/:id/photos/:photoId',  vehiclesCtrl.deletePhoto);

// ─── EMPLEADOS ────────────────────────────────────────────────
router.get('/employees',                employeesCtrl.list);
router.post('/employees',               employeesCtrl.create);
router.get('/employees/:id',            employeesCtrl.getById);
router.put('/employees/:id',            employeesCtrl.update);
router.patch('/employees/:id/status',   employeesCtrl.toggleStatus);
router.post('/employees/:id/photo',     injectGarageSchema, ...employeesCtrl.uploadPhoto);
router.delete('/employees/:id/photo',   employeesCtrl.deletePhoto);
router.get('/employees/:employeeId/labor-rates', laborRatesCtrl.listByEmployee);

// ─── TARIFAS ──────────────────────────────────────────────────
router.get('/labor-rates',              laborRatesCtrl.list);
router.post('/labor-rates',             laborRatesCtrl.create);
router.get('/labor-rates/:id',          laborRatesCtrl.getById);
router.put('/labor-rates/:id',          laborRatesCtrl.update);
router.patch('/labor-rates/:id/status', laborRatesCtrl.toggleStatus);

// ─── PRODUCTOS ────────────────────────────────────────────────
router.get('/products',              productsCtrl.list);
router.post('/products',             productsCtrl.create);
router.get('/products/:id',          productsCtrl.getById);
router.put('/products/:id',          productsCtrl.update);
router.patch('/products/:id/status', productsCtrl.toggleStatus);
router.delete('/products/:id', productsCtrl.remove);

// ─── SERVICIOS CONFIGURABLES ──────────────────────────────────
router.get('/service-templates',                           serviceTemplatesCtrl.list);
router.post('/service-templates',                          serviceTemplatesCtrl.create);
router.get('/service-templates/:id',                       serviceTemplatesCtrl.getById);
router.put('/service-templates/:id',                       serviceTemplatesCtrl.update);
router.patch('/service-templates/:id/status',              serviceTemplatesCtrl.toggleStatus);
router.post('/service-templates/:id/products',             serviceTemplatesCtrl.addProduct);
router.delete('/service-templates/:id/products/:productId', serviceTemplatesCtrl.removeProduct);

// ─── CITAS ────────────────────────────────────────────────────
router.get('/appointments',                              appointmentsCtrl.list);
router.post('/appointments',                             appointmentsCtrl.create);
router.get('/appointments/:id',                          appointmentsCtrl.getById);
router.put('/appointments/:id',                          appointmentsCtrl.update);
router.post('/appointments/:id/confirm',                 appointmentsCtrl.confirm);
router.post('/appointments/:id/mark-arrived',            appointmentsCtrl.markArrived);
router.post('/appointments/:id/cancel',                  appointmentsCtrl.cancel);
router.post('/appointments/:id/reschedule',              appointmentsCtrl.reschedule);
router.post('/appointments/:id/convert-to-work-order',   appointmentsCtrl.convertToWorkOrder);

// ─── ÓRDENES DE TRABAJO ───────────────────────────────────────
router.get('/work-orders',                  workOrdersCtrl.list);
router.post('/work-orders',                 workOrdersCtrl.create);
router.get('/work-orders/:id',              workOrdersCtrl.getById);
router.get('/work-orders/:id/print',        workOrdersCtrl.getPrintData);
router.put('/work-orders/:id',              workOrdersCtrl.update);
router.patch('/work-orders/:id/status',     workOrdersCtrl.changeStatus);
router.patch('/work-orders/:id/assign',     workOrdersCtrl.assign);
router.post('/work-orders/:id/recalculate', workOrdersCtrl.recalculate);
router.post('/work-orders/:id/close',       workOrdersCtrl.close);
router.post('/work-orders/:id/cancel',      workOrdersCtrl.cancel);

// ─── SERVICIOS DE ORDEN ───────────────────────────────────────
router.get('/work-orders/:id/services',                                    workOrderServicesCtrl.list);
router.post('/work-orders/:id/services',                                   workOrderServicesCtrl.create);
router.get('/work-orders/:id/services/:serviceId',                         workOrderServicesCtrl.getById);
router.put('/work-orders/:id/services/:serviceId',                         workOrderServicesCtrl.update);
router.delete('/work-orders/:id/services/:serviceId',                      workOrderServicesCtrl.remove);
router.patch('/work-orders/:id/services/:serviceId/status',                workOrderServicesCtrl.changeStatus);
router.post('/work-orders/:id/services/:serviceId/products',               workOrderServicesCtrl.addProduct);
router.delete('/work-orders/:id/services/:serviceId/products/:productLineId', workOrderServicesCtrl.removeProduct);

// ─── FOTOS DE ORDEN ──────────────────────────────────────────
router.get('/work-orders/:id/photos',               workOrdersCtrl.listPhotos);
router.post('/work-orders/:id/photos',              injectGarageSchema, ...workOrdersCtrl.uploadPhoto);
router.delete('/work-orders/:id/photos/:photoId',   workOrdersCtrl.deletePhoto);

// ─── PAGOS DE ORDEN ───────────────────────────────────────────
router.get('/work-orders/:id/payments',              workOrderPaymentsCtrl.list);
router.post('/work-orders/:id/payments',             workOrderPaymentsCtrl.create);
router.delete('/work-orders/:id/payments/:paymentId', workOrderPaymentsCtrl.remove);

module.exports = router;
