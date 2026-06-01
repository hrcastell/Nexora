const express       = require('express');
const router        = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');

const periodsCtrl      = require('../../controllers/financial/periodsController');
const categoriesCtrl   = require('../../controllers/financial/categoriesController');
const budgetPlansCtrl  = require('../../controllers/financial/budgetPlansController');
const transactionsCtrl = require('../../controllers/financial/transactionsController');
const summaryCtrl      = require('../../controllers/financial/summaryController');

// All financial routes require authentication
router.use(authMiddleware);

// ─── PERIODS ──────────────────────────────────────────────────
router.post('/periods',                        periodsCtrl.create);
router.get('/periods',                         periodsCtrl.list);
router.get('/periods/current',                 periodsCtrl.getCurrent);
router.get('/periods/:periodId',               periodsCtrl.getById);
router.post('/periods/:periodId/close',        periodsCtrl.close);

// ─── CATEGORIES ───────────────────────────────────────────────
router.post('/categories/seed',                summaryCtrl.seedDefaultCategories);
router.post('/categories',                     categoriesCtrl.create);
router.get('/categories',                      categoriesCtrl.list);
router.get('/categories/:categoryId',          categoriesCtrl.getById);
router.put('/categories/:categoryId',          categoriesCtrl.update);
router.patch('/categories/:categoryId/status', categoriesCtrl.toggleStatus);
router.delete('/categories/:categoryId',       categoriesCtrl.remove);

// ─── BUDGET PLANS ─────────────────────────────────────────────
router.post('/periods/:periodId/budget-plans',       budgetPlansCtrl.create);
router.get('/periods/:periodId/budget-plans',        budgetPlansCtrl.listByPeriod);
router.put('/budget-plans/:budgetPlanId',            budgetPlansCtrl.update);
router.delete('/budget-plans/:budgetPlanId',         budgetPlansCtrl.remove);

// ─── TRANSACTIONS ─────────────────────────────────────────────
router.post('/periods/:periodId/transactions',       transactionsCtrl.create);
router.get('/periods/:periodId/transactions',        transactionsCtrl.listByPeriod);
router.get('/transactions/:transactionId',           transactionsCtrl.getById);
router.patch('/transactions/:transactionId',         transactionsCtrl.update);
router.delete('/transactions/:transactionId',        transactionsCtrl.remove);

// ─── SUMMARY ──────────────────────────────────────────────────
router.get('/periods/:periodId/summary',             summaryCtrl.getSummary);
router.get('/periods/:periodId/breakdown',           summaryCtrl.getBreakdown);
router.get('/periods/:periodId/deviations',          summaryCtrl.getDeviations);

module.exports = router;
