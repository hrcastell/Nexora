const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/company/:companyId', subscriptionController.getSubscriptionByCompany);
router.get('/company/:companyId/payments', subscriptionController.getPaymentHistory);
router.post('/', subscriptionController.createSubscription);
router.put('/:id', subscriptionController.updateSubscription);
router.post('/:id/payment', subscriptionController.registerPayment);

module.exports = router;
