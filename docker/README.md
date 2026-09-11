# Local development with Docker

This stack (`docker-compose.yml` at the repo root, plus this folder) exists
purely to make local development convenient: Postgres 10.23, the backend
with hot reload, and the frontend with hot reload, all in one command.

**It is completely separate from the Bluehost production deploy process,
which remains unchanged.** Production has no Docker, no PM2, no container
runtime: the backend is deployed and managed via cPanel's "Setup Node.js
App", and every SQL migration is pasted by hand, in order, into phpPgAdmin.
Nothing in this folder or in `docker-compose.yml` talks to production, reads
production credentials, or should ever be pointed at a production database.

## Prerequisites

- Docker Desktop (or an equivalent Docker Engine + Compose v2 install)
- That's it — Node.js does not need to be installed on the host; it only
  runs inside the containers.

## First-time setup

```bash
cp docker/env.example .env
```

Edit `.env` if you want different local credentials (defaults are fine for
local-only use). This tool's write permissions block creating files
literally named `.env*`, which is why the template here is `env.example`
rather than the more conventional `.env.example` — functionally identical,
just copy it to `.env` at the repo root as shown above.

## Starting the stack

```bash
docker compose up
```

This builds the `backend` and `frontend` images and starts all three
services. First run only:

- `db` initializes an **empty** Postgres 10.23 data volume and automatically
  runs `Database/docker-init/00-bootstrap.sh`, which applies (in this exact
  order):
  1. `Database/00_core/` — prerequisite roles
  2. `Database/01_public_schema/` — the `public` schema (SaaS core): users,
     companies, subscriptions, module catalog, `payments_history`, etc.
  3. `BackEnd/templates/tenant_schema.sql`, with `{schema_name}` substituted
     for `hernancius` — creating the **hernancius master schema**. This is
     the exact file the app executes at runtime for every new company; it is
     read-only here, never modified. **Not** sourced from
     `Database/02_company_template/02_tenant_tables.sql` — verified while
     testing this stack that the latter is a stale reference copy (507 lines
     vs. 1971 in the real template) and contains invalid SQL
     (`ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`, which Postgres has
     never supported), which aborted the bootstrap the first time this was
     tried.
  4. `Database/03_seeds/03_initial_seed.sql` — seeds the super admin user,
     the `hernancius` company row (`is_master = TRUE`), and hernancius's own
     roles/permissions/config rows.

  This only ever runs once. If you need to reset the local database from
  scratch, remove the named volume: `docker compose down -v`.

- `backend` runs `nodemon server.js` against the bind-mounted `BackEnd/`
  source, reachable at `http://localhost:8090`.
- `frontend` runs `vite --host 0.0.0.0` against the bind-mounted
  `FrontEnd/Portal/` source, reachable at `http://localhost:5173`.

Edits to either `BackEnd/` or `FrontEnd/Portal/` on the host are picked up
live inside the containers.

## Applying new files from `BackEnd/migrations/`

### Required once for a fresh local database

The current bootstrap creates the base public tables and current tenant
template, but does not include all historical public-schema changes or
module seeds. The backend runner assumes migrations before 66 already
exist. After the first `docker compose up -d --build`, complete them with:

```bash
bash ./Database/apply-migrations.sh
docker compose restart backend
```

On Windows PowerShell with Git for Windows:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' ./Database/apply-migrations.sh
docker compose restart backend
```

Run this only for the fresh local database. Subsequent starts use the
backend's automatic migration runner. Default host ports are 5173 (portal),
8090 (backend), and 5432 (database); check listening ports and the port
bindings of stopped containers before starting another stack.

### Subsequent migrations

`docker-entrypoint-initdb.d` (and therefore step 4 above) only ever runs
once, against an empty volume — it will never pick up new migration files
added later. That's expected: it only bootstraps an empty database.

New migrations are applied automatically instead: `BackEnd/migrations/runner.js`
runs on every backend boot (`server.js`, before `app.listen()`), tracked
per-schema in `public.schema_migrations` so each one only actually executes
once. Since `backend` runs via `nodemon`, this means every hot-reload
restart also re-checks for pending migrations — just restart the stack (or
save any backend file) after adding a new one and watch the logs.

For running a specific migration on demand, or debugging outside that flow:

```bash
./Database/apply-migrations.sh              # apply every migration, in order
./Database/apply-migrations.sh 44            # apply only migration 44
./Database/apply-migrations.sh 44_inventory_core_module.sql
```

It sorts files by their **leading number** (not plain alphabetical order),
so `35_...` correctly runs before `35b_...` and before `36_...`, and stays
correct even if a future migration number isn't zero-padded.

Two things it handles automatically, discovered while actually running the
full sequence against this stack:

- **Most per-tenant files use the `{schema_name}` placeholder** (same
  convention as `BackEnd/templates/tenant_schema.sql`); a handful
  (`40`-`43`, `54`) instead use `{schema}` for the exact same thing —
  inconsistent naming across the migration set, not a different meaning.
  `21_tenant_identity_for_shared_core_tables.sql` also uses `{company_id}`.
  In production you replace these by hand with the target company's schema
  (and, for `21`, its `public.companies.id`) before pasting into phpPgAdmin.
  Locally there's only the one bootstrapped tenant, so the script
  substitutes `{schema_name}` and `{schema}` → `hernancius`, and
  `{company_id}` → that tenant's real id (resolved from the running DB),
  automatically. Export `TENANT_SCHEMA=other_name` before running if you've
  created additional local companies.
- **7 files end with `GRANT ... TO hernanci_nexoragarage`** (Bluehost's real
  cPanel database role; one file also grants to `hernanci`) — neither role
  exists on a fresh local Postgres, which aborted the very first test run of
  this stack at migration 03. `Database/docker-init/00-bootstrap.sh` now
  creates both as harmless `NOLOGIN` placeholder roles so those GRANTs
  succeed as no-ops locally; nothing can ever authenticate as them.
- **`03_fix_permissions.sql` also has a later, hand-appended block** granting
  default privileges on `pch_motoservices` — a real production client
  schema. The bootstrap script creates it locally too, empty, purely so that
  trailing statement doesn't abort the chain.

Three migration files were found to have **real, environment-independent
bugs** — fixed in place, since they'd fail identically if pasted into
phpPgAdmin as-is:

- **`06_profile_transaction_permissions.sql`** — a `RAISE NOTICE` used
  doubled single-quotes (`''text''`) outside any dynamic `EXECUTE format()`
  string, which is a plain syntax error in plpgsql. Fixed to a normal
  single-quoted string.
- **`12_notifications.sql`** — `ON CONFLICT (code) DO NOTHING` targeted a
  column that, per `05_module_governance.sql`, only has a *composite*
  `UNIQUE(module_id, code)` constraint; Postgres requires the conflict
  target to match a real constraint exactly. Fixed to
  `ON CONFLICT (module_id, code)`.
- **`14_garage_operations_module.sql`** — two `ALTER TABLE ... ADD
  CONSTRAINT IF NOT EXISTS` statements; Postgres has never supported
  `IF NOT EXISTS` on `ADD CONSTRAINT`. Rewritten as `DO` blocks catching
  `duplicate_object`, matching the idempotent style used everywhere else in
  the file. **Worth checking in production**: if this file was ever pasted
  into phpPgAdmin verbatim, these two FKs
  (`fk_appt_converted_work_order`, `fk_vehicle_photos_work_order`) may be
  missing from the real `hernancius` schema — the invalid syntax would have
  errored out on just those two statements without necessarily blocking the
  rest of the paste, depending on how phpPgAdmin splits statements.

Two migration files are **superseded for a fresh install** and are skipped
by `apply-migrations.sh` (see `SUPERSEDED_FOR_FRESH_INSTALL` in the script)
— not bugs, just no longer applicable once `tenant_schema.sql` already
bootstraps their end state directly:

- **`29_dental_consultation_services_data_migration.sql`** — backfills from
  `dental_consultations.service_id`, which migration `35` renamed to
  `treatment_id`; the column it reads no longer exists on a schema
  bootstrapped from the current template.
- **`35_dental_rename_service_to_treatment.sql`** — the rename itself tries
  to drop the pre-rename table shape, which conflicts with live FKs that
  already exist because the template was bootstrapped post-rename.

Both remain valid, unedited history — they'd still be exactly what you need
if you were ever upgrading a real tenant schema created before the rename.

Two files are deliberately **not** part of this automated sequence:

- **`BackEnd/migrations/reset_admin_empresa_permissions.sql`** — a
  one-off operational fix that `UPDATE`s permission rows for an
  already-existing tenant's `admin_empresa` profile. It doesn't create
  anything and isn't idempotent/repeatable in the way a schema migration is,
  and it has no leading number, so neither `apply-migrations.sh` nor
  `runner.js` ever pick it up automatically. Run it by hand (with
  `{schema_name}` replaced) only if you specifically need that permission
  reset locally.
- **`Database/migracion.sql`** — a legacy, pre-templating snapshot. It is
  byte-for-byte the same as
  `BackEnd/migrations/14_garage_operations_module.sql`, except with
  `hernancius` hardcoded instead of the `{schema_name}` placeholder —
  confirmed by diffing the two files. It predates the `04_migrations/`
  split and is superseded by migration 14; it is not part of the
  `BackEnd/migrations/*.sql` glob at all, so it's simply never touched.

## Stopping / resetting

```bash
docker compose down       # stop containers, keep the DB volume
docker compose down -v    # stop containers AND wipe the local DB volume
```

## Notes / assumptions

- **Node version**: no `.nvmrc` or `engines` field exists in either
  `BackEnd/package.json` or `FrontEnd/Portal/package.json`, so both
  Dockerfiles pin `node:20-alpine` (current Node LTS at the time this stack
  was written). Bump it in both `BackEnd/Dockerfile` and
  `FrontEnd/Portal/Dockerfile` if the project later adopts a different
  version.
- **`nodemon`** was added to `BackEnd/package.json` as a `devDependency`
  (it was referenced by the existing `npm run dev` script but was not
  actually installed) — needed for the backend container's hot reload.
- Postgres is pinned to `postgres:10.23-alpine` (the plain `postgres:10.23`
  Debian-based tag does not exist on Docker Hub — official images for EOL
  major versions like 10 only kept a handful of tags, and `10.23-alpine` is
  the one that actually ships PostgreSQL 10.23; `docker run --rm
  postgres:10.23-alpine postgres --version` confirms it). Do not bump this
  without deliberately verifying compatibility with Bluehost's actual server
  version first.
