const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const cashSessionsCtrl = require('../../controllers/treasury/cashSessionsController');

router.use(authMiddleware);

router.get('/cash-sessions', cashSessionsCtrl.list);
router.post('/cash-sessions/open', cashSessionsCtrl.open);
router.post('/cash-sessions/movements', cashSessionsCtrl.recordMovement);
router.post('/cash-sessions/:id/close', cashSessionsCtrl.close);
router.get('/cash-sessions/:id', cashSessionsCtrl.getById);

module.exports = router;
