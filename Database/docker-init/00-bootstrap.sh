#!/bin/bash
# Nexora — local Docker dev DB bootstrap.
#
# Runs ONCE, automatically, by the official postgres image's entrypoint —
# only on first container start against an EMPTY data volume. This is a
# local dev convenience only; it mirrors, but never replaces, the manual
# phpPgAdmin bootstrap process used in production on Bluehost.
#
# docker-entrypoint-initdb.d only looks at files directly inside itself, in
# flat lexical order — it does not recurse into subfolders. So this wrapper
# script (mounted as /docker-entrypoint-initdb.d/00-bootstrap.sh) is what
# actually drives the real order, by explicitly applying each Database/
# folder's *.sql files in sequence:
#
#   00_core             -> roles / prerequisites (safe to fail on shared
#                          hosting without CREATE ROLE privileges; local
#                          Docker Postgres always has it)
#   01_public_schema    -> public schema (SaaS core): users, companies,
#                          subscriptions, module_catalog, company_modules,
#                          payments_history, etc.
#   tenant_schema.sql   -> creates the 'hernancius' MASTER schema by
#                          applying BackEnd/templates/tenant_schema.sql (the
#                          exact file the app executes at runtime for every
#                          new company) with {schema_name} substituted for
#                          'hernancius'. That file is NOT edited, only read.
#                          Deliberately NOT sourced from
#                          Database/02_company_template/02_tenant_tables.sql:
#                          that copy is stale (507 lines vs. 1971 in the real
#                          template) and contains invalid SQL
#                          (`ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`,
#                          which Postgres has never supported), confirmed by
#                          actually running it against this container.
#   03_seeds            -> seeds public.users / public.companies (hernancius,
#                          is_master = TRUE) and hernancius.* governance rows
#                          (roles, permissions, config_company)
#
# Database/04_migrations/*.sql is intentionally NOT applied here — new
# migration files get added over time, and docker-entrypoint-initdb.d only
# ever fires once against an empty volume. Use Database/apply-migrations.sh
# against the running container instead (see docker/README.md).

set -e

psql_run() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "$@"
}

run_sql_dir() {
    local dir="$1"
    for f in "$dir"/*.sql; do
        [ -e "$f" ] || continue
        echo "[bootstrap] applying $f"
        psql_run -f "$f"
    done
}

echo "[bootstrap] == 00_core =="
run_sql_dir /docker-entrypoint-initdb.d/sql/00_core

# Several files under Database/04_migrations/ (applied later, via
# Database/apply-migrations.sh) end with GRANT statements to the real
# Bluehost cPanel database user, hardcoded as 'hernanci_nexoragarage'
# (and, in one file, 'hernanci' for another tenant's schema). Neither role
# exists in a fresh local Postgres. Rather than patch/skip those migration
# files, create harmless NOLOGIN placeholder roles so the GRANTs succeed
# as no-ops locally — nothing can ever authenticate as them.
echo "[bootstrap] == local-only placeholder roles for embedded prod GRANTs =="
psql_run <<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hernanci_nexoragarage') THEN
        CREATE ROLE hernanci_nexoragarage NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hernanci') THEN
        CREATE ROLE hernanci NOLOGIN;
    END IF;
END
$$;
SQL

# Database/04_migrations/03_fix_permissions.sql also has a later,
# hand-appended block granting default privileges on 'pch_motoservices' —
# a real production client schema that has no reason to exist locally.
# Create it empty (no tables) purely so that trailing GRANT doesn't abort
# the whole migration chain; nothing ever gets stored in it.
echo "[bootstrap] == empty placeholder schema for a prod-only client (pch_motoservices) =="
psql_run -c "CREATE SCHEMA IF NOT EXISTS pch_motoservices;"

echo "[bootstrap] == 01_public_schema =="
run_sql_dir /docker-entrypoint-initdb.d/sql/01_public_schema

echo "[bootstrap] == tenant_schema.sql: creating hernancius master schema =="
psql_run -c "CREATE SCHEMA IF NOT EXISTS hernancius;"
sed 's/{schema_name}/hernancius/g' /docker-entrypoint-initdb.d/sql/tenant_schema.sql | psql_run

echo "[bootstrap] == 03_seeds =="
run_sql_dir /docker-entrypoint-initdb.d/sql/03_seeds

echo "[bootstrap] == bootstrap complete =="
