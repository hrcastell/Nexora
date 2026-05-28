const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/profilesController');

const rp = requirePermission; // alias para brevedad

router.get('/',                        auth, rp('profiles', 'can_view'), ctrl.getProfiles);
router.get('/:id',                     auth, rp('profiles', 'can_view'), ctrl.getProfileById);
router.get('/:id/permissions',         auth, ctrl.getProfilePermissions); // deprecated
router.put('/:id/permissions',         auth, ctrl.updateProfilePermissions); // deprecated
router.get('/:id/permissions-full',    auth, rp('profiles', 'can_view'), ctrl.getProfilePermissionsFull);
router.put('/:id/permissions-full',    auth, rp('profiles', 'can_admin'), ctrl.updateProfilePermissionsFull);
router.post('/',                       auth, rp('profiles', 'can_create'), ctrl.createProfile);
router.put('/:id',                     auth, rp('profiles', 'can_edit'), ctrl.updateProfile);
router.delete('/:id',                  auth, rp('profiles', 'can_delete'), ctrl.deleteProfile);

module.exports = router;
