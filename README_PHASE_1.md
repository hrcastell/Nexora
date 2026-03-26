# Nexora - Phase 1 Complete

## Status
Phase 1 (Base Architecture) has been successfully implemented.

### Components Ready
1.  **Database (SQL Scripts)**
    *   Located in `/Database`.
    *   `00_core/`: Initial roles.
    *   `01_public_schema/`: Global tables (`users`, `companies`).
    *   `02_company_template/`: Template for new tenant schemas.
    *   `03_seeds/`: Initial Super Admin and Core Company data.

2.  **Backend (Node.js/Express)**
    *   Located in `/Backend`.
    *   Auth API implemented (`/login`, `/select-company`).
    *   JWT Token generation with schema context.
    *   Middleware for tenant isolation ready.

3.  **Frontend (Vue 3 + Tailwind)**
    *   Located in `/Frontend/Portal`.
    *   Login View (`/login`).
    *   Company Selection View (`/select-company`).
    *   Dashboard Shell (`/dashboard`).
    *   Auth Guard protection configured.

## How to Run

### 1. Database Setup
Since this is a manual environment, you need to execute the SQL scripts in your PostgreSQL instance (via phpPgAdmin or pgAdmin):
1.  Run `Database/00_core/00_init_roles.sql`
2.  Run `Database/01_public_schema/01_public_tables.sql`
3.  Run `Database/02_company_template/02_tenant_tables.sql` (Note: this is a template, runs when creating new tenants)
4.  Run `Database/03_seeds/03_initial_seed.sql` (Creates `hernancius` schema and admin user)

### 2. Backend
```bash
cd Backend
npm install
# Configure .env with your local DB credentials
npm run dev
```

### 3. Backend Deployment (cPanel)
When setting up the Node.js App in cPanel:
1.  Upload the `Backend` folder contents to your application root (e.g., `/home/username/apps/nexoragarage-api`).
2.  Run `npm install` from the cPanel Node.js interface or terminal.
3.  Add the following **Environment Variables** in the cPanel "Setup Node.js App" interface:
    *   `PORT`: `3000` (or the port assigned by cPanel)
    *   `NODE_ENV`: `production`
    *   `DATABASE_URL`: `postgres://db_user:db_password@127.0.0.1:5432/db_name`
    *   `DB_SSL`: `false` (Required if your cPanel DB does not support SSL)
    *   `JWT_SECRET`: `[Generar un string largo y seguro]`

### 4. Frontend
```bash
cd Frontend/Portal
npm install
npm run dev
```

### 4. Deployment Build (Frontend)
To generate the production build for cPanel:
```bash
cd Frontend/Portal
npm run build
```
The artifacts will be in `Frontend/Portal/dist`. Upload the contents of this folder to your cPanel `public_html` (or subdomain folder).

## Credentials
*   **User**: `hernan.castellanos@hrcastell.com`
*   **Password**: `N@nreh26*` (Note: Ensure the hash in `03_initial_seed.sql` matches this password for local testing, or generate a new hash using bcrypt)
