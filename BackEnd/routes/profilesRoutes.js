const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/profilesController');

router.get('/',                        auth, ctrl.getProfiles);
router.get('/:id',                     auth, ctrl.getProfileById);
router.get('/:id/permissions',         auth, ctrl.getProfilePermissions);
router.put('/:id/permissions',         auth, ctrl.updateProfilePermissions);
router.post('/',                       auth, ctrl.createProfile);
router.put('/:id',                     auth, ctrl.updateProfile);
router.delete('/:id',                  auth, ctrl.deleteProfile);

module.exports = router;
