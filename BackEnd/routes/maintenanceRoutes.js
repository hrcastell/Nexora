const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const maintenanceController = require('../controllers/maintenanceController');

router.use(authMiddleware);

router.post('/grant-browse-access', maintenanceController.grantBrowseAccess);

module.exports = router;
