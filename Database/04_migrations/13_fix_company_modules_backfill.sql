-- =============================================================
-- MIGRATION: 13_fix_company_modules_backfill.sql
-- Diagnóstico y reparación de company_modules
--
-- PROBLEMA: El backfill de módulos core en company_modules (paso 7 de
-- 05_module_governance.sql) se ejecuta con ON CONFLICT DO NOTHING, por
-- lo que si una compañía fue creada DESPUÉS de correr la migración 05,
-- o si los registros fueron eliminados, la compañía no tiene filas en
-- company_modules y el menú solo muestra Dashboard.
--
-- CUÁNDO EJECUTAR: Siempre que una empresa pierda módulos en el menú.
-- Es idempotente — seguro re-ejecutar en cualquier momento.
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar sección DIAGNÓSTICO,
--   verificar el output, luego ejecutar sección REPARACIÓN.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- DIAGNÓSTICO: Ver qué módulos tiene cada empresa en company_modules
-- ─────────────────────────────────────────────────────────────
SELECT
    c.name        AS empresa,
    c.schema_name,
    m.code        AS modulo,
    m.is_core,
    cm.is_enabled,
    cm.is_visible
FROM public.companies c
CROSS JOIN public.module_catalog m
LEFT JOIN public.company_modules cm
    ON cm.company_id = c.id AND cm.module_id = m.id
WHERE m.status = 'activo'
ORDER BY c.name, m.menu_order_default;

-- ─────────────────────────────────────────────────────────────
-- REPARACIÓN: Backfill de todos los módulos core (is_core=TRUE)
-- para todas las empresas que no los tengan registrados.
-- Idempotente gracias a ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.company_modules
    (company_id, module_id, is_enabled, is_visible, is_required, menu_order)
SELECT
    c.id,
    m.id,
    TRUE,
    TRUE,
    m.is_core,
    m.menu_order_default
FROM public.companies c
CROSS JOIN public.module_catalog m
WHERE m.is_core   = TRUE
  AND m.status    = 'activo'
  AND c.is_active = TRUE
ON CONFLICT (company_id, module_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL: Confirmar que hernancius tiene dashboard + configuration
-- ─────────────────────────────────────────────────────────────
SELECT
    c.schema_name,
    m.code        AS modulo,
    m.is_core,
    cm.is_enabled,
    cm.is_visible,
    cm.is_required
FROM public.companies c
JOIN public.company_modules cm ON cm.company_id = c.id
JOIN public.module_catalog  m  ON m.id = cm.module_id
WHERE c.schema_name = 'hernancius'
  AND m.status = 'activo'
ORDER BY m.menu_order_default;
