const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/modulesController');

router.get('/',         auth, ctrl.getModules);
router.get('/:id',      auth, ctrl.getModuleById);
router.post('/',        auth, ctrl.createModule);
router.put('/:id',      auth, ctrl.updateModule);
router.patch('/:id/status', auth, ctrl.changeModuleStatus);
router.delete('/:id',   auth, ctrl.deleteModule);

module.exports = router;
