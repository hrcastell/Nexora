-- =============================================================
-- MIGRATION: 05_module_governance.sql
-- Plan 1.5 — Gobernanza modular por compañía
--
-- Introduce catálogo global de módulos + transacciones hijas +
-- relación compañía↔módulos habilitados (aditivo, no rompe nada).
--
-- CÓMO EJECUTAR:
--   1. cPanel → phpPgAdmin → BD del proyecto → SQL
--   2. Pegar TODO este archivo y ejecutar
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. public.module_catalog  — catálogo global de módulos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_catalog (
    id                    SERIAL PRIMARY KEY,
    code                  VARCHAR(50)  NOT NULL UNIQUE,
    name                  VARCHAR(100) NOT NULL,
    description           TEXT,
    icon                  VARCHAR(50),
    group_name            VARCHAR(50),
    is_core               BOOLEAN      DEFAULT FALSE,  -- obligatorio para toda compañía
    is_global             BOOLEAN      DEFAULT TRUE,
    is_system             BOOLEAN      DEFAULT FALSE,  -- creado por sistema, no editable libremente
    menu_visible_default  BOOLEAN      DEFAULT TRUE,
    menu_order_default    INTEGER      DEFAULT 0,
    status                VARCHAR(20)  DEFAULT 'activo',
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_module_catalog_code    ON public.module_catalog(code);
CREATE INDEX IF NOT EXISTS idx_module_catalog_status  ON public.module_catalog(status);
CREATE INDEX IF NOT EXISTS idx_module_catalog_is_core ON public.module_catalog(is_core);

-- ─────────────────────────────────────────────────────────────
-- 2. public.module_transactions — transacciones hijas por módulo
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_transactions (
    id             SERIAL PRIMARY KEY,
    module_id      INTEGER NOT NULL REFERENCES public.module_catalog(id) ON DELETE CASCADE,
    code           VARCHAR(80)  NOT NULL,
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    route          VARCHAR(150),   -- ruta en frontend (ej: /admin/users)
    icon           VARCHAR(50),
    tab_order      INTEGER       DEFAULT 0,
    menu_visible   BOOLEAN       DEFAULT TRUE,
    status         VARCHAR(20)   DEFAULT 'activo',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, code)
);

CREATE INDEX IF NOT EXISTS idx_module_transactions_module ON public.module_transactions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_transactions_code   ON public.module_transactions(code);
CREATE INDEX IF NOT EXISTS idx_module_transactions_route  ON public.module_transactions(route);

-- ─────────────────────────────────────────────────────────────
-- 3. public.company_modules — compañía ↔ módulos habilitados
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_modules (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER NOT NULL REFERENCES public.companies(id)     ON DELETE CASCADE,
    module_id    INTEGER NOT NULL REFERENCES public.module_catalog(id) ON DELETE CASCADE,
    is_enabled   BOOLEAN DEFAULT TRUE,
    is_visible   BOOLEAN DEFAULT TRUE,
    is_required  BOOLEAN DEFAULT FALSE,   -- copia de is_core al momento de habilitar
    menu_order   INTEGER DEFAULT 0,
    enabled_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disabled_at  TIMESTAMP WITH TIME ZONE,
    notes        TEXT,
    UNIQUE(company_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_company ON public.company_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_module  ON public.company_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_enabled ON public.company_modules(is_enabled);

-- ─────────────────────────────────────────────────────────────
-- 4. public.company_module_transactions (opcional, granularidad)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_module_transactions (
    id                 SERIAL PRIMARY KEY,
    company_module_id  INTEGER NOT NULL REFERENCES public.company_modules(id)    ON DELETE CASCADE,
    transaction_id     INTEGER NOT NULL REFERENCES public.module_transactions(id) ON DELETE CASCADE,
    is_enabled         BOOLEAN DEFAULT TRUE,
    is_visible         BOOLEAN DEFAULT TRUE,
    tab_order          INTEGER DEFAULT 0,
    notes              TEXT,
    UNIQUE(company_module_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_cmt_cm ON public.company_module_transactions(company_module_id);
CREATE INDEX IF NOT EXISTS idx_cmt_tx ON public.company_module_transactions(transaction_id);

-- ─────────────────────────────────────────────────────────────
-- 5. SEED — módulos del catálogo global
--    Core: dashboard + configuration
--    No-core (pero system): todo lo demás
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.module_catalog (code, name, description, icon, group_name, is_core, is_system, menu_order_default, status) VALUES
    ('dashboard',     'Dashboard',       'Panel principal de métricas y resumen',         'LayoutDashboard', 'Core',  TRUE,  TRUE, 1,  'activo'),
    ('configuration', 'Configuración',   'Gobernanza del tenant: empresas, usuarios, perfiles, módulos, comercial, solicitudes, suscripciones, reportes', 'Settings', 'Admin', TRUE,  TRUE, 2,  'activo')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    icon        = EXCLUDED.icon,
    group_name  = EXCLUDED.group_name,
    is_core     = EXCLUDED.is_core,
    is_system   = EXCLUDED.is_system,
    menu_order_default = EXCLUDED.menu_order_default;

-- ─────────────────────────────────────────────────────────────
-- 6. SEED — transacciones del módulo "configuration"
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.module_transactions (module_id, code, name, route, icon, tab_order, status)
SELECT m.id, v.code, v.name, v.route, v.icon, v.tab_order, 'activo'
FROM public.module_catalog m
CROSS JOIN (VALUES
    ('companies',     'Empresas',        '/admin/companies',       'Building2',     1),
    ('requests',      'Solicitudes',     '/admin/requests',        'Mail',          2),
    ('users',         'Usuarios',        '/admin/users',           'Users',         3),
    ('profiles',      'Perfiles',        '/admin/profiles',        'Shield',        4),
    ('modules',       'Módulos',         '/admin/modules-manager', 'Puzzle',        5),
    ('reports',       'Reportes',        '/admin/reports',         'BarChart2',     6),
    ('commercial',    'Comercial',       '/admin/commercial',      'CreditCard',    7),
    ('subscriptions', 'Suscripciones',   '/admin/subscriptions',   'FileText',      8),
    ('visual_config', 'Visual',          '/admin/config',          'Palette',       9)
) AS v(code, name, route, icon, tab_order)
WHERE m.code = 'configuration'
ON CONFLICT (module_id, code) DO UPDATE SET
    name      = EXCLUDED.name,
    route     = EXCLUDED.route,
    icon      = EXCLUDED.icon,
    tab_order = EXCLUDED.tab_order;

-- Transacción única del módulo dashboard (la propia vista)
INSERT INTO public.module_transactions (module_id, code, name, route, icon, tab_order, status)
SELECT m.id, 'dashboard', 'Dashboard', '/dashboard', 'LayoutDashboard', 1, 'activo'
FROM public.module_catalog m
WHERE m.code = 'dashboard'
ON CONFLICT (module_id, code) DO UPDATE SET
    name      = EXCLUDED.name,
    route     = EXCLUDED.route,
    icon      = EXCLUDED.icon,
    tab_order = EXCLUDED.tab_order;

-- ─────────────────────────────────────────────────────────────
-- 7. BACKFILL — registrar módulos core en todas las compañías existentes
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.company_modules (company_id, module_id, is_enabled, is_visible, is_required, menu_order)
SELECT c.id, m.id, TRUE, TRUE, m.is_core, m.menu_order_default
FROM public.companies c
CROSS JOIN public.module_catalog m
WHERE m.is_core = TRUE
ON CONFLICT (company_id, module_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 8. Permisos para el usuario de aplicación
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
-- SELECT * FROM public.module_catalog ORDER BY menu_order_default;
-- SELECT m.code, t.code, t.name, t.route FROM public.module_transactions t JOIN public.module_catalog m ON m.id=t.module_id ORDER BY m.code, t.tab_order;
-- SELECT c.name, m.code FROM public.company_modules cm JOIN public.companies c ON c.id=cm.company_id JOIN public.module_catalog m ON m.id=cm.module_id ORDER BY c.name, m.code;
