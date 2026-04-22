const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/companyModulesController');

router.use(auth);

router.get('/',                 ctrl.getCompanyModules);
router.put('/:moduleCode',      ctrl.upsertCompanyModule);

module.exports = router;
