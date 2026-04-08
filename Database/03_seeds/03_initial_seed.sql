-- 03_initial_seed.sql
-- Seed data for the system

-- 1. Create the Super Admin User (Immutable)
-- Password: N@nreh26* (Hash needs to be generated. Using a placeholder hash for now, needs update with real bcrypt hash)
-- For dev purposes assuming a known hash or update manually later.
INSERT INTO public.users (email, password_hash, full_name, is_super_admin, is_active)
VALUES (
    'hernan.castellanos@hrcastell.com',
    '$2b$10$utnv1FUyRJpUmVtexVRFwueC.H.O8NgT7tXBdxGxsAEyqTRZeSyGe', -- Hash for: N@nreh26*
    'Hernan Ricardo Castellanos Castillo',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- 2. Create the Core Company (HrCastell Systems Core)
INSERT INTO public.companies (name, schema_name, rut, contact_email, contact_phone, address, country, is_active, plan_type)
VALUES (
    'HrCastell Systems Core',
    'hernancius',
    '24.848.246-k',
    'hernan.castellanos@hrcastell.com',
    '+56973126500',
    'Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana',
    'Chile',
    TRUE,
    'enterprise'
) ON CONFLICT (schema_name) DO NOTHING;

-- 3. Associate Super Admin with Core Company
INSERT INTO public.company_users (company_id, user_id, is_company_admin)
SELECT c.id, u.id, TRUE
FROM public.companies c, public.users u
WHERE c.schema_name = 'hernancius' AND u.email = 'hernan.castellanos@hrcastell.com'
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 4. Initialize 'hernancius' schema (This part usually requires creating the schema first)
CREATE SCHEMA IF NOT EXISTS hernancius;

-- Note: Tables for 'hernancius' should be created using the 02_tenant_tables.sql template replacing {schema_name} with 'hernancius'

-- 5. Seed 'hernancius' specific data
-- (Run after tenant tables are created in 'hernancius' via 02_tenant_tables.sql)

-- 5a. Config company for hernancius
INSERT INTO hernancius.config_company (company_name, country, rut, address, email, phone, primary_color, secondary_color, font_family)
VALUES (
    'HrCastell Systems Core',
    'Chile',
    '24.848.246-k',
    'Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana',
    'hernan.castellanos@hrcastell.com',
    '+56973126500',
    '#D4AF37',
    '#1a2e5a',
    'Inter'
) ON CONFLICT DO NOTHING;

-- 5b. Roles base (system roles — cannot be deleted)
INSERT INTO hernancius.roles (name, description, is_system_role) VALUES
    ('super_admin', 'Acceso total a la aplicación. Rol de sistema reservado para el operador de la plataforma.', TRUE),
    ('admin',       'Administrador de la empresa. Gestión completa del tenant.',                                  TRUE),
    ('user',        'Usuario estándar con acceso de lectura y creación.',                                         TRUE),
    ('viewer',      'Solo lectura. Sin permisos de modificación.',                                                TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system_role = EXCLUDED.is_system_role;

-- 5c. Permissions (module x action)
INSERT INTO hernancius.permissions (module, action, description) VALUES
    ('dashboard',     'view',    'Ver el dashboard'),
    ('dashboard',     'create',  'Crear widgets/reportes en dashboard'),
    ('dashboard',     'edit',    'Editar el dashboard'),
    ('dashboard',     'delete',  'Eliminar elementos del dashboard'),
    ('dashboard',     'approve', 'Aprobar cambios en dashboard'),
    ('companies',     'view',    'Ver empresas'),
    ('companies',     'create',  'Crear empresas'),
    ('companies',     'edit',    'Editar empresas'),
    ('companies',     'delete',  'Eliminar empresas'),
    ('companies',     'approve', 'Aprobar acciones sobre empresas'),
    ('solicitudes',   'view',    'Ver solicitudes'),
    ('solicitudes',   'create',  'Crear solicitudes'),
    ('solicitudes',   'edit',    'Editar solicitudes'),
    ('solicitudes',   'delete',  'Eliminar solicitudes'),
    ('solicitudes',   'approve', 'Aprobar solicitudes'),
    ('subscriptions', 'view',    'Ver suscripciones'),
    ('subscriptions', 'create',  'Crear suscripciones'),
    ('subscriptions', 'edit',    'Editar suscripciones'),
    ('subscriptions', 'delete',  'Eliminar suscripciones'),
    ('subscriptions', 'approve', 'Aprobar pagos/suscripciones'),
    ('users',         'view',    'Ver usuarios'),
    ('users',         'create',  'Crear/invitar usuarios'),
    ('users',         'edit',    'Editar usuarios'),
    ('users',         'delete',  'Eliminar usuarios'),
    ('users',         'approve', 'Aprobar acceso de usuarios'),
    ('config',        'view',    'Ver configuración'),
    ('config',        'create',  'Crear configuración'),
    ('config',        'edit',    'Editar configuración'),
    ('config',        'delete',  'Eliminar configuración'),
    ('config',        'approve', 'Aprobar cambios de configuración'),
    ('reports',       'view',    'Ver reportes'),
    ('reports',       'create',  'Crear reportes'),
    ('reports',       'edit',    'Editar reportes'),
    ('reports',       'delete',  'Eliminar reportes'),
    ('reports',       'approve', 'Aprobar reportes')
ON CONFLICT (module, action) DO NOTHING;

-- 5d. Role-Permission matrix
-- super_admin y admin: acceso total
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r, hernancius.permissions p
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- user: view + create + edit en dashboard, companies, solicitudes, reports
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r
JOIN hernancius.permissions p ON p.module IN ('dashboard', 'companies', 'solicitudes', 'reports')
                              AND p.action  IN ('view', 'create', 'edit')
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- viewer: solo view en dashboard, companies, solicitudes, reports
INSERT INTO hernancius.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hernancius.roles r
JOIN hernancius.permissions p ON p.module IN ('dashboard', 'companies', 'solicitudes', 'reports')
                              AND p.action  = 'view'
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- 5e. Asignar rol super_admin al usuario administrador del sistema en hernancius
INSERT INTO hernancius.user_profiles (user_id, role_id, is_active)
SELECT u.id, r.id, TRUE
FROM public.users u, hernancius.roles r
WHERE u.email  = 'hernan.castellanos@hrcastell.com'
  AND r.name   = 'super_admin'
ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;
