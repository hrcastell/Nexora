const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl   = require('../controllers/usersController');
const auth   = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const rp = requirePermission; // alias para brevedad

router.use(auth);

router.get('/',                                  rp('users', 'can_view'), ctrl.getCompanyUsers);
router.post('/',                                 rp('users', 'can_create'), ctrl.inviteUser);
router.put('/:userId',                           rp('users', 'can_edit'), ctrl.updateCompanyUser);
router.patch('/:userId/status',                  rp('users', 'can_admin'), ctrl.changeUserStatus);
router.post('/:userId/profiles',                 rp('users', 'can_admin'), ctrl.assignUserProfile);
router.delete('/:userId/profiles/:profileId',    rp('users', 'can_admin'), ctrl.removeUserProfile);
router.delete('/:userId',                        rp('users', 'can_delete'), ctrl.removeCompanyUser);

module.exports = router;
