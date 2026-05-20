-- tenant_schema.sql
-- Template for specific tenant schemas
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
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS {schema_name}.permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
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
CREATE TABLE IF NOT EXISTS {schema_name}.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER REFERENCES {schema_name}.roles(id),
    custom_settings JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'activo',
    job_title VARCHAR(100),
    access_level VARCHAR(20) DEFAULT 'por_modulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. [DEPRECATED] Modules tenant-local — NO CREAR en nuevos tenants
-- El catálogo de módulos vive en public.module_catalog (global).
-- La asignación empresa↔módulo vive en public.company_modules.
-- La tabla {schema}.modules era un duplicado sin uso real en el menú/permisos.
-- Mantenida aquí solo como referencia histórica. NO descomentar.
--
-- CREATE TABLE IF NOT EXISTS {schema_name}.modules (
--     id SERIAL PRIMARY KEY,
--     code VARCHAR(50) NOT NULL UNIQUE,
--     name VARCHAR(100) NOT NULL,
--     description TEXT,
--     icon VARCHAR(50),
--     group_name VARCHAR(50),
--     is_global BOOLEAN DEFAULT TRUE,
--     show_in_menu BOOLEAN DEFAULT TRUE,
--     menu_order INTEGER DEFAULT 0,
--     status VARCHAR(20) DEFAULT 'activo',
--     is_system_module BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- 7. Profiles (Functional access groups)
CREATE TABLE IF NOT EXISTS {schema_name}.profiles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scope VARCHAR(20) DEFAULT 'empresa',
    is_system_profile BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Profile Transaction Permissions (Matrix: profile x transaction x actions)
-- Referencias por código de transacción (public.module_transactions.code) para evitar FK cross-schema.
CREATE TABLE IF NOT EXISTS {schema_name}.profile_transaction_permissions (
    id               SERIAL PRIMARY KEY,
    profile_id       INT         NOT NULL,
    transaction_code VARCHAR(80) NOT NULL,
    can_view         BOOLEAN     NOT NULL DEFAULT FALSE,
    can_create       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_edit         BOOLEAN     NOT NULL DEFAULT FALSE,
    can_delete       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_approve      BOOLEAN     NOT NULL DEFAULT FALSE,
    can_export       BOOLEAN     NOT NULL DEFAULT FALSE,
    can_admin        BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ptp_profile_tx  UNIQUE (profile_id, transaction_code),
    CONSTRAINT fk_ptp_profile     FOREIGN KEY (profile_id)
        REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ptp_profile_id ON {schema_name}.profile_transaction_permissions (profile_id);
CREATE INDEX IF NOT EXISTS idx_ptp_tx_code    ON {schema_name}.profile_transaction_permissions (transaction_code);

-- 9. [DEPRECATED] Profile Permissions legacy (Matrix: profile x module x actions)
-- Reemplazada por profile_transaction_permissions (granularidad por transacción).
-- No se usa en ningún endpoint activo del sistema de permisos del menú.
-- La UI de ProfilesView opera exclusivamente sobre profile_transaction_permissions.
-- Mantenida aquí solo como referencia. NO descomentar en nuevos tenants.
--
-- CREATE TABLE IF NOT EXISTS {schema_name}.profile_permissions (
--     id SERIAL PRIMARY KEY,
--     profile_id INTEGER NOT NULL REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE,
--     module_id  INTEGER NOT NULL,  -- era FK a {schema}.modules (también deprecated)
--     can_view   BOOLEAN DEFAULT FALSE,
--     can_create BOOLEAN DEFAULT FALSE,
--     can_edit   BOOLEAN DEFAULT FALSE,
--     can_delete BOOLEAN DEFAULT FALSE,
--     can_approve BOOLEAN DEFAULT FALSE,
--     can_export BOOLEAN DEFAULT FALSE,
--     can_admin  BOOLEAN DEFAULT FALSE,
--     UNIQUE(profile_id, module_id)
-- );

-- 10. User Tenant Profiles (Multiple profiles per user)
CREATE TABLE IF NOT EXISTS {schema_name}.user_tenant_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL REFERENCES {schema_name}.profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CORE 1 — GARAGE OPERATIONS
-- Todas las tablas del Core se crean aquí para que cualquier empresa
-- nueva tenga el schema completo desde el primer día.
-- La visibilidad del módulo se controla por public.company_modules
-- (is_enabled / is_visible). Si la empresa no es un taller, el módulo
-- simplemente no aparece en el menú — las tablas existen pero vacías.
-- ═══════════════════════════════════════════════════════════════

-- ─── CATÁLOGOS DE VEHÍCULOS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_body_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_brands (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_models (
    id              SERIAL PRIMARY KEY,
    brand_id        INTEGER      REFERENCES {schema_name}.vehicle_brands(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (brand_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_colors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    hex_color       VARCHAR(20),
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_transmissions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_fuel_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── CLIENTES (tabla completa — dueña: Core 1 Garage Operations) ──

CREATE TABLE IF NOT EXISTS {schema_name}.customers (
    id                SERIAL PRIMARY KEY,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100),
    document_type     VARCHAR(50),
    document_number   VARCHAR(80),
    phone             VARCHAR(50),
    mobile            VARCHAR(50),
    email             VARCHAR(150),
    birth_date        DATE,
    country           VARCHAR(100),
    region_state      VARCHAR(100),
    city              VARCHAR(100),
    commune_district  VARCHAR(100),
    address           TEXT,
    photo_url         TEXT,
    notes             TEXT,
    source            VARCHAR(50),
    status            VARCHAR(30)  DEFAULT 'active',
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_status ON {schema_name}.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email  ON {schema_name}.customers(email);

-- ─── VEHÍCULOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.vehicles (
    id                   SERIAL PRIMARY KEY,
    customer_id          INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE CASCADE,
    vehicle_type_id      INTEGER      REFERENCES {schema_name}.vehicle_types(id)         ON DELETE SET NULL,
    body_type_id         INTEGER      REFERENCES {schema_name}.vehicle_body_types(id)    ON DELETE SET NULL,
    brand_id             INTEGER      REFERENCES {schema_name}.vehicle_brands(id)        ON DELETE SET NULL,
    model_id             INTEGER      REFERENCES {schema_name}.vehicle_models(id)        ON DELETE SET NULL,
    version              VARCHAR(120),
    plate                VARCHAR(30),
    year                 INTEGER,
    color_id             INTEGER      REFERENCES {schema_name}.vehicle_colors(id)        ON DELETE SET NULL,
    transmission_id      INTEGER      REFERENCES {schema_name}.vehicle_transmissions(id) ON DELETE SET NULL,
    fuel_type_id         INTEGER      REFERENCES {schema_name}.vehicle_fuel_types(id)    ON DELETE SET NULL,
    engine_displacement  VARCHAR(50),
    vin                  VARCHAR(100),
    engine_number        VARCHAR(100),
    mileage              INTEGER      DEFAULT 0,
    notes                TEXT,
    status               VARCHAR(30)  DEFAULT 'active',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate
    ON {schema_name}.vehicles(plate)
    WHERE plate IS NOT NULL AND plate <> '';

CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON {schema_name}.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status   ON {schema_name}.vehicles(status);

-- ─── FOTOS DE VEHÍCULO ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_photos (
    id             SERIAL PRIMARY KEY,
    vehicle_id     INTEGER      NOT NULL REFERENCES {schema_name}.vehicles(id) ON DELETE CASCADE,
    work_order_id  INTEGER,     -- FK a work_orders se agrega después (tabla aún no existe aquí)
    photo_url      TEXT         NOT NULL,
    stage          VARCHAR(30)  DEFAULT 'entry',
    caption        TEXT,
    sort_order     SMALLINT     DEFAULT 0,
    uploaded_by    INTEGER,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON {schema_name}.vehicle_photos(vehicle_id);

-- ─── EMPLEADOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.employees (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    document_type   VARCHAR(50),
    document_number VARCHAR(80),
    phone           VARCHAR(50),
    email           VARCHAR(150),
    role_name       VARCHAR(120),
    specialty       VARCHAR(150),
    photo_url       TEXT,
    status          VARCHAR(30)  DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_status  ON {schema_name}.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON {schema_name}.employees(user_id);

-- ─── TARIFAS DE MANO DE OBRA ──────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.employee_labor_rates (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER       NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE CASCADE,
    rate_name   VARCHAR(120)  NOT NULL,
    hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency    VARCHAR(10)   DEFAULT 'CLP',
    valid_from  DATE          DEFAULT CURRENT_DATE,
    valid_to    DATE,
    status      VARCHAR(30)   DEFAULT 'active',
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labor_rates_employee ON {schema_name}.employee_labor_rates(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_rates_status   ON {schema_name}.employee_labor_rates(status);

-- ─── PRODUCTOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(80),
    name            VARCHAR(150)  NOT NULL,
    normalized_name VARCHAR(180)  NOT NULL,
    description     TEXT,
    product_type    VARCHAR(50)   DEFAULT 'consumable',
    unit            VARCHAR(30)   DEFAULT 'unidad',
    reference_price NUMERIC(12,2) DEFAULT 0,
    currency        VARCHAR(10)   DEFAULT 'CLP',
    status          VARCHAR(30)   DEFAULT 'active',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON {schema_name}.products(status);

-- ─── SERVICIOS CONFIGURABLES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.service_templates (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(150)  NOT NULL,
    normalized_name     VARCHAR(180)  NOT NULL UNIQUE,
    description         TEXT,
    estimated_hours     NUMERIC(8,2)  DEFAULT 0,
    suggested_role      VARCHAR(120),
    suggested_specialty VARCHAR(150),
    base_labor_rate     NUMERIC(12,2),
    currency            VARCHAR(10)   DEFAULT 'CLP',
    status              VARCHAR(30)   DEFAULT 'active',
    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.service_template_products (
    id                   SERIAL PRIMARY KEY,
    service_template_id  INTEGER       NOT NULL REFERENCES {schema_name}.service_templates(id) ON DELETE CASCADE,
    product_id           INTEGER       NOT NULL REFERENCES {schema_name}.products(id),
    quantity             NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit                 VARCHAR(30),
    reference_unit_price NUMERIC(12,2) DEFAULT 0,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stp_template ON {schema_name}.service_template_products(service_template_id);
CREATE INDEX IF NOT EXISTS idx_stp_product  ON {schema_name}.service_template_products(product_id);

-- ─── CITAS / AGENDA ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.appointments (
    id                        SERIAL PRIMARY KEY,
    appointment_number        VARCHAR(50)   NOT NULL UNIQUE,
    customer_id               INTEGER       REFERENCES {schema_name}.customers(id)  ON DELETE SET NULL,
    vehicle_id                INTEGER       REFERENCES {schema_name}.vehicles(id)   ON DELETE SET NULL,
    scheduled_start           TIMESTAMP     NOT NULL,
    scheduled_end             TIMESTAMP,
    estimated_duration_hours  NUMERIC(8,2)  DEFAULT 0,
    status                    VARCHAR(40)   DEFAULT 'scheduled',
    channel                   VARCHAR(50),
    requested_service_summary TEXT,
    reported_issue            TEXT,
    preliminary_notes         TEXT,
    internal_notes            TEXT,
    priority                  VARCHAR(30)   DEFAULT 'normal',
    suggested_employee_id     INTEGER       REFERENCES {schema_name}.employees(id)  ON DELETE SET NULL,
    reception_user_id         INTEGER,
    converted_work_order_id   INTEGER,     -- FK a work_orders se agrega después
    converted_at              TIMESTAMP,
    created_by                INTEGER,
    created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_status    ON {schema_name}.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer  ON {schema_name}.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle   ON {schema_name}.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON {schema_name}.appointments(scheduled_start);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_services (
    id                       SERIAL PRIMARY KEY,
    appointment_id           INTEGER       NOT NULL REFERENCES {schema_name}.appointments(id) ON DELETE CASCADE,
    service_template_id      INTEGER       REFERENCES {schema_name}.service_templates(id)     ON DELETE SET NULL,
    service_name             VARCHAR(150)  NOT NULL,
    description              TEXT,
    estimated_hours          NUMERIC(8,2)  DEFAULT 0,
    suggested_employee_id    INTEGER       REFERENCES {schema_name}.employees(id)             ON DELETE SET NULL,
    estimated_labor_total    NUMERIC(12,2) DEFAULT 0,
    estimated_products_total NUMERIC(12,2) DEFAULT 0,
    estimated_service_total  NUMERIC(12,2) DEFAULT 0,
    created_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_services_appt ON {schema_name}.appointment_services(appointment_id);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_service_products (
    id                     SERIAL PRIMARY KEY,
    appointment_service_id INTEGER       NOT NULL REFERENCES {schema_name}.appointment_services(id) ON DELETE CASCADE,
    product_id             INTEGER       REFERENCES {schema_name}.products(id) ON DELETE SET NULL,
    product_name           VARCHAR(150)  NOT NULL,
    quantity               NUMERIC(12,2) DEFAULT 1,
    unit                   VARCHAR(30),
    estimated_unit_price   NUMERIC(12,2) DEFAULT 0,
    estimated_total_price  NUMERIC(12,2) DEFAULT 0,
    created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asp_service ON {schema_name}.appointment_service_products(appointment_service_id);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_status_history (
    id              SERIAL PRIMARY KEY,
    appointment_id  INTEGER      NOT NULL REFERENCES {schema_name}.appointments(id) ON DELETE CASCADE,
    previous_status VARCHAR(40),
    new_status      VARCHAR(40)  NOT NULL,
    changed_by      INTEGER,
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_history_appt ON {schema_name}.appointment_status_history(appointment_id);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_reschedules (
    id             SERIAL PRIMARY KEY,
    appointment_id INTEGER      NOT NULL REFERENCES {schema_name}.appointments(id) ON DELETE CASCADE,
    previous_start TIMESTAMP    NOT NULL,
    previous_end   TIMESTAMP,
    new_start      TIMESTAMP    NOT NULL,
    new_end        TIMESTAMP,
    reason         TEXT,
    changed_by     INTEGER,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_reschedules_appt ON {schema_name}.appointment_reschedules(appointment_id);

-- ─── ÓRDENES DE TRABAJO ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.work_orders (
    id                       SERIAL PRIMARY KEY,
    order_number             VARCHAR(50)   NOT NULL UNIQUE,
    appointment_id           INTEGER       REFERENCES {schema_name}.appointments(id) ON DELETE SET NULL,
    appointment_date         TIMESTAMP,
    customer_id              INTEGER       NOT NULL REFERENCES {schema_name}.customers(id),
    vehicle_id               INTEGER       NOT NULL REFERENCES {schema_name}.vehicles(id),
    assigned_employee_id     INTEGER       REFERENCES {schema_name}.employees(id)   ON DELETE SET NULL,
    assigned_user_id         INTEGER,
    status                   VARCHAR(40)   DEFAULT 'draft',
    priority                 VARCHAR(30)   DEFAULT 'normal',
    entry_date               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery_date  TIMESTAMP,
    delivery_date            TIMESTAMP,
    reported_issue           TEXT,
    diagnosis                TEXT,
    reception_notes          TEXT,
    fuel_level               VARCHAR(50),
    vehicle_condition_notes  TEXT,
    internal_notes           TEXT,
    customer_notes           TEXT,
    mileage_in               INTEGER,
    mileage_out              INTEGER,
    subtotal_labor           NUMERIC(12,2) DEFAULT 0,
    subtotal_products        NUMERIC(12,2) DEFAULT 0,
    total_amount             NUMERIC(12,2) DEFAULT 0,
    currency                 VARCHAR(10)   DEFAULT 'CLP',
    created_by               INTEGER,
    created_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status      ON {schema_name}.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer    ON {schema_name}.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle     ON {schema_name}.work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_appointment ON {schema_name}.work_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_entry_date  ON {schema_name}.work_orders(entry_date);

-- FKs diferidas (tablas que se referencian circularmente)
ALTER TABLE {schema_name}.appointments
    ADD CONSTRAINT IF NOT EXISTS fk_appt_converted_work_order
    FOREIGN KEY (converted_work_order_id)
    REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;

ALTER TABLE {schema_name}.vehicle_photos
    ADD CONSTRAINT IF NOT EXISTS fk_vehicle_photos_work_order
    FOREIGN KEY (work_order_id)
    REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_work_order ON {schema_name}.vehicle_photos(work_order_id);

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_services (
    id                   SERIAL PRIMARY KEY,
    work_order_id        INTEGER       NOT NULL REFERENCES {schema_name}.work_orders(id) ON DELETE CASCADE,
    service_template_id  INTEGER       REFERENCES {schema_name}.service_templates(id)   ON DELETE SET NULL,
    assigned_employee_id INTEGER       REFERENCES {schema_name}.employees(id)           ON DELETE SET NULL,
    service_name         VARCHAR(150)  NOT NULL,
    description          TEXT,
    status               VARCHAR(40)   DEFAULT 'pending',
    estimated_hours      NUMERIC(8,2)  DEFAULT 0,
    actual_hours         NUMERIC(8,2)  DEFAULT 0,
    hourly_rate          NUMERIC(12,2) DEFAULT 0,
    labor_total          NUMERIC(12,2) DEFAULT 0,
    products_total       NUMERIC(12,2) DEFAULT 0,
    service_total        NUMERIC(12,2) DEFAULT 0,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wos_work_order ON {schema_name}.work_order_services(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wos_employee   ON {schema_name}.work_order_services(assigned_employee_id);

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_service_products (
    id                    SERIAL PRIMARY KEY,
    work_order_service_id INTEGER       NOT NULL REFERENCES {schema_name}.work_order_services(id) ON DELETE CASCADE,
    product_id            INTEGER       REFERENCES {schema_name}.products(id) ON DELETE SET NULL,
    product_name          VARCHAR(150)  NOT NULL,
    quantity              NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit                  VARCHAR(30),
    unit_price            NUMERIC(12,2) DEFAULT 0,
    total_price           NUMERIC(12,2) DEFAULT 0,
    created_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wosp_service ON {schema_name}.work_order_service_products(work_order_service_id);

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_status_history (
    id              SERIAL PRIMARY KEY,
    work_order_id   INTEGER      NOT NULL REFERENCES {schema_name}.work_orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(40),
    new_status      VARCHAR(40)  NOT NULL,
    changed_by      INTEGER,
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wosh_work_order ON {schema_name}.work_order_status_history(work_order_id);
