-- =============================================================
-- MIGRATION: 57_fix_invalid_menu_icons.sql
-- public schema only — no per-tenant loop needed (module_catalog and
-- module_transactions both live in `public`).
--
-- Four icon codes seeded across earlier migrations do not exist in the
-- installed lucide-vue-next version (0.469.0) — neither as a file nor as a
-- legacy alias export — so they always fell back to the generic Settings
-- icon in the UI, same as every icon that failed to resolve before the
-- frontend's icon resolver was fixed to handle kebab-case names generically
-- (see FrontEnd/Portal/src/utils/iconRegistry.ts). Replaced with the
-- closest valid equivalent:
--   tooth          -> stethoscope       (no dental-specific icon in lucide)
--   tool           -> hammer            (avoids clashing with garage_operations' own 'wrench')
--   cash-register  -> landmark
--   sitemap        -> workflow
--
-- Idempotent (plain UPDATE ... WHERE, safe to re-run).
-- =============================================================

UPDATE public.module_catalog SET icon = 'stethoscope' WHERE code = 'dental_core' AND icon = 'tooth';

UPDATE public.module_transactions SET icon = 'stethoscope' WHERE code = 'dental_treatments'       AND icon = 'tooth';
UPDATE public.module_transactions SET icon = 'hammer'      WHERE code = 'garage_service_templates' AND icon = 'tool';
UPDATE public.module_transactions SET icon = 'landmark'    WHERE code = 'treasury_cash_sessions'    AND icon = 'cash-register';
UPDATE public.module_transactions SET icon = 'workflow'    WHERE code = 'hr_org_settings'           AND icon = 'sitemap';
