const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl   = require('../controllers/usersController');
const auth   = require('../middleware/authMiddleware');

router.use(auth);

router.get('/',                                  ctrl.getCompanyUsers);
router.post('/',                                 ctrl.inviteUser);
router.put('/:userId',                           ctrl.updateCompanyUser);
router.patch('/:userId/status',                  ctrl.changeUserStatus);
router.post('/:userId/profiles',                 ctrl.assignUserProfile);
router.delete('/:userId/profiles/:profileId',    ctrl.removeUserProfile);
router.delete('/:userId',                        ctrl.removeCompanyUser);

module.exports = router;
