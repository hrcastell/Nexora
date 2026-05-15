-- tenant_schema.sql
-- Template for specific tenant schemas
-- Replace {schema_name} with the actual schema name when running.

-- 1. Company Config (Local preferences)
CREATE TABLE IF NOT EXISTS {schema_name}.config_company (
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

-- 2. Roles (RBAC Local)
CREATE TABLE IF NOT EXISTS {schema_name}.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS {schema_name}.permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

-- 4. Role Permissions
CREATE TABLE IF NOT EXISTS {schema_name}.role_permissions (
    role_id INTEGER REFERENCES {schema_name}.roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES {schema_name}.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. User Profiles (Local User Settings & Role Assignment)
CREATE TABLE IF NOT EXISTS {schema_name}.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER REFERENCES {schema_name}.roles(id),
    custom_settings JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'activo',
    job_title VARCHAR(100),
    access_level VARCHAR(20) DEFAULT 'por_modulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. [DEPRECATED] Modules tenant-local — NO CREAR en nuevos tenants
-- El catálogo de módulos vive en public.module_catalog (global).
-- La asignación empresa↔módulo vive en public.company_modules.
-- La tabla {schema}.modules era un duplicado sin uso real en el menú/permisos.
-- Mantenida aquí solo como referencia histórica. NO descomentar.
--
-- CREATE TABLE IF NOT EXISTS {schema_name}.modules (
--     id SERIAL PRIMARY KEY,
--     code VARCHAR(50) NOT NULL UNIQUE,
--     name VARCHAR(100) NOT NULL,
--     description TEXT,
--     icon VARCHAR(50),
--     group_name VARCHAR(50),
--     is_global BOOLEAN DEFAULT TRUE,
--     show_in_menu BOOLEAN DEFAULT TRUE,
--     menu_order INTEGER DEFAULT 0,
--     status VARCHAR(20) DEFAULT 'activo',
--     is_system_module BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- 7. Profiles (Functional access groups)
CREATE TABLE IF NOT EXISTS {schema_name}.profiles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scope VARCHAR(20) DEFAULT 'empresa',
    is_system_profile BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Profile Transaction Permissions (Matrix: profile x transaction x actions)
-- Referencias por código de transacción (public.module_transactions.code) para evitar FK cross-schema.
CREATE TABLE IF NOT EXISTS {schema_name}.profile_transaction_permissions (
    id               SERIAL PRIMARY KEY,
    profile_id       INT         NOT NULL,
    transaction_code VARCHAR(80) NOT NULL,
    can_view         BOOLEAN     NOT NULL DEFAULT FALSE,
    can_create       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_edit         BOOLEAN     NOT NULL DEFAULT FALSE,
    can_delete       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_approve      BOOLEAN     NOT NULL DEFAULT FALSE,
    can_export       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_admin        BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ptp_profile_tx  UNIQUE (profile_id, transaction_code),
    CONSTRAINT fk_ptp_profile     FOREIGN KEY (profile_id)
        REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ptp_profile_id ON {schema_name}.profile_transaction_permissions (profile_id);
CREATE INDEX IF NOT EXISTS idx_ptp_tx_code    ON {schema_name}.profile_transaction_permissions (transaction_code);

-- 9. [DEPRECATED] Profile Permissions legacy (Matrix: profile x module x actions)
-- Reemplazada por profile_transaction_permissions (granularidad por transacción).
-- No se usa en ningún endpoint activo del sistema de permisos del menú.
-- La UI de ProfilesView opera exclusivamente sobre profile_transaction_permissions.
-- Mantenida aquí solo como referencia. NO descomentar en nuevos tenants.
--
-- CREATE TABLE IF NOT EXISTS {schema_name}.profile_permissions (
--     id SERIAL PRIMARY KEY,
--     profile_id INTEGER NOT NULL REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE,
--     module_id  INTEGER NOT NULL,  -- era FK a {schema}.modules (también deprecated)
--     can_view   BOOLEAN DEFAULT FALSE,
--     can_create BOOLEAN DEFAULT FALSE,
--     can_edit   BOOLEAN DEFAULT FALSE,
--     can_delete BOOLEAN DEFAULT FALSE,
--     can_approve BOOLEAN DEFAULT FALSE,
--     can_export BOOLEAN DEFAULT FALSE,
--     can_admin  BOOLEAN DEFAULT FALSE,
--     UNIQUE(profile_id, module_id)
-- );

-- 10. User Tenant Profiles (Multiple profiles per user)
CREATE TABLE IF NOT EXISTS {schema_name}.user_tenant_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id)
);

-- 11. Customers
CREATE TABLE IF NOT EXISTS {schema_name}.customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
