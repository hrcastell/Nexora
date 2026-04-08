const express = require('express');
const router = express.Router({ mergeParams: true });
const companyConfigController = require('../controllers/companyConfigController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/config', companyConfigController.getCompanyConfig);
router.put('/config', companyConfigController.updateCompanyConfig);
router.get('/roles', companyConfigController.getCompanyRoles);

module.exports = router;
