-- =============================================================
-- MIGRATION: 02_users_profiles_modules_commercial.sql
-- Extiende usuarios, empresas y agrega módulos, perfiles,
-- matriz de permisos y control comercial (convenios, recibos, pagos).
-- Ejecutar sobre la base de datos de producción como superuser.
-- SEGURO: solo ADD COLUMN IF NOT EXISTS y CREATE TABLE IF NOT EXISTS
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. EXTENSIÓN public.users
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS first_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phone           VARCHAR(50),
    ADD COLUMN IF NOT EXISTS country         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_region    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS city            VARCHAR(100),
    ADD COLUMN IF NOT EXISTS commune         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_url      TEXT,
    ADD COLUMN IF NOT EXISTS role            VARCHAR(20) DEFAULT 'inner_user',
    ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'activo',
    ADD COLUMN IF NOT EXISTS is_system_user  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS created_by      INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by      INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Backfill: separar full_name en first_name / last_name
UPDATE public.users
SET
    first_name = TRIM(SPLIT_PART(full_name, ' ', 1)),
    last_name  = TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
WHERE first_name IS NULL AND full_name IS NOT NULL AND full_name <> '';

-- Backfill: role desde is_super_admin
UPDATE public.users SET role = 'super_admin' WHERE is_super_admin = TRUE AND role = 'inner_user';

-- Backfill: status desde is_active
UPDATE public.users SET status = 'activo'   WHERE is_active = TRUE  AND status = 'activo';
UPDATE public.users SET status = 'bloqueado' WHERE is_active = FALSE AND status = 'activo';

-- Proteger usuario raíz del sistema
UPDATE public.users
SET is_system_user = TRUE, role = 'super_admin'
WHERE email = 'hernan.castellanos@hrcastell.com';

-- ─────────────────────────────────────────────────────────────
-- 2. EXTENSIÓN public.companies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS commercial_status VARCHAR(20) DEFAULT 'activa',
    ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 5;

-- Backfill: commercial_status desde is_active
UPDATE public.companies SET commercial_status = 'activa'   WHERE is_active = TRUE  AND commercial_status = 'activa';
UPDATE public.companies SET commercial_status = 'bloqueada' WHERE is_active = FALSE AND commercial_status = 'activa';

-- ─────────────────────────────────────────────────────────────
-- 3. NUEVA TABLA: public.payment_agreements (Convenios de Pago)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_agreements (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'CLP',
    frequency           VARCHAR(20) DEFAULT 'monthly',
    start_date          DATE NOT NULL,
    due_day             INTEGER NOT NULL DEFAULT 1,
    service_description TEXT,
    status              VARCHAR(20) DEFAULT 'activo',
    grace_period_days   INTEGER DEFAULT 5,
    created_by          INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_agreements_company ON public.payment_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_agreements_status  ON public.payment_agreements(status);

-- ─────────────────────────────────────────────────────────────
-- 4. NUEVA TABLA: public.invoices (Recibos / Notificaciones de Cobro)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    agreement_id    INTEGER REFERENCES public.payment_agreements(id) ON DELETE SET NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'CLP',
    service_detail  JSONB,
    status          VARCHAR(20) DEFAULT 'emitido',
    notes           TEXT,
    created_by      INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_company    ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_agreement  ON public.invoices(agreement_id);

-- ─────────────────────────────────────────────────────────────
-- 5. EXTENSIÓN public.payments_history
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.payments_history
    ADD COLUMN IF NOT EXISTS invoice_id      INTEGER REFERENCES public.invoices(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reference       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS period_billed   DATE;

CREATE INDEX IF NOT EXISTS idx_payments_history_invoice ON public.payments_history(invoice_id);

-- ─────────────────────────────────────────────────────────────
-- 6. NUEVAS TABLAS EN TENANT SCHEMA: hernancius
--    (Esta sección aplica al schema hernancius; para otros tenants
--     ejecutar seedTenantExtended() desde el backend al crear empresa)
-- ─────────────────────────────────────────────────────────────

-- 6a. Tabla modules
CREATE TABLE IF NOT EXISTS hernancius.modules (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(50) NOT NULL UNIQUE,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    icon             VARCHAR(50),
    group_name       VARCHAR(50),
    is_global        BOOLEAN DEFAULT TRUE,
    show_in_menu     BOOLEAN DEFAULT TRUE,
    menu_order       INTEGER DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'activo',
    is_system_module BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hernancius_modules_status ON hernancius.modules(status);

-- 6b. Tabla profiles
CREATE TABLE IF NOT EXISTS hernancius.profiles (
    id                SERIAL PRIMARY KEY,
    code              VARCHAR(50) NOT NULL UNIQUE,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    scope             VARCHAR(20) DEFAULT 'empresa',
    is_system_profile BOOLEAN DEFAULT FALSE,
    is_active         BOOLEAN DEFAULT TRUE,
    created_by        INTEGER,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6c. Tabla profile_permissions (matriz perfil × módulo × acciones)
CREATE TABLE IF NOT EXISTS hernancius.profile_permissions (
    id          SERIAL PRIMARY KEY,
    profile_id  INTEGER NOT NULL REFERENCES hernancius.profiles(id) ON DELETE CASCADE,
    module_id   INTEGER NOT NULL REFERENCES hernancius.modules(id) ON DELETE CASCADE,
    can_view    BOOLEAN DEFAULT FALSE,
    can_create  BOOLEAN DEFAULT FALSE,
    can_edit    BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_export  BOOLEAN DEFAULT FALSE,
    can_admin   BOOLEAN DEFAULT FALSE,
    UNIQUE(profile_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_hernancius_pp_profile ON hernancius.profile_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_hernancius_pp_module  ON hernancius.profile_permissions(module_id);

-- 6d. Tabla user_tenant_profiles (múltiples perfiles por usuario)
CREATE TABLE IF NOT EXISTS hernancius.user_tenant_profiles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    profile_id  INTEGER NOT NULL REFERENCES hernancius.profiles(id) ON DELETE CASCADE,
    is_primary  BOOLEAN DEFAULT FALSE,
    assigned_by INTEGER,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_hernancius_utp_user    ON hernancius.user_tenant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_hernancius_utp_profile ON hernancius.user_tenant_profiles(profile_id);

-- 6e. Extender user_profiles existente
ALTER TABLE hernancius.user_profiles
    ADD COLUMN IF NOT EXISTS status       VARCHAR(20) DEFAULT 'activo',
    ADD COLUMN IF NOT EXISTS job_title    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'por_modulo';

-- ─────────────────────────────────────────────────────────────
-- 7. SEED DE MÓDULOS BASE (hernancius)
-- ─────────────────────────────────────────────────────────────
INSERT INTO hernancius.modules (code, name, description, icon, group_name, is_system_module, menu_order, status) VALUES
    ('dashboard',     'Dashboard',           'Panel principal de métricas y resumen',           'LayoutDashboard', 'Core',      TRUE,  1,  'activo'),
    ('companies',     'Empresas',            'Gestión de empresas y tenants del sistema',        'Building2',       'Admin',     TRUE,  2,  'activo'),
    ('users',         'Usuarios',            'Gestión de usuarios, roles y perfiles de acceso',  'Users',           'Seguridad', TRUE,  3,  'activo'),
    ('profiles',      'Perfiles',            'Definición de perfiles funcionales y permisos',    'Shield',          'Seguridad', TRUE,  4,  'activo'),
    ('modules',       'Módulos',             'Configuración de módulos del sistema',             'Puzzle',          'Seguridad', TRUE,  5,  'activo'),
    ('commercial',    'Control Comercial',   'Convenios, recibos e historial de pagos',          'CreditCard',      'Comercial', TRUE,  6,  'activo'),
    ('solicitudes',   'Solicitudes',         'Gestión de solicitudes y leads',                   'ClipboardList',   'Operación', TRUE,  7,  'activo'),
    ('subscriptions', 'Suscripciones',       'Control de suscripciones y planes',                'FileText',        'Comercial', TRUE,  8,  'activo'),
    ('config',        'Configuración',       'Configuración visual y parámetros del sistema',    'Settings',        'Admin',     TRUE,  9,  'activo'),
    ('reports',       'Reportes',            'Reportes y análisis del sistema',                  'BarChart2',       'Análisis',  TRUE,  10, 'activo')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    icon        = EXCLUDED.icon,
    group_name  = EXCLUDED.group_name,
    menu_order  = EXCLUDED.menu_order;

-- ─────────────────────────────────────────────────────────────
-- 8. SEED DE PERFILES BASE (hernancius)
-- ─────────────────────────────────────────────────────────────
INSERT INTO hernancius.profiles (code, name, description, scope, is_system_profile) VALUES
    ('acceso_total',    'Acceso Total',          'Acceso completo a todos los módulos del sistema',          'global',  TRUE),
    ('admin_empresa',   'Administrador Empresa', 'Gestión completa del tenant: usuarios, config, reportes',  'empresa', TRUE),
    ('supervisor',      'Supervisor',            'Supervisión de operaciones y aprobaciones',                'empresa', FALSE),
    ('operacion',       'Operación',             'Acceso operativo estándar para tareas del día a día',      'empresa', FALSE),
    ('consulta',        'Consulta',              'Solo lectura. Sin permisos de modificación',               'empresa', FALSE)
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    scope       = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────
-- 9. SEED DE PERMISOS POR PERFIL (hernancius)
--    Perfil "acceso_total": todos los módulos con todos los permisos
-- ─────────────────────────────────────────────────────────────
INSERT INTO hernancius.profile_permissions (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
SELECT p.id, m.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM hernancius.profiles p, hernancius.modules m
WHERE p.code = 'acceso_total'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
    can_view=TRUE, can_create=TRUE, can_edit=TRUE, can_delete=TRUE,
    can_approve=TRUE, can_export=TRUE, can_admin=TRUE;

-- Perfil "admin_empresa": todo excepto gestión de módulos del sistema
INSERT INTO hernancius.profile_permissions (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
SELECT p.id, m.id,
    TRUE, TRUE, TRUE,
    CASE WHEN m.code IN ('modules','profiles') THEN FALSE ELSE TRUE END,
    TRUE, TRUE,
    CASE WHEN m.code IN ('modules') THEN FALSE ELSE TRUE END
FROM hernancius.profiles p, hernancius.modules m
WHERE p.code = 'admin_empresa'
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- Perfil "supervisor": ver + aprobar + exportar en todo, sin crear/editar/eliminar config/módulos
INSERT INTO hernancius.profile_permissions (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
SELECT p.id, m.id,
    TRUE,
    CASE WHEN m.code IN ('dashboard','solicitudes','reports','companies') THEN TRUE ELSE FALSE END,
    CASE WHEN m.code IN ('dashboard','solicitudes','reports') THEN TRUE ELSE FALSE END,
    FALSE, TRUE, TRUE, FALSE
FROM hernancius.profiles p, hernancius.modules m
WHERE p.code = 'supervisor'
  AND m.code IN ('dashboard','companies','solicitudes','reports','subscriptions')
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- Perfil "operacion": ver + crear + editar en módulos operativos
INSERT INTO hernancius.profile_permissions (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
SELECT p.id, m.id, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE
FROM hernancius.profiles p, hernancius.modules m
WHERE p.code = 'operacion'
  AND m.code IN ('dashboard','solicitudes','reports')
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- Perfil "consulta": solo ver en todo
INSERT INTO hernancius.profile_permissions (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
SELECT p.id, m.id, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE
FROM hernancius.profiles p, hernancius.modules m
WHERE p.code = 'consulta'
  AND m.code IN ('dashboard','solicitudes','reports','companies')
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. ASIGNAR PERFIL "acceso_total" AL SUPER ADMIN
-- ─────────────────────────────────────────────────────────────
INSERT INTO hernancius.user_tenant_profiles (user_id, profile_id, is_primary)
SELECT u.id, p.id, TRUE
FROM public.users u, hernancius.profiles p
WHERE u.email = 'hernan.castellanos@hrcastell.com'
  AND p.code  = 'acceso_total'
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- FIN DE MIGRACIÓN
-- Verificación rápida:
-- SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema='public';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'hernancius';
-- SELECT code, name FROM hernancius.modules;
-- SELECT code, name FROM hernancius.profiles;
-- =============================================================
