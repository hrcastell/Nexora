-- =============================================================
-- MIGRATION: 11_fix_modules_route.sql
-- Corrige la ruta de la transacción 'modules' en configuration.
--
-- FASE 2 redirigió el router: /admin/modules-manager → /admin/modules
-- Esta migración sincroniza public.module_transactions con esa ruta.
--
-- Seguro para re-ejecución (UPDATE idempotente por route actual).
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar y ejecutar
-- =============================================================

UPDATE public.module_transactions
SET    route = '/admin/modules'
WHERE  code  = 'modules'
  AND  route = '/admin/modules-manager';

-- VERIFICACIÓN
-- SELECT code, name, route FROM public.module_transactions WHERE code = 'modules';
