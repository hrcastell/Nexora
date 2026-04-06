const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams for :id from parent
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', usersController.getCompanyUsers);
router.post('/', usersController.inviteUser);
router.put('/:userId', usersController.updateCompanyUser);
router.delete('/:userId', usersController.removeCompanyUser);

module.exports = router;
