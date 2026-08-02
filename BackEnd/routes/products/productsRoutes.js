const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../../middleware/authMiddleware');
const productsCtrl = require('../../controllers/garage/productsController');

/**
 * Neutral `/api/products*` alias (spec: Products Module Gating domain —
 * OR-semantics visibility; design §1 ADR-1, §8; task 3.9).
 *
 * MOUNT-PATH DECISION: task 3.9's literal text said to add these routes
 * inside BackEnd/routes/garage/garageRoutes.js, but that router is only
 * ever mounted at /api/garage (and /api/companies/:id/garage) — adding
 * `router.get('/products', ...)` there would resolve to /api/garage/products
 * again (a duplicate of the existing legacy route), NOT /api/products.
 * routeModuleMap.js's `/products*` entries (no /garage prefix) match
 * req.path relative to /api, and migration 51 already seeded the
 * `products` module_transactions row with route='/products' (the intended
 * frontend/API path). So this is a NEW, dedicated top-level router mounted
 * at /api/products in app.js, reusing the exact same productsController
 * handlers as /garage/products* (old route stays alive, unchanged, per
 * design §8's no-breaking-change rollout).
 */
router.use(authMiddleware);

router.get('/', productsCtrl.list);
router.post('/', productsCtrl.create);
router.get('/:id', productsCtrl.getById);
router.put('/:id', productsCtrl.update);
router.patch('/:id/status', productsCtrl.toggleStatus);
router.delete('/:id', productsCtrl.remove);

module.exports = router;
