const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes here should be protected
router.use(authMiddleware);

router.get('/', companyController.getAllCompanies);
router.post('/', companyController.createCompany);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);

module.exports = router;
