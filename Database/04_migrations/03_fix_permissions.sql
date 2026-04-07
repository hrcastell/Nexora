-- =============================================================
-- PATCH: 03_fix_permissions.sql
-- Corrige permisos del usuario de aplicación sobre objetos
-- creados por la migración 02 (ejecutada como superuser).
--
-- PROBLEMA: Las tablas/secuencias nuevas son propiedad del
-- superuser (postgres). El usuario de la app (DATABASE_URL)
-- no tiene acceso a ellas.
--
-- EJECUTAR COMO SUPERUSER con psql:
--   psql -U postgres -d NOMBRE_BD \
--        -v app_user='TU_USUARIO_APP' \
--        -f 03_fix_permissions.sql
--
-- Para identificar TU_USUARIO_APP, leer DATABASE_URL en .env:
--   postgresql://USUARIO:PASSWORD@HOST/DBNAME
--                ^^^^^^^^ este es el valor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SCHEMA hernancius  →  USAGE + tablas + secuencias
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA hernancius TO :"app_user";

GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA hernancius
    TO :"app_user";

GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA hernancius
    TO :"app_user";

-- Permisos automáticos para objetos FUTUROS en hernancius
-- (nuevos tenants creados via seedTenantExtended también los hereda)
ALTER DEFAULT PRIVILEGES IN SCHEMA hernancius
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA hernancius
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";

-- ─────────────────────────────────────────────────────────────
-- 2. Nuevas tablas en public  (creadas en migración 02)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_agreements TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices            TO :"app_user";

GRANT USAGE, SELECT ON SEQUENCE public.payment_agreements_id_seq TO :"app_user";
GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq           TO :"app_user";

-- ─────────────────────────────────────────────────────────────
-- 3. Secuencia users_id_seq  (necesaria para INSERT en public.users)
-- ─────────────────────────────────────────────────────────────
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO :"app_user";

-- ─────────────────────────────────────────────────────────────
-- 4. Si hay otros schemas tenant activos, repetir el bloque 1
--    sustituyendo "hernancius" por el schema correspondiente.
--    Ej:  GRANT USAGE ON SCHEMA otro_tenant TO :"app_user";
--         GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA otro_tenant TO :"app_user";
--         GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA otro_tenant TO :"app_user";
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN RÁPIDA (descomentar para probar)
-- ─────────────────────────────────────────────────────────────
-- SELECT has_schema_privilege(:'app_user', 'hernancius', 'USAGE')           AS schema_ok;
-- SELECT has_table_privilege(:'app_user', 'hernancius.modules', 'SELECT')   AS modules_ok;
-- SELECT has_table_privilege(:'app_user', 'hernancius.profiles', 'INSERT')  AS profiles_ok;
-- SELECT has_table_privilege(:'app_user', 'public.invoices', 'INSERT')      AS invoices_ok;
-- SELECT has_table_privilege(:'app_user', 'public.payment_agreements', 'INSERT') AS agreements_ok;
-- SELECT has_sequence_privilege(:'app_user', 'public.users_id_seq', 'USAGE')     AS users_seq_ok;
