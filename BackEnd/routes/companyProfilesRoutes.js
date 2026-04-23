const express = require('express');
const router  = express.Router({ mergeParams: true });
const auth    = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/profilesController');

router.get('/',                                  auth, ctrl.getProfilesByCompany);
router.post('/',                                 auth, ctrl.createProfileByCompany);
router.put('/:profileId',                        auth, ctrl.updateProfileByCompany);
router.delete('/:profileId',                     auth, ctrl.deleteProfileByCompany);
router.get('/:profileId/permissions-full',       auth, ctrl.getProfilePermissionsFullByCompany);
router.put('/:profileId/permissions-full',       auth, ctrl.updateProfilePermissionsFullByCompany);

module.exports = router;
