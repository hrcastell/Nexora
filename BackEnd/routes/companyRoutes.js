const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const profilesController = require('../controllers/profilesController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes here should be protected
router.use(authMiddleware);

router.get('/', companyController.getAllCompanies);
router.post('/', companyController.createCompany);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

// ── Company-scoped profile routes (super_admin only) ──
router.get('/:companyId/profiles',                                       profilesController.getProfilesByCompany);
router.post('/:companyId/profiles',                                      profilesController.createProfileByCompany);
router.put('/:companyId/profiles/:profileId',                            profilesController.updateProfileByCompany);
router.delete('/:companyId/profiles/:profileId',                         profilesController.deleteProfileByCompany);
router.get('/:companyId/profiles/:profileId/permissions-full',           profilesController.getProfilePermissionsFullByCompany);
router.put('/:companyId/profiles/:profileId/permissions-full',           profilesController.updateProfilePermissionsFullByCompany);

module.exports = router;
