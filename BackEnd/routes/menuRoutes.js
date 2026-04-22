const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/menuController');

router.get('/me', auth, ctrl.getMyMenu);

module.exports = router;
