const express       = require('express');
const router        = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');

const dashboardCtrl    = require('../../controllers/dental/dashboardController');
const patientsCtrl     = require('../../controllers/dental/patientsController');
const treatmentsCtrl   = require('../../controllers/dental/treatmentsController');
const appointmentsCtrl = require('../../controllers/dental/appointmentsController');
const consultationsCtrl = require('../../controllers/dental/consultationsController');
const chargesCtrl      = require('../../controllers/dental/chargesController');
const consultationTreatmentsCtrl = require('../../controllers/dental/consultationTreatmentsController');
const consultationSessionsCtrl = require('../../controllers/dental/consultationSessionsController');
const consultationAttachmentsController = require('../../controllers/dental/consultationAttachmentsController');
const quotesController = require('../../controllers/dental/quotesController');

// All dental routes require authentication
router.use(authMiddleware);

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard',         dashboardCtrl.getSummary);
router.get('/dashboard/today',   dashboardCtrl.getToday);
router.get('/dashboard/finance', dashboardCtrl.getFinance);

// ─── COMPANY CONFIG (for print documents) ─────────────────────
router.get('/company-config',    dashboardCtrl.getCompanyConfig);

// ─── PATIENTS ─────────────────────────────────────────────────
router.get('/patients',                          patientsCtrl.list);
router.post('/patients',                         patientsCtrl.create);
router.get('/patients/:id',                      patientsCtrl.getById);
router.patch('/patients/:id',                    patientsCtrl.update);
router.get('/patients/:id/clinical-history',     patientsCtrl.getClinicalHistory);
router.get('/patients/:id/medical-history',      patientsCtrl.getMedicalHistory);
router.post('/patients/:id/medical-history',     patientsCtrl.createMedicalHistory);
router.post('/patients/:id/photo',               patientsCtrl.patientPhotoUpload.single('photo'), patientsCtrl.uploadPhoto);
router.delete('/patients/:id/photo',             patientsCtrl.deletePhoto);
router.get('/patients/:id/consultations',        patientsCtrl.getConsultations);
router.get('/patients/:id/payments',             patientsCtrl.getPayments);
router.get('/patients/:id/debt',                 patientsCtrl.getDebt);

// ─── TREATMENTS (billable catalog — replaces old services) ────
router.get('/treatments',        treatmentsCtrl.list);
router.post('/treatments',       treatmentsCtrl.create);
router.get('/treatments/:id',    treatmentsCtrl.getById);
router.patch('/treatments/:id',  treatmentsCtrl.update);
router.delete('/treatments/:id', treatmentsCtrl.remove);

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
router.post('/consultations/:id/complete',             consultationsCtrl.complete);
router.post('/consultations/:id/cancel',               consultationsCtrl.cancel);
router.post('/consultations/:id/create-charge',        consultationsCtrl.createCharge);
router.get('/consultations/:id/photos',                consultationsCtrl.listPhotos);
router.post('/consultations/:id/photos',               consultationsCtrl.photoUpload.single('photo'), consultationsCtrl.uploadPhoto);
router.delete('/consultations/:id/photos/:photoId',    consultationsCtrl.deletePhoto);

// ─── CONSULTATION TREATMENTS (multi-treatment per consultation) ──────────
router.get('/consultations/:id/treatments',              consultationTreatmentsCtrl.list);
router.get('/consultations/:id/treatments/total',        consultationTreatmentsCtrl.getTotal);
router.post('/consultations/:id/treatments',             consultationTreatmentsCtrl.add);
router.patch('/consultations/:id/treatments/:sid',       consultationTreatmentsCtrl.update);
router.delete('/consultations/:id/treatments/:sid',      consultationTreatmentsCtrl.void);

// ─── CONSULTATION SESSIONS ────────────────────────────────────────────────
router.get('/consultations/:id/sessions',                          consultationSessionsCtrl.list);
router.post('/consultations/:id/sessions',                         consultationSessionsCtrl.create);
router.get('/consultations/:id/sessions/:sid',                     consultationSessionsCtrl.getById);
router.patch('/consultations/:id/sessions/:sid',                   consultationSessionsCtrl.update);
router.post('/consultations/:id/sessions/:sid/complete',           consultationSessionsCtrl.complete);

// ─── CONSULTATION ATTACHMENTS ─────────────────────────────────────────────
router.get('/consultations/:id/attachments',       consultationAttachmentsController.list);
router.post('/consultations/:id/attachments',      consultationAttachmentsController.attachmentUpload.single('file'), consultationAttachmentsController.upload);
router.delete('/consultations/:id/attachments/:aid', consultationAttachmentsController.remove);

// ─── CONSULTATION STATUS ──────────────────────────────────────────────────
router.post('/consultations/:id/status', consultationsCtrl.changeStatus);

// ─── QUOTES ───────────────────────────────────────────────────
router.get('/quotes',                        quotesController.list);
router.post('/quotes',                       quotesController.create);
router.get('/quotes/:id',                    quotesController.getById);
router.put('/quotes/:id',                    quotesController.update);
router.post('/quotes/:id/send',              quotesController.send);
router.post('/quotes/:id/accept',            quotesController.accept);
router.post('/quotes/:id/reject',            quotesController.reject);
router.post('/quotes/:id/convert',           quotesController.convertToConsultation);
router.get('/quotes/:id/print',              quotesController.getPrintData);
router.post('/quotes/:id/items',             quotesController.addItem);
router.put('/quotes/:id/items/:iid',         quotesController.updateItem);
router.delete('/quotes/:id/items/:iid',      quotesController.removeItem);
router.get('/patients/:customerId/quotes',   quotesController.getForPatient);

// ─── FINANCE: CHARGES ─────────────────────────────────────────
router.get('/charges',                   chargesCtrl.list);
router.post('/charges',                  chargesCtrl.create);
router.get('/charges/:id',               chargesCtrl.getById);
router.delete('/charges/:id',            chargesCtrl.deleteCharge);
router.post('/charges/:id/payments',     chargesCtrl.registerPayment);
router.post('/charges/:id/installments', chargesCtrl.createInstallments);

// ─── FINANCE: INSTALLMENTS ────────────────────────────────────
router.get('/installments/overdue',  chargesCtrl.getOverdueInstallments);
router.post('/installments/:id/pay', chargesCtrl.payInstallment);

// ─── FINANCE: PAYMENTS ────────────────────────────────────────
router.get('/payments',        chargesCtrl.listPayments);
router.delete('/payments/:id', chargesCtrl.deletePayment);

// ─── FINANCE: SUMMARY ─────────────────────────────────────────
router.get('/finance/summary', chargesCtrl.getFinanceSummary);

module.exports = router;
