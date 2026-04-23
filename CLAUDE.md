# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Nexora is a multi-tenant SaaS platform designed as a reusable foundation for enterprise apps. The first domain is workshop management ("taller"). It uses a per-company PostgreSQL schema isolation model: the `public` schema is the global SaaS core, and each company gets its own schema (e.g., `hernancius`).

## Commands

### Backend (`BackEnd/`)
```bash
npm run dev    # development with nodemon hot-reload
npm start      # production start
```

### Frontend (`FrontEnd/Portal/`)
```bash
npm run dev    # Vite dev server (http://localhost:5173)
npm run build  # type-check (vue-tsc) + production build
npm run preview # serve the production build locally
```

There is no test suite configured anywhere in this project.

## Environment setup

Backend requires `BackEnd/.env` — the server refuses to start without `DATABASE_URL` and `JWT_SECRET`:
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/nexora_db
DB_SSL=false
JWT_SECRET=your_super_secret_jwt_key_here
# Optional: MODULE_GUARD=strict  (enables blocking mode; default is log-only)
```

Frontend API base URL: if `VITE_API_URL` is not set, Axios defaults to `http://localhost:3000/api`. For production, set it in `FrontEnd/Portal/.env.production`.

## Architecture

### Stack
- **Backend:** Node.js + Express 5, raw SQL via `pg` (node-postgres), JWT auth (`x-auth-token` header), bcrypt
- **Frontend:** Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Vue Router 4, Pinia, Tailwind CSS 3, Axios
- **Database:** PostgreSQL 10.23 — no ORM, no extensions, no features beyond Postgres 10

### Authentication flow (two phases)
1. `POST /api/auth/login` → returns user + company list + a "pre-auth" JWT (no company context)
2. `POST /api/auth/select-company` → issues a "final" JWT with `company_id` and `schema_name` embedded

All protected API requests use the `x-auth-token` header. `authMiddleware.js` verifies the token, validates the user in `public.users`, and checks the company's `commercial_status`. The `read_only` flag is set when a user or company is suspended.

### Authorization layers
- `is_super_admin` — platform-level, bypasses all module guards
- `is_system_user` — immutable root user, can never be blocked or deleted
- `role` — `super_admin`, `admin`, `inner_user`, `outer_user`
- `commercial_status` — `activa`, `pendiente_pago`, `suspendida`, `bloqueada` (bloqueada returns 403)
- Module guard (`requireModule.js`) — checks `public.company_modules`; controlled by `MODULE_GUARD` env var
- Profile/transaction permissions — `profile_transaction_permissions` table per tenant schema

Frontend permission composable: [usePermissions.ts](FrontEnd/Portal/src/composables/usePermissions.ts) — exposes `isSuperAdmin`, `isAdmin`, `isReadOnly`, `canManageUsers`, `canManageProfiles`, `canManageModules`, `canManageCommercial`, `hasModule(code)`, `hasTransaction(route)`.

### Multi-schema database
Every SQL query must qualify the schema. Controllers use `req.user.schema_name` (from the JWT) to route queries to the correct tenant schema. When creating a new company, [tenant_schema.sql](BackEnd/templates/tenant_schema.sql) is used as a template (replacing `{schema_name}`) and executed dynamically.

**Public schema tables:** `users`, `companies`, `company_users`, `subscriptions`, `solicitudes`, `payment_agreements`, `module_catalog`, `module_transactions`, `company_modules`

**Per-tenant schema tables:** `config_company`, `roles`, `permissions`, `role_permissions`, `user_profiles`, `profiles`, `profile_permissions`, `profile_transaction_permissions`, `user_tenant_profiles`, `customers`

### Frontend routing
Navigation guard in [router/index.ts](FrontEnd/Portal/src/router/index.ts):
1. On first navigation, validates stored token via `GET /api/auth/me`
2. Unauthenticated → `/login`; authenticated without company → `/select-company`
3. `requiresSuperAdmin` routes block non-super-admins
4. Module/transaction access checked via `menuStore` (loaded from `GET /api/menu`)

Route meta flags: `requiresAuth`, `requiresCompany`, `requiresSuperAdmin`, `requiresModule`, `requiresTransaction`

### Backend route registration
All routes are mounted in [app.js](BackEnd/app.js) under `/api`. Global middlewares `optionalAuth` + `requireModule` run before all `/api/*` routes. Route-to-module mapping is in [routeModuleMap.js](BackEnd/config/routeModuleMap.js).

### State management (Pinia stores)
- [auth.ts](FrontEnd/Portal/src/stores/auth.ts) — user, token, companies, currentCompany (persisted in localStorage)
- [menu.ts](FrontEnd/Portal/src/stores/menu.ts) — dynamic menu (modules + transactions from API)
- [visualConfig.ts](FrontEnd/Portal/src/stores/visualConfig.ts) — UI theme, wallpaper, scale, font, colors (applied as CSS vars on `:root` in App.vue)

## Deployment constraints

This project runs on **Bluehost shared hosting** — these constraints are hard:
- No terminal/shell access; backend managed via cPanel "Setup Node.js App"
- Database admin only via phpPgAdmin — no external DB tools
- No Docker, no PM2, no native compiled packages
- PostgreSQL 10.23 — do not use SQL features unavailable in this version
- Migrations are run **manually** by pasting SQL into phpPgAdmin in order

**Production URLs:**
- Frontend: `https://admin.nexoragarage.hrcastell.com` (static build from `npm run build`)
- Backend: `https://api.nexoragarage.hrcastell.com` (app dir: `/home/hernanci/apps/nexoragarage-api`)

CORS allowed origins are hardcoded in [app.js](BackEnd/app.js).

## Master schema — hernancius

`hernancius` is the **master schema** and must never be deleted, renamed, or structurally broken. It governs all tenant schemas and works jointly with `public`:

- `public` holds global SaaS data (users, companies, subscriptions, module catalog, company_modules)
- `hernancius` holds the foundational table structure that becomes the template for every new company schema
- A **database schema = a company** in this system. There is no other company entity.
- When a new company is created, `BackEnd/templates/tenant_schema.sql` provisions its schema — a structural copy of the hernancius template, not a data copy.
- From hernancius (logged in as the master company), the super_admin governs what every other company/schema can see and do: which global catalog modules they have enabled (`public.company_modules`), which profiles exist in their schema, and what permissions those profiles carry.
- The `configuration` module is the governance foundation. It must remain structurally solid because it provides the framework on which all future business modules are built and associated per-company.
- `is_master = TRUE` in `public.companies` identifies hernancius. The UI and backend both use this flag to prevent deletion and to apply special governance rules.

## Key architectural rules

- **Every technical decision must answer:** "Can this be deployed, maintained, and fixed on Bluehost shared hosting using cPanel, Setup Node.js App, and phpPgAdmin?" If no, reconsider.
- SQL scripts go in `Database/04_migrations/` numbered in sequence; each script has a single responsibility and must be safe to run via phpPgAdmin.
- Company data is never mixed between schemas — always use the schema from the JWT, never hardcode.
- The `hernancius` company is the master/owner company (`is_master = TRUE`). Certain UI restrictions apply to it.
- A screen/view is not considered done until it works correctly on desktop, tablet, and mobile. Mobile: cards instead of tables, single-column forms, no horizontal scroll.
- Complete one view fully (CRUD, validations, error messages, responsive, permissions) before starting the next.
