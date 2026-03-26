-- 02_tenant_tables.sql
-- Template for specific tenant schemas (e.g., 'hernancius')
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
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted if true
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS {schema_name}.permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve', etc.
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
-- Note: Users exist in public.users, here we link them to roles in this specific tenant
CREATE TABLE IF NOT EXISTS {schema_name}.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- Link to public.users(id)
    role_id INTEGER REFERENCES {schema_name}.roles(id),
    custom_settings JSONB, -- UI preferences like theme, density
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. Future Business Tables (Example: Customers)
CREATE TABLE IF NOT EXISTS {schema_name}.customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
