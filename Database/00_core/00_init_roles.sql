-- 00_init_roles.sql
-- Setup initial database roles if possible in the environment.
-- In shared hosting (cPanel), you might not have permissions to create roles,
-- so this is mostly for local development or documentation.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nexora_app') THEN
        CREATE ROLE nexora_app WITH LOGIN PASSWORD 'local_dev_password';
    END IF;
END
$$;
