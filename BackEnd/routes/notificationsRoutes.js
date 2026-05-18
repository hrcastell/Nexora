const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/authMiddleware');
const ctrl       = require('../controllers/notificationsController');

// All notification routes require authentication
router.get('/unread-count',      auth, ctrl.getUnreadCount);
router.get('/preferences',       auth, ctrl.getPreferences);
router.put('/preferences',       auth, ctrl.savePreferences);
router.get('/',                  auth, ctrl.getNotifications);
router.put('/read-all',          auth, ctrl.markAllRead);
router.put('/:id/read',          auth, ctrl.markRead);
router.delete('/:id',            auth, ctrl.dismiss);

module.exports = router;
