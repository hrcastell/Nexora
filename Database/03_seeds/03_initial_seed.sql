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
-- (This should run after tenant tables are created in 'hernancius')

-- INSERT INTO hernancius.config_company ...
-- INSERT INTO hernancius.roles ...
