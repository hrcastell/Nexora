const express       = require('express');
const router        = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');

const dashboardCtrl    = require('../../controllers/dental/dashboardController');
const patientsCtrl     = require('../../controllers/dental/patientsController');
const treatmentsCtrl   = require('../../controllers/dental/treatmentsController');
const servicesCtrl     = require('../../controllers/dental/servicesController');
const appointmentsCtrl = require('../../controllers/dental/appointmentsController');
const consultationsCtrl = require('../../controllers/dental/consultationsController');
const chargesCtrl      = require('../../controllers/dental/chargesController');

// All dental routes require authentication
router.use(authMiddleware);

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard',         dashboardCtrl.getSummary);
router.get('/dashboard/today',   dashboardCtrl.getToday);
router.get('/dashboard/finance', dashboardCtrl.getFinance);

// ─── PATIENTS ─────────────────────────────────────────────────
router.get('/patients',                          patientsCtrl.list);
router.post('/patients',                         patientsCtrl.create);
router.get('/patients/:id',                      patientsCtrl.getById);
router.patch('/patients/:id',                    patientsCtrl.update);
router.get('/patients/:id/clinical-history',     patientsCtrl.getClinicalHistory);
router.get('/patients/:id/medical-history',      patientsCtrl.getMedicalHistory);
router.post('/patients/:id/medical-history',     patientsCtrl.createMedicalHistory);
router.get('/patients/:id/consultations',        patientsCtrl.getConsultations);
router.get('/patients/:id/payments',             patientsCtrl.getPayments);
router.get('/patients/:id/debt',                 patientsCtrl.getDebt);

// ─── TREATMENTS ───────────────────────────────────────────────
router.get('/treatments',        treatmentsCtrl.list);
router.post('/treatments',       treatmentsCtrl.create);
router.patch('/treatments/:id',  treatmentsCtrl.update);
router.delete('/treatments/:id', treatmentsCtrl.remove);

// ─── SERVICES ─────────────────────────────────────────────────
router.get('/services',                   servicesCtrl.list);
router.post('/services',                  servicesCtrl.create);
router.get('/services/:id',               servicesCtrl.getById);
router.patch('/services/:id',             servicesCtrl.update);
router.delete('/services/:id',            servicesCtrl.remove);
router.post('/services/:id/treatments',   servicesCtrl.assignTreatments);

// ─── APPOINTMENTS ─────────────────────────────────────────────
router.get('/appointments',                            appointmentsCtrl.list);
router.get('/appointments/day',                        appointmentsCtrl.getByDay);
router.get('/appointments/month',                      appointmentsCtrl.getByMonth);
router.post('/appointments',                           appointmentsCtrl.create);
router.get('/appointments/:id',                        appointmentsCtrl.getById);
router.patch('/appointments/:id',                      appointmentsCtrl.update);
router.post('/appointments/:id/confirm',               appointmentsCtrl.confirm);
router.post('/appointments/:id/cancel',                appointmentsCtrl.cancel);
router.post('/appointments/:id/no-show',               appointmentsCtrl.noShow);
router.post('/appointments/:id/convert-to-consultation', appointmentsCtrl.convertToConsultation);

// ─── CONSULTATIONS ────────────────────────────────────────────
router.get('/consultations',                           consultationsCtrl.list);
router.post('/consultations',                          consultationsCtrl.create);
router.get('/consultations/:id',                       consultationsCtrl.getById);
router.patch('/consultations/:id',                     consultationsCtrl.update);
router.post('/consultations/:id/clinical-history',     consultationsCtrl.addClinicalHistory);
router.post('/consultations/:id/treatments',           consultationsCtrl.addTreatments);
router.post('/consultations/:id/complete',             consultationsCtrl.complete);
router.post('/consultations/:id/cancel',               consultationsCtrl.cancel);
router.post('/consultations/:id/create-charge',        consultationsCtrl.createCharge);
router.get('/consultations/:id/photos',                consultationsCtrl.listPhotos);
router.post('/consultations/:id/photos',               consultationsCtrl.photoUpload.single('photo'), consultationsCtrl.uploadPhoto);
router.delete('/consultations/:id/photos/:photoId',    consultationsCtrl.deletePhoto);

// ─── FINANCE: CHARGES ─────────────────────────────────────────
router.get('/charges',                   chargesCtrl.list);
router.post('/charges',                  chargesCtrl.create);
router.get('/charges/:id',               chargesCtrl.getById);
router.post('/charges/:id/payments',     chargesCtrl.registerPayment);
router.post('/charges/:id/installments', chargesCtrl.createInstallments);

// ─── FINANCE: INSTALLMENTS ────────────────────────────────────
router.get('/installments/overdue',  chargesCtrl.getOverdueInstallments);
router.post('/installments/:id/pay', chargesCtrl.payInstallment);

// ─── FINANCE: PAYMENTS ────────────────────────────────────────
router.get('/payments', chargesCtrl.listPayments);

// ─── FINANCE: SUMMARY ─────────────────────────────────────────
router.get('/finance/summary', chargesCtrl.getFinanceSummary);

module.exports = router;
