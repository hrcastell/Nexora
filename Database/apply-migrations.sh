#!/bin/bash
# Nexora — apply Database/04_migrations/*.sql against the local Docker dev DB.
#
# LOCAL DEV CONVENIENCE ONLY. This mirrors — but never replaces — what you
# do by hand in production: paste each migration file, in the same order,
# into phpPgAdmin on Bluehost. Nothing here touches production.
#
# Usage (run from the repo root, with `docker compose up -d db` running):
#   ./Database/apply-migrations.sh                            # all, in order
#   ./Database/apply-migrations.sh 44 46                      # by leading number
#   ./Database/apply-migrations.sh 44_inventory_core_module.sql  # by filename
#
# 16 of these files are per-tenant-schema templates that use a literal
# `{schema_name}` placeholder (the same convention as
# BackEnd/templates/tenant_schema.sql), and at least one
# (21_tenant_identity_for_shared_core_tables.sql) also uses `{company_id}`
# — in production you replace both by hand before pasting into phpPgAdmin.
# Locally there is only ever the one bootstrapped tenant, so this script
# substitutes {schema_name} -> $TENANT_SCHEMA (default: hernancius) and
# {company_id} -> that tenant's public.companies.id, resolved from the
# running DB; override the schema by exporting TENANT_SCHEMA before running.
#
# Intentionally excluded from this runner (see docker/README.md for the
# full reasoning behind each):
#   - Database/04_migrations/reset_admin_empresa_permissions.sql
#       One-off operational data-fix script for an already-existing tenant's
#       permission rows (UPDATEs, no CREATE), not a repeatable schema
#       migration. It also has no leading number, so it never matches the
#       sequential-file pattern this script applies below.
#   - Database/migracion.sql
#       Legacy pre-{schema_name}-template snapshot: byte-for-byte the same
#       content as Database/04_migrations/14_garage_operations_module.sql
#       except with 'hernancius' hardcoded instead of the {schema_name}
#       placeholder. Superseded by that file; not part of Database/04_migrations/
#       at all, so the *.sql glob below never touches it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/04_migrations"
COMPOSE_SERVICE="db"

cd "$SCRIPT_DIR/.."

# Pick up POSTGRES_USER / POSTGRES_DB from a local .env if present, so this
# script always talks to the same database docker-compose.yml configured.
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-nexora}"
POSTGRES_DB="${POSTGRES_DB:-nexora_db}"
TENANT_SCHEMA="${TENANT_SCHEMA:-hernancius}"

# A few migrations (e.g. 21_tenant_identity_for_shared_core_tables.sql) are
# meant to be run once per tenant with BOTH {schema_name} and {company_id}
# replaced by hand (per their own header comment) — {company_id} is that
# tenant's public.companies.id. Resolve it from the running DB so those
# files apply cleanly too; harmless no-op sed for files that don't use it.
COMPANY_ID="$(
    docker compose exec -T "$COMPOSE_SERVICE" \
        psql -tA --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -c "SELECT id FROM public.companies WHERE schema_name = '${TENANT_SCHEMA}' LIMIT 1;" \
        2>/dev/null | tr -d '[:space:]'
)"

# Migrations confirmed OBSOLETE for a fresh install: they transitioned an
# OLD schema shape (e.g. pre-rename column names) to the CURRENT shape that
# BackEnd/templates/tenant_schema.sql already bootstraps directly. Running
# them against a freshly bootstrapped schema fails not because the SQL is
# wrong, but because their starting assumption (the old shape) no longer
# exists — the target state was already reached at bootstrap time. These
# stay valid, unedited history for upgrading a real pre-existing tenant.
SUPERSEDED_FOR_FRESH_INSTALL=(
    "29_dental_consultation_services_data_migration.sql"  # operates on dental_consultations.service_id, renamed to treatment_id by migration 35; tenant_schema.sql already creates treatment_id
    "35_dental_rename_service_to_treatment.sql"            # the rename itself: tries to DROP the pre-rename dental_treatments shape, but tenant_schema.sql already bootstraps the post-rename shape with live FKs depending on it
)

is_superseded() {
    local base="$1"
    for s in "${SUPERSEDED_FOR_FRESH_INSTALL[@]}"; do
        [ "$base" = "$s" ] && return 0
    done
    return 1
}

# Collect eligible migration files: filename must start with digits + "_".
# This automatically excludes reset_admin_empresa_permissions.sql (no
# leading number) without needing a separate denylist.
all_files=()
for f in "$MIGRATIONS_DIR"/*.sql; do
    base="$(basename "$f")"
    if is_superseded "$base"; then
        echo "[apply-migrations] skipping superseded-for-fresh-install file: $base"
        continue
    fi
    case "$base" in
        [0-9]*_*) all_files+=("$f") ;;
        *) echo "[apply-migrations] skipping non-sequential file: $base" ;;
    esac
done

# Sort numerically by leading number, then alphabetically as a tiebreaker.
# This correctly places e.g. 35_ before 35b_ before 36_, and stays correct
# even if a future migration number isn't zero-padded to 2 digits (e.g. 100_).
sorted_files=""
if [ "${#all_files[@]}" -gt 0 ]; then
    sorted_files=$(
        for f in "${all_files[@]}"; do
            base="$(basename "$f")"
            num="$(echo "$base" | grep -oE '^[0-9]+')"
            # Force base-10: bash's printf treats a leading-zero numeric
            # string (e.g. "08", "09") as octal, and 8/9 aren't valid octal
            # digits — that silently corrupted the sort key and reordered
            # migrations ahead of ones they actually depend on.
            printf '%05d\t%s\t%s\n' "$((10#$num))" "$base" "$f"
        done | sort -k1,1n -k2,2 | cut -f3
    )
fi

# Optional filter: caller can pass leading numbers or exact filenames.
if [ "$#" -gt 0 ] && [ -n "$sorted_files" ]; then
    filtered=()
    while IFS= read -r f; do
        base="$(basename "$f")"
        num="$(echo "$base" | grep -oE '^[0-9]+')"
        for arg in "$@"; do
            if [ "$arg" = "$base" ] || [ "$arg" = "$num" ]; then
                filtered+=("$f")
            fi
        done
    done <<< "$sorted_files"
    sorted_files=""
    if [ "${#filtered[@]}" -gt 0 ]; then
        sorted_files=$(printf '%s\n' "${filtered[@]}")
    fi
fi

if [ -z "$sorted_files" ]; then
    echo "[apply-migrations] nothing to apply."
    exit 0
fi

echo "[apply-migrations] applying against database '${POSTGRES_DB}' (compose service: ${COMPOSE_SERVICE}, tenant schema: ${TENANT_SCHEMA}, company id: ${COMPANY_ID:-unresolved})"
while IFS= read -r f; do
    [ -n "$f" ] || continue
    echo "[apply-migrations] -> $(basename "$f")"
    # A handful of files (40-43, 54, ...) use {schema} instead of
    # {schema_name} for the same placeholder — inconsistent naming across
    # the migration set, not a different convention; both map to TENANT_SCHEMA.
    sed -e "s/{schema_name}/${TENANT_SCHEMA}/g" -e "s/{schema}/${TENANT_SCHEMA}/g" -e "s/{company_id}/${COMPANY_ID}/g" "$f" \
        | docker compose exec -T "$COMPOSE_SERVICE" \
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
done <<< "$sorted_files"

echo "[apply-migrations] done."
