const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/companyModulesController');

router.use(auth);

router.get('/',                 ctrl.getCompanyModules);
router.put('/reorder',          ctrl.reorderCompanyModules); // MUST precede /:moduleCode
router.put('/:moduleCode',      ctrl.upsertCompanyModule);

module.exports = router;
