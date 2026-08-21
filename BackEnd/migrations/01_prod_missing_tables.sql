-- =============================================================
-- MIGRATION: 01_prod_missing_tables.sql
-- Aplica tablas faltantes en producción sin romper datos existentes.
-- Ejecutar como superuser sobre la base de datos de producción.
-- =============================================================

-- ─── 1. Tabla public.payments_history (si no existe) ─────────
CREATE TABLE IF NOT EXISTS public.payments_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE,
    notes TEXT,
    registered_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_history_company      ON public.payments_history(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_history_subscription ON public.payments_history(subscription_id);

-- ─── 2. Tablas del schema hernancius (si no existen) ─────────
--      Reemplaza 'hernancius' si el schema_name de tu empresa base es diferente.

CREATE TABLE IF NOT EXISTS hernancius.config_company (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    country VARCHAR(100),
    rut VARCHAR(20),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    font_family VARCHAR(50) DEFAULT 'Inter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hernancius.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hernancius.permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS hernancius.role_permissions (
    role_id INTEGER REFERENCES hernancius.roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES hernancius.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS hernancius.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER REFERENCES hernancius.roles(id),
    custom_settings JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ─── 3. Seed roles base en hernancius ────────────────────────
INSERT INTO hernancius.roles (name, description, is_system_role) VALUES
    ('super_admin', 'Acceso total a la aplicación. Rol de sistema.', TRUE),
    ('admin',       'Administrador de la empresa. Gestión completa.', TRUE),
    ('user',        'Usuario estándar con acceso de lectura y creación.', TRUE),
    ('viewer',      'Solo lectura. Sin permisos de modificación.', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system_role = EXCLUDED.is_system_role;

-- ─── 4. Seed permisos base ───────────────────────────────────
INSERT INTO hernancius.permissions (module, action, description) VALUES
    ('dashboard','view','Ver dashboard'),('dashboard','create','Crear en dashboard'),
    ('dashboard','edit','Editar dashboard'),('dashboard','delete','Eliminar en dashboard'),
    ('dashboard','approve','Aprobar en dashboard'),
    ('companies','view','Ver empresas'),('companies','create','Crear empresas'),
    ('companies','edit','Editar empresas'),('companies','delete','Eliminar empresas'),
    ('companies','approve','Aprobar empresas'),
    ('solicitudes','view','Ver solicitudes'),('solicitudes','create','Crear solicitudes'),
    ('solicitudes','edit','Editar solicitudes'),('solicitudes','delete','Eliminar solicitudes'),
    ('solicitudes','approve','Aprobar solicitudes'),
    ('subscriptions','view','Ver suscripciones'),('subscriptions','create','Crear suscripciones'),
    ('subscriptions','edit','Editar suscripciones'),('subscriptions','delete','Eliminar suscripciones'),
    ('subscriptions','approve','Aprobar suscripciones'),
    ('users','view','Ver usuarios'),('users','create','Invitar usuarios'),
    ('users','edit','Editar usuarios'),('users','delete','Eliminar usuarios'),
    ('users','approve','Aprobar usuarios'),
    ('config','view','Ver config'),('config','create','Crear config'),
    ('config','edit','Editar config'),('config','delete','Eliminar config'),
    ('config','approve','Aprobar config'),
    ('reports','view','Ver reportes'),('reports','create','Crear reportes'),
    ('reports','edit','Editar reportes'),('reports','delete','Eliminar reportes'),
    ('reports','approve','Aprobar reportes')
ON CONFLICT (module, action) DO NOTHING;

-- ─── 5. Matriz RBAC ──────────────────────────────────────────
-- super_admin y admin: todos los permisos
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r, hernancius.permissions p
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- user: view+create+edit en módulos básicos
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r
JOIN hernancius.permissions p
    ON p.module IN ('dashboard','companies','solicitudes','reports')
    AND p.action IN ('view','create','edit')
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- viewer: solo view
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r
JOIN hernancius.permissions p
    ON p.module IN ('dashboard','companies','solicitudes','reports')
    AND p.action = 'view'
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- ─── 6. Asignar super_admin al administrador del sistema ─────
INSERT INTO hernancius.user_profiles (user_id, role_id, is_active)
SELECT u.id, r.id, TRUE
FROM public.users u, hernancius.roles r
WHERE u.email = 'hernan.castellanos@hrcastell.com'
  AND r.name  = 'super_admin'
ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- ─── FIN DE MIGRACIÓN ────────────────────────────────────────
-- Verificación rápida:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'hernancius';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments_history';
