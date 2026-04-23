const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/select-company', authMiddleware, authController.selectCompany);
router.get('/me', authMiddleware, authController.getMe);
router.get('/visual-config', authMiddleware, authController.getVisualConfig);
router.put('/visual-config', authMiddleware, authController.updateVisualConfig);

module.exports = router;
