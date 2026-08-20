-- =============================================================
-- MIGRATION: 10_core_base_cleanup.sql
-- Core Base Refinement — Fase 4
--
-- Extiende public.module_catalog con:
--   - columna `category` para distinguir módulos de infraestructura
--     ('core_base') de Cores de negocio futuros ('business_core')
--   - columna `version` para versionado de Cores
--
-- Clasifica los módulos existentes:
--   - dashboard     → category = 'core_base'
--   - configuration → category = 'core_base'
--
-- Los Cores de negocio futuros (taller, odontología, etc.) se
-- registrarán con category = 'business_core' cuando se implementen.
-- Se instalan manualmente por super_admin desde ModulesManagerView,
-- NO se asignan automáticamente a nuevas empresas.
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar y ejecutar
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Agregar columna `category` a module_catalog
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.module_catalog
    ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'core_base';

COMMENT ON COLUMN public.module_catalog.category IS
    'Categoría del módulo: core_base (infraestructura SaaS transversal) | business_core (módulo de negocio específico por industria)';

-- ─────────────────────────────────────────────────────────────
-- 2. Agregar columna `version` a module_catalog
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.module_catalog
    ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0.0';

COMMENT ON COLUMN public.module_catalog.version IS
    'Versión semántica del módulo/Core. Útil para detectar actualizaciones de Cores de negocio.';

-- ─────────────────────────────────────────────────────────────
-- 3. Clasificar módulos existentes
-- ─────────────────────────────────────────────────────────────
UPDATE public.module_catalog
SET category = 'core_base', version = '1.0.0'
WHERE code IN ('dashboard', 'configuration');

-- ─────────────────────────────────────────────────────────────
-- 4. Índice para filtrar por categoría en ModulesManagerView
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_module_catalog_category
    ON public.module_catalog(category);

-- ─────────────────────────────────────────────────────────────
-- 5. Permisos para el usuario de aplicación
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA public
    TO hernanci_nexoragarage;

GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public
    TO hernanci_nexoragarage;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- SELECT code, name, category, version, is_core, is_system, status
-- FROM public.module_catalog
-- ORDER BY menu_order_default;
