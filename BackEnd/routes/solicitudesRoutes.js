const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected Routes
router.get('/', authMiddleware, solicitudesController.getAllSolicitudes);
router.put('/:id', authMiddleware, solicitudesController.updateSolicitudStatus);

// Public Route (for external website)
// In a real scenario, this might need rate limiting or a specific API key
router.post('/public', solicitudesController.createSolicitud);

module.exports = router;
