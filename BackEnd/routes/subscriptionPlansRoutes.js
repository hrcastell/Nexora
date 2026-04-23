const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/subscriptionPlansController');
const auth    = require('../middleware/authMiddleware');

router.use(auth);

router.get('/',    ctrl.getPlans);
router.post('/',   ctrl.createPlan);
router.put('/:id', ctrl.updatePlan);
router.delete('/:id', ctrl.deletePlan);

module.exports = router;
