-- =============================================================
-- MIGRATION: 55_hide_legacy_garage_products_menu.sql
-- Products Catalog Transversal — Verify remediation (finding W1)
--
-- Migration 51 seeded a NEW `products` transaction (route /products,
-- module `products`) that is emitted whenever garage_operations OR
-- inventory is active (virtual OR enablement, ADR-1). The PRE-EXISTING
-- legacy transaction `garage_products` (seeded in migration 14, route
-- /garage/products, under module `garage_operations`) was never
-- deactivated from the sidebar, so a garage_operations company would
-- render TWO "Productos" entries in its menu pointing at the same
-- screen (see verify-report finding W1).
--
-- Fix: set menu_visible = FALSE on the legacy `garage_products`
-- transaction row. This ONLY suppresses its sidebar rendering
-- (FrontEnd/Portal/src/layouts/AdminLayout.vue's navModules computed
-- filters strictly on `t.menu_visible`). It does NOT touch:
--   - the transaction's `status` (stays 'activo')
--   - the /garage/products route itself (still resolves, still works)
--   - profile_transaction_permissions grants tied to transaction_code
--     'garage_products' in any tenant schema (untouched, still valid)
--   - the frontend route-guard/menu-store `routeIndex` used by
--     requiresTransaction checks, which is keyed on can_view only,
--     not on menu_visible (see FrontEnd/Portal/src/stores/menu.ts)
--
-- public.module_transactions is a GLOBAL catalog table (not duplicated
-- per tenant schema — tenant schemas only reference it by code in
-- profile_transaction_permissions). A single UPDATE here therefore
-- covers ALL companies uniformly, both existing and any created after
-- this migration runs. No change to BackEnd/templates/tenant_schema.sql
-- is needed or applicable.
--
-- Idempotent (UPDATE ... WHERE menu_visible = TRUE; safe to re-run).
-- Additive/non-destructive — no rows dropped, no columns altered.
-- PostgreSQL 10.23 compatible. Safe to paste once in public schema
-- via phpPgAdmin.
-- =============================================================

UPDATE public.module_transactions mt
SET menu_visible = FALSE
FROM public.module_catalog mc
WHERE mt.module_id = mc.id
  AND mc.code = 'garage_operations'
  AND mt.code = 'garage_products'
  AND mt.menu_visible = TRUE;

-- Verification (uncomment to check after running):
-- SELECT mc.code AS module_code, mt.code AS transaction_code, mt.route, mt.menu_visible, mt.status
-- FROM public.module_transactions mt
-- JOIN public.module_catalog mc ON mt.module_id = mc.id
-- WHERE mt.code IN ('garage_products', 'products')
-- ORDER BY mc.code, mt.code;
