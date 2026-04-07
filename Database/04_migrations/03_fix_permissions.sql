-- =============================================================
-- PATCH: 03_fix_permissions.sql
-- Corrige permisos del usuario de aplicación (hernanci_nexoragarage)
-- sobre objetos creados por la migración 02 (ejecutada como superuser).
--
-- CÓMO EJECUTAR EN HOSTING COMPARTIDO (sin terminal):
--   1. Ir a cPanel → phpPgAdmin
--   2. Seleccionar la base de datos del proyecto
--   3. Clic en "SQL" (pestaña superior)
--   4. Pegar TODO este archivo y ejecutar
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SCHEMA hernancius  →  USAGE + tablas + secuencias
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA hernancius TO hernanci_nexoragarage;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA hernancius
    TO hernanci_nexoragarage;

GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA hernancius
    TO hernanci_nexoragarage;

-- Permisos automáticos para objetos FUTUROS en hernancius
ALTER DEFAULT PRIVILEGES IN SCHEMA hernancius
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hernanci_nexoragarage;

ALTER DEFAULT PRIVILEGES IN SCHEMA hernancius
    GRANT USAGE, SELECT ON SEQUENCES TO hernanci_nexoragarage;

-- ─────────────────────────────────────────────────────────────
-- 2. Nuevas tablas en public  (creadas en migración 02)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_agreements TO hernanci_nexoragarage;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices            TO hernanci_nexoragarage;

GRANT USAGE, SELECT ON SEQUENCE public.payment_agreements_id_seq TO hernanci_nexoragarage;
GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq           TO hernanci_nexoragarage;

-- ─────────────────────────────────────────────────────────────
-- 3. Secuencia users_id_seq  (necesaria para INSERT en public.users)
-- ─────────────────────────────────────────────────────────────
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO hernanci_nexoragarage;

-- ─────────────────────────────────────────────────────────────
-- 4. Para futuros tenants: repetir bloque 1 con el nuevo schema
--    GRANT USAGE ON SCHEMA nuevo_tenant TO hernanci_nexoragarage;
--    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA nuevo_tenant TO hernanci_nexoragarage;
--    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA nuevo_tenant TO hernanci_nexoragarage;
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (ejecutar por separado luego de aplicar el parche)
-- ─────────────────────────────────────────────────────────────
-- SELECT has_schema_privilege('hernanci_nexoragarage', 'hernancius', 'USAGE')                AS schema_ok;
-- SELECT has_table_privilege('hernanci_nexoragarage', 'hernancius.modules', 'SELECT')        AS modules_ok;
-- SELECT has_table_privilege('hernanci_nexoragarage', 'hernancius.profiles', 'INSERT')       AS profiles_ok;
-- SELECT has_table_privilege('hernanci_nexoragarage', 'public.invoices', 'INSERT')           AS invoices_ok;
-- SELECT has_table_privilege('hernanci_nexoragarage', 'public.payment_agreements', 'INSERT') AS agreements_ok;
-- SELECT has_sequence_privilege('hernanci_nexoragarage', 'public.users_id_seq', 'USAGE')     AS users_seq_ok;
