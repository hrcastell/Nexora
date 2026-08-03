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
    tenant_id         INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON {schema_name}.customers(tenant_id);

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
    tenant_id       INTEGER,
    user_id         INTEGER,
    employee_code   VARCHAR(30),
    work_email      VARCHAR(150),
    personal_email  VARCHAR(150),
    mobile_phone    VARCHAR(50),
    birth_date      DATE,
    hire_date       DATE,
    termination_date DATE,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    employment_type VARCHAR(20),
    department_id   INTEGER,
    position_id     INTEGER,
    supervisor_employee_id INTEGER,
    cost_center_id  INTEGER,
    work_shift_id   INTEGER,
    privacy_level   VARCHAR(20),
    created_by      INTEGER,
    updated_by      INTEGER,
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
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_employees_employment_status CHECK (employment_status IN (
        'draft', 'active', 'inactive', 'on_leave', 'terminated', 'suspended'
    )),
    CONSTRAINT chk_employees_employment_type CHECK (employment_type IN (
        'full_time', 'part_time', 'contractor', 'intern', 'temporary'
    ))
);

CREATE INDEX IF NOT EXISTS idx_employees_status  ON {schema_name}.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON {schema_name}.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant  ON {schema_name}.employees(tenant_id);

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

CREATE TABLE IF NOT EXISTS {schema_name}.product_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO {schema_name}.product_types (name, normalized_name) VALUES
    ('Consumible', 'consumible'),
    ('Repuesto', 'repuesto'),
    ('Herramienta', 'herramienta'),
    ('Otro', 'otro')
ON CONFLICT (normalized_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS {schema_name}.products (
    id                    SERIAL PRIMARY KEY,
    sku                   VARCHAR(80),
    name                  VARCHAR(150)    NOT NULL,
    normalized_name       VARCHAR(180)    NOT NULL,
    description           TEXT,
    product_type_id       INTEGER         REFERENCES {schema_name}.product_types(id) ON DELETE RESTRICT,
    unit                  VARCHAR(30)     DEFAULT 'unidad',
    reference_price       NUMERIC(12,2)   DEFAULT 0,
    inventory_enabled     BOOLEAN         NOT NULL DEFAULT FALSE,
    track_serial          BOOLEAN         NOT NULL DEFAULT FALSE,
    track_batch           BOOLEAN         NOT NULL DEFAULT FALSE,
    allow_negative_stock  BOOLEAN         NOT NULL DEFAULT FALSE,
    reorder_point         NUMERIC(12,2)   NOT NULL DEFAULT 0,
    max_stock             NUMERIC(12,2),
    preferred_supplier_id INTEGER,
    purchase_unit         VARCHAR(30),
    sale_unit             VARCHAR(30),
    conversion_factor     NUMERIC(12,4)   NOT NULL DEFAULT 1,
    average_cost          NUMERIC(14,4)   NOT NULL DEFAULT 0,
    last_purchase_cost    NUMERIC(14,4)   NOT NULL DEFAULT 0,
    requires_expiration   BOOLEAN         NOT NULL DEFAULT FALSE,
    storage_notes         TEXT,
    currency              VARCHAR(10)     DEFAULT 'CLP',
    status                VARCHAR(30)     DEFAULT 'active',
    created_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON {schema_name}.products(status);

CREATE TABLE IF NOT EXISTS {schema_name}.product_price_levels (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100)  NOT NULL,
    normalized_name     VARCHAR(120)  NOT NULL,
    default_margin_pct  NUMERIC(6,2)  NOT NULL DEFAULT 0,
    display_order       INTEGER       NOT NULL DEFAULT 0,
    status              VARCHAR(30)   NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_price_levels_name UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_product_price_levels_status ON {schema_name}.product_price_levels(status);

CREATE TABLE IF NOT EXISTS {schema_name}.product_prices (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE CASCADE,
    price_level_id  INTEGER       NOT NULL REFERENCES {schema_name}.product_price_levels(id) ON DELETE RESTRICT,
    margin_pct      NUMERIC(6,2)  NOT NULL DEFAULT 0,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_prices_product_level UNIQUE (product_id, price_level_id)
);

CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON {schema_name}.product_prices(product_id);

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
    margin_pct          NUMERIC(6,2)  DEFAULT 0,
    tax_pct             NUMERIC(6,2)  DEFAULT 0,
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
    payment_status           VARCHAR(30)   DEFAULT 'pending',
    amount_paid              NUMERIC(12,2) DEFAULT 0,
    amount_pending           NUMERIC(12,2) DEFAULT 0,
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_appt_converted_work_order'
          AND conrelid = '{schema_name}.appointments'::regclass
    ) THEN
        ALTER TABLE {schema_name}.appointments
            ADD CONSTRAINT fk_appt_converted_work_order
            FOREIGN KEY (converted_work_order_id)
            REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_vehicle_photos_work_order'
          AND conrelid = '{schema_name}.vehicle_photos'::regclass
    ) THEN
        ALTER TABLE {schema_name}.vehicle_photos
            ADD CONSTRAINT fk_vehicle_photos_work_order
            FOREIGN KEY (work_order_id)
            REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;
    END IF;
END;
$$;

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
    margin_pct           NUMERIC(6,2)  DEFAULT 0,
    tax_pct              NUMERIC(6,2)  DEFAULT 0,
    margin_amount        NUMERIC(12,2) DEFAULT 0,
    tax_amount           NUMERIC(12,2) DEFAULT 0,
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

-- ─── PAGOS DE ÓRDENES DE TRABAJO ──────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_payments (
    id              SERIAL PRIMARY KEY,
    work_order_id   INTEGER       NOT NULL REFERENCES {schema_name}.work_orders(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    currency        VARCHAR(10)   DEFAULT 'CLP',
    payment_method  VARCHAR(60),
    reference       VARCHAR(120),
    notes           TEXT,
    payment_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    registered_by   INTEGER,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wop_work_order ON {schema_name}.work_order_payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wop_date       ON {schema_name}.work_order_payments(payment_date);

-- ─── HISTORIAL DE TRASPASO DE PROPIETARIO ─────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.vehicle_ownership_transfers (
    id                   SERIAL PRIMARY KEY,
    vehicle_id           INTEGER      NOT NULL REFERENCES {schema_name}.vehicles(id) ON DELETE CASCADE,
    previous_customer_id INTEGER      REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    new_customer_id      INTEGER      NOT NULL REFERENCES {schema_name}.customers(id),
    transfer_reason      TEXT,
    transferred_by       INTEGER,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vot_vehicle  ON {schema_name}.vehicle_ownership_transfers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vot_customer ON {schema_name}.vehicle_ownership_transfers(new_customer_id);

-- ═══════════════════════════════════════════════════════════════
-- CORE 2 — FINANCIAL CORE
-- Gestión del flujo económico mensual personal por usuario.
-- Todas las queries filtran por user_id — los datos son por usuario,
-- no por empresa completa. La visibilidad del módulo se controla
-- por public.company_modules como el resto de los módulos.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {schema_name}.financial_periods (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL,
    year            INTEGER      NOT NULL,
    month           INTEGER      NOT NULL,
    initial_balance INTEGER      NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'open',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_financial_period_month  CHECK (month >= 1 AND month <= 12),
    CONSTRAINT chk_financial_period_status CHECK (status IN ('open', 'closed', 'archived')),
    CONSTRAINT uq_financial_period_user_year_month UNIQUE (user_id, year, month)
);

CREATE TABLE IF NOT EXISTS {schema_name}.financial_categories (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL,
    name         VARCHAR(120) NOT NULL,
    type         VARCHAR(20)  NOT NULL,
    parent_id    INTEGER      NULL REFERENCES {schema_name}.financial_categories(id),
    is_fixed     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_essential BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    total_installments    INTEGER      NULL,
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_financial_category_type          CHECK (type IN ('income', 'expense', 'saving', 'debt', 'transfer')),
    CONSTRAINT chk_category_total_installments      CHECK (total_installments IS NULL OR total_installments > 0)
);

CREATE TABLE IF NOT EXISTS {schema_name}.budget_plans (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL,
    period_id      INTEGER      NOT NULL REFERENCES {schema_name}.financial_periods(id) ON DELETE CASCADE,
    category_id    INTEGER      NOT NULL REFERENCES {schema_name}.financial_categories(id),
    planned_amount       INTEGER      NOT NULL DEFAULT 0,
    notes                TEXT         NULL,
    current_installment  INTEGER      NULL,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_budget_plan_amount               CHECK (planned_amount >= 0),
    CONSTRAINT chk_budget_plan_current_installment  CHECK (current_installment IS NULL OR current_installment > 0),
    CONSTRAINT uq_budget_plan_user_period_category  UNIQUE (user_id, period_id, category_id)
);

CREATE TABLE IF NOT EXISTS {schema_name}.financial_transactions (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL,
    period_id      INTEGER      NOT NULL REFERENCES {schema_name}.financial_periods(id) ON DELETE CASCADE,
    category_id    INTEGER      NOT NULL REFERENCES {schema_name}.financial_categories(id),
    type           VARCHAR(20)  NOT NULL,
    amount         INTEGER      NOT NULL,
    date           DATE         NOT NULL,
    description    TEXT         NULL,
    payment_method VARCHAR(80)  NULL,
    source         VARCHAR(80)  NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_financial_transaction_type   CHECK (type IN ('income', 'expense', 'saving', 'debt', 'transfer')),
    CONSTRAINT chk_financial_transaction_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_user               ON {schema_name}.financial_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_user_status        ON {schema_name}.financial_periods(user_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_categories_user            ON {schema_name}.financial_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_user_type       ON {schema_name}.financial_categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_period             ON {schema_name}.budget_plans(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_category                ON {schema_name}.budget_plans(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_period   ON {schema_name}.financial_transactions(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_period_type ON {schema_name}.financial_transactions(user_id, period_id, type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category      ON {schema_name}.financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date          ON {schema_name}.financial_transactions(date);

-- ═══════════════════════════════════════════════════════════════
-- CORE 3 — DENTAL CORE
-- Módulo odontológico integral. Gestión de pacientes, consultas,
-- agenda, historia clínica y facturación dental por tenant.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {schema_name}.dental_patient_profiles (
    id                        SERIAL PRIMARY KEY,
    tenant_id                 INTEGER      NOT NULL,
    customer_id               INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE CASCADE,
    medical_background        TEXT,
    allergies                 TEXT,
    blood_type                VARCHAR(20),
    current_medications       TEXT,
    chronic_conditions        TEXT,
    dental_observations       TEXT,
    emergency_contact_name    VARCHAR(255),
    emergency_contact_phone   VARCHAR(50),
    notes                     TEXT,
    photo_url                 TEXT,
    created_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dental_patient_profile UNIQUE (tenant_id, customer_id)
);

-- dental_treatments: priceable treatment catalog (migration 35: renamed from dental_services)
-- NOTE: old dental_treatments (clinical catalog) and dental_service_treatments were dropped in migration 35.
CREATE TABLE IF NOT EXISTS {schema_name}.dental_treatments (
    id                          SERIAL PRIMARY KEY,
    tenant_id                   INTEGER       NOT NULL,
    name                        VARCHAR(255)  NOT NULL,
    description                 TEXT,
    category                    VARCHAR(120),
    price_mode                  VARCHAR(20)   NOT NULL DEFAULT 'manual',
    supplies_cost               NUMERIC(12,2) NOT NULL DEFAULT 0,
    labor_cost                  NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate                    NUMERIC(8,4)  NOT NULL DEFAULT 0,
    profit_margin               NUMERIC(8,4)  NOT NULL DEFAULT 0,
    manual_price                NUMERIC(12,2),
    final_price                 NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_duration_minutes  INTEGER,
    procedure_code              VARCHAR(50),
    requires_follow_up          BOOLEAN       NOT NULL DEFAULT FALSE,
    requires_multiple_sessions  BOOLEAN       NOT NULL DEFAULT FALSE,
    contraindications           TEXT,
    post_treatment_instructions TEXT,
    is_active                   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_treatments_price_mode CHECK (price_mode IN ('manual', 'calculated'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_appointments (
    id                      SERIAL PRIMARY KEY,
    tenant_id               INTEGER      NOT NULL,
    customer_id             INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    treatment_id            INTEGER      REFERENCES {schema_name}.dental_treatments(id) ON DELETE SET NULL,
    scheduled_start         TIMESTAMP    NOT NULL,
    scheduled_end           TIMESTAMP    NOT NULL,
    status                  VARCHAR(30)  NOT NULL DEFAULT 'scheduled',
    reason                  TEXT,
    notes                   TEXT,
    reminder_email_sent_at  TIMESTAMP,
    session_id              INTEGER,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_appointment_status CHECK (status IN (
        'scheduled', 'confirmed', 'checked_in', 'completed',
        'cancelled', 'no_show', 'rescheduled'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultations (
    id                          SERIAL PRIMARY KEY,
    tenant_id                   INTEGER       NOT NULL,
    customer_id                 INTEGER       NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    appointment_id              INTEGER       REFERENCES {schema_name}.dental_appointments(id) ON DELETE SET NULL,
    treatment_id                INTEGER       REFERENCES {schema_name}.dental_treatments(id) ON DELETE SET NULL,
    consultation_date           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status                      VARCHAR(40)   NOT NULL DEFAULT 'borrador',
    administrative_status       VARCHAR(30)   NOT NULL DEFAULT 'unpaid',
    reason                      TEXT,
    diagnosis                   TEXT,
    clinical_notes              TEXT,
    indications                 TEXT,
    total_amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
    requires_follow_up          BOOLEAN       DEFAULT FALSE,
    requires_multiple_sessions  BOOLEAN       DEFAULT FALSE,
    estimated_sessions          INTEGER,
    next_session_date           DATE,
    follow_up_notes             TEXT,
    professional_id             INTEGER,
    created_by                  INTEGER,
    updated_by                  INTEGER,
    created_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_consultation_status CHECK (status IN (
        'borrador', 'creada', 'en_evaluacion', 'cotizada', 'propuesta_pendiente',
        'aceptada', 'en_tratamiento', 'sesion_pendiente', 'finalizada_clinicamente',
        'pendiente_pago', 'cerrada', 'rechazada', 'cancelled', 'no_show', 'voided'
    )),
    CONSTRAINT chk_dental_consultation_admin_status CHECK (administrative_status IN (
        'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'
    ))
);

-- NOTE: old dental_consultation_treatments (clinical join) was dropped in migration 35.
-- The new dental_consultation_treatments (priceable line items) is defined below (was dental_consultation_services).

CREATE TABLE IF NOT EXISTS {schema_name}.dental_clinical_history_entries (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL,
    customer_id     INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    consultation_id INTEGER      REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
    session_id      INTEGER,
    entry_date      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type            VARCHAR(40)  NOT NULL DEFAULT 'general_note',
    title           VARCHAR(255),
    description     TEXT,
    diagnosis       TEXT,
    clinical_notes  TEXT,
    indications     TEXT,
    created_by      INTEGER,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_history_entry_type CHECK (type IN (
        'initial', 'evolution', 'diagnosis', 'procedure_note', 'follow_up', 'general_note'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_charges (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER       NOT NULL,
    customer_id     INTEGER       NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    consultation_id INTEGER       REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
    treatment_id    INTEGER       REFERENCES {schema_name}.dental_treatments(id) ON DELETE SET NULL,
    description     TEXT,
    total_amount    NUMERIC(12,2) NOT NULL,
    paid_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(30)   NOT NULL DEFAULT 'pending',
    due_date        DATE,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_charge_status CHECK (status IN (
        'pending', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_payments (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER       NOT NULL,
    customer_id     INTEGER       NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    charge_id       INTEGER       NOT NULL REFERENCES {schema_name}.dental_charges(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    payment_date    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method  VARCHAR(40)   NOT NULL,
    reference       VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_payment_amount  CHECK (amount > 0),
    CONSTRAINT chk_dental_payment_method  CHECK (payment_method IN (
        'cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance', 'other'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_installments (
    id                  SERIAL PRIMARY KEY,
    tenant_id           INTEGER       NOT NULL,
    charge_id           INTEGER       NOT NULL REFERENCES {schema_name}.dental_charges(id) ON DELETE CASCADE,
    customer_id         INTEGER       NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    installment_number  INTEGER       NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    due_date            DATE          NOT NULL,
    paid_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    status              VARCHAR(30)   NOT NULL DEFAULT 'pending',
    paid_at             TIMESTAMP,
    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_installment_amount CHECK (amount > 0),
    CONSTRAINT chk_dental_installment_status CHECK (status IN (
        'pending', 'partially_paid', 'paid', 'overdue', 'cancelled'
    )),
    CONSTRAINT uq_dental_installment UNIQUE (tenant_id, charge_id, installment_number)
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_notifications (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL,
    customer_id     INTEGER      REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    appointment_id  INTEGER      REFERENCES {schema_name}.dental_appointments(id) ON DELETE SET NULL,
    type            VARCHAR(50)  NOT NULL,
    channel         VARCHAR(30)  NOT NULL,
    status          VARCHAR(30)  NOT NULL DEFAULT 'pending',
    scheduled_for   TIMESTAMP,
    sent_at         TIMESTAMP,
    error_message   TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_notification_channel CHECK (channel IN ('email', 'internal')),
    CONSTRAINT chk_dental_notification_status  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_medical_history (
    id                   SERIAL PRIMARY KEY,
    tenant_id            INTEGER NOT NULL,
    customer_id          INTEGER NOT NULL,
    entry_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    blood_type           VARCHAR(10),
    medical_background   TEXT,
    allergies            TEXT,
    current_medications  TEXT,
    chronic_conditions   TEXT,
    dental_observations  TEXT,
    notes                TEXT,
    created_by           INTEGER,
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_profiles_tenant_customer       ON {schema_name}.dental_patient_profiles(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_treatments_tenant              ON {schema_name}.dental_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_tenant_date       ON {schema_name}.dental_appointments(tenant_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_tenant_customer   ON {schema_name}.dental_appointments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_consultations_tenant_customer  ON {schema_name}.dental_consultations(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_consultations_tenant_date      ON {schema_name}.dental_consultations(tenant_id, consultation_date);
CREATE INDEX IF NOT EXISTS idx_dental_charges_tenant_customer        ON {schema_name}.dental_charges(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_charges_tenant_status          ON {schema_name}.dental_charges(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dental_payments_tenant_date           ON {schema_name}.dental_payments(tenant_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_dental_installments_tenant_status_due ON {schema_name}.dental_installments(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_dental_history_tenant_customer        ON {schema_name}.dental_clinical_history_entries(tenant_id, customer_id);

-- Dental consultation photos (before/after)
CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultation_photos (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL,
    consultation_id INTEGER      NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
    session_id      INTEGER,
    photo_url       TEXT         NOT NULL,
    stage           VARCHAR(20)  NOT NULL DEFAULT 'before',
    caption         TEXT,
    sort_order      INTEGER      DEFAULT 0,
    uploaded_by     INTEGER,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_photo_stage CHECK (stage IN ('before', 'after'))
);
CREATE INDEX IF NOT EXISTS idx_dental_consultation_photos_consultation ON {schema_name}.dental_consultation_photos(consultation_id);

-- ─── DENTAL: CONSULTATION ATTACHMENTS (migration 37) ──────────

CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultation_attachments (
    id               SERIAL PRIMARY KEY,
    tenant_id        VARCHAR(255) NOT NULL,
    consultation_id  INTEGER      NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
    file_url         TEXT         NOT NULL,
    file_name        VARCHAR(255) NOT NULL,
    file_type        VARCHAR(100),
    file_size_bytes  INTEGER,
    category         VARCHAR(50)  DEFAULT 'general'
        CONSTRAINT chk_dca_category CHECK (category IN ('xray','lab_result','prescription','consent','referral','general')),
    description      TEXT,
    uploaded_by      INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dental_consultation_attachments_tenant_consultation ON {schema_name}.dental_consultation_attachments(tenant_id, consultation_id);

-- ─── DENTAL: QUOTES (migration 38) ─────────────────────────────

CREATE SEQUENCE IF NOT EXISTS {schema_name}.dental_quote_number_seq START 1;

CREATE TABLE IF NOT EXISTS {schema_name}.dental_quotes (
    id                  SERIAL PRIMARY KEY,
    tenant_id           VARCHAR(255) NOT NULL,
    customer_id         INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    quote_number        VARCHAR(20)  NOT NULL,
    quote_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
    valid_until         DATE,
    status              VARCHAR(30)  NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_dental_quote_status CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    final_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    conditions_text     TEXT,
    professional_id     INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    accepted_at         TIMESTAMPTZ,
    accepted_by_name    VARCHAR(255),
    acceptance_notes    TEXT,
    rejected_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    consultation_id     INTEGER REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
    converted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, quote_number)
);
CREATE INDEX IF NOT EXISTS idx_dental_quotes_tenant_customer ON {schema_name}.dental_quotes(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS {schema_name}.dental_quote_items (
    id                        SERIAL PRIMARY KEY,
    tenant_id                 VARCHAR(255) NOT NULL,
    quote_id                  INTEGER      NOT NULL REFERENCES {schema_name}.dental_quotes(id) ON DELETE CASCADE,
    treatment_id              INTEGER REFERENCES {schema_name}.dental_treatments(id) ON DELETE SET NULL,
    treatment_name_snapshot   VARCHAR(255) NOT NULL,
    description               TEXT,
    tooth_reference           VARCHAR(50),
    unit_price                NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity                  INTEGER       NOT NULL DEFAULT 1,
    subtotal                  NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order                INTEGER       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dental_quote_items_tenant_quote ON {schema_name}.dental_quote_items(tenant_id, quote_id);

-- ─── DENTAL: CONSULTATION TREATMENTS (migration 26, renamed from dental_consultation_services in migration 35) ─

CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultation_treatments (
    id                      SERIAL PRIMARY KEY,
    tenant_id               INTEGER       NOT NULL,
    consultation_id         INTEGER       NOT NULL
        REFERENCES {schema_name}.dental_consultations(id) ON DELETE RESTRICT,
    treatment_id            INTEGER
        REFERENCES {schema_name}.dental_treatments(id) ON DELETE SET NULL,
    treatment_name_snapshot VARCHAR(255)  NOT NULL,
    unit_price              NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity                INTEGER       NOT NULL DEFAULT 1,
    subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
    tooth_reference         VARCHAR(100),
    clinical_notes          TEXT,
    status                  VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP     DEFAULT NOW(),
    updated_at              TIMESTAMP     DEFAULT NOW(),
    created_by              INTEGER,
    CONSTRAINT chk_dct_quantity CHECK (quantity > 0),
    CONSTRAINT chk_dct_status   CHECK (status IN ('active', 'voided'))
);

CREATE INDEX IF NOT EXISTS idx_dct_consultation_id     ON {schema_name}.dental_consultation_treatments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_dct_treatment_id        ON {schema_name}.dental_consultation_treatments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_dct_tenant_consultation ON {schema_name}.dental_consultation_treatments(tenant_id, consultation_id);

-- ─── DENTAL: CONSULTATION SESSIONS (migration 27) ─────────────

CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultation_sessions (
    id                SERIAL PRIMARY KEY,
    tenant_id         INTEGER      NOT NULL,
    consultation_id   INTEGER      NOT NULL
        REFERENCES {schema_name}.dental_consultations(id) ON DELETE RESTRICT,
    session_number    INTEGER      NOT NULL,
    session_date      TIMESTAMP    NOT NULL DEFAULT NOW(),
    professional_id   INTEGER,
    status            VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
    notes             TEXT,
    evolution         TEXT,
    next_session_date DATE,
    created_at        TIMESTAMP    DEFAULT NOW(),
    updated_at        TIMESTAMP    DEFAULT NOW(),
    CONSTRAINT chk_dcse_status CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled'
    )),
    CONSTRAINT uq_dcse_tenant_consultation_session
        UNIQUE (tenant_id, consultation_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_dcse_consultation_id ON {schema_name}.dental_consultation_sessions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_dcse_tenant_id       ON {schema_name}.dental_consultation_sessions(tenant_id);

-- FK: session_id on dental_consultation_photos -> dental_consultation_sessions (migration 28)
-- (column already defined in dental_consultation_photos above; FK added here)
ALTER TABLE {schema_name}.dental_consultation_photos
    ADD CONSTRAINT fk_dental_photo_session
    FOREIGN KEY (session_id)
    REFERENCES {schema_name}.dental_consultation_sessions(id)
    ON DELETE SET NULL;

-- FK: session_id on dental_clinical_history_entries -> dental_consultation_sessions (migration 28)
ALTER TABLE {schema_name}.dental_clinical_history_entries
    ADD CONSTRAINT fk_dental_history_session
    FOREIGN KEY (session_id)
    REFERENCES {schema_name}.dental_consultation_sessions(id)
    ON DELETE SET NULL;

-- FK: session_id on dental_appointments -> dental_consultation_sessions (migration 33)
ALTER TABLE {schema_name}.dental_appointments
    ADD CONSTRAINT dental_appointments_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES {schema_name}.dental_consultation_sessions(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_da_session_id ON {schema_name}.dental_appointments(session_id);

-- Unique partial index: prevent duplicate active charges per consultation (migration 25)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_charge
    ON {schema_name}.dental_charges (consultation_id)
    WHERE status != 'cancelled';

-- Index: dental_medical_history (migration 23)
CREATE INDEX IF NOT EXISTS idx_dental_med_history_tenant_customer
    ON {schema_name}.dental_medical_history(tenant_id, customer_id);

-- ─── DENTAL: MEDICAL DOCUMENTS (migration 39) ─────────────────

CREATE SEQUENCE IF NOT EXISTS {schema_name}.dental_medical_doc_number_seq START 1;

CREATE TABLE IF NOT EXISTS {schema_name}.dental_medical_documents (
    id                     SERIAL PRIMARY KEY,
    tenant_id              VARCHAR(255) NOT NULL,
    customer_id            INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    consultation_id        INTEGER      REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
    document_type          VARCHAR(30)  NOT NULL
        CONSTRAINT chk_dmd_type CHECK (document_type IN ('medical_report', 'medical_certificate', 'prescription')),
    document_number        VARCHAR(20)  NOT NULL,
    document_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
    title                  VARCHAR(255),
    content                TEXT,
    professional_name      VARCHAR(255),
    professional_license   VARCHAR(100),
    professional_specialty VARCHAR(100),
    created_by             INTEGER,
    created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dental_medical_doc_number UNIQUE (tenant_id, document_number)
);
CREATE INDEX IF NOT EXISTS idx_dental_medical_docs_customer
    ON {schema_name}.dental_medical_documents (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_medical_docs_consultation
    ON {schema_name}.dental_medical_documents (tenant_id, consultation_id);

-- ─── dental_anamnesis (migration 40) ─────────────────────────────────────────
-- One anamnesis record per consultation (UNIQUE constraint enables upsert)
CREATE TABLE IF NOT EXISTS {schema_name}.dental_anamnesis (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
  has_diabetes BOOLEAN DEFAULT FALSE,
  has_hypertension BOOLEAN DEFAULT FALSE,
  has_heart_disease BOOLEAN DEFAULT FALSE,
  has_respiratory_disease BOOLEAN DEFAULT FALSE,
  has_kidney_disease BOOLEAN DEFAULT FALSE,
  has_epilepsy BOOLEAN DEFAULT FALSE,
  has_hepatitis BOOLEAN DEFAULT FALSE,
  has_hiv BOOLEAN DEFAULT FALSE,
  other_systemic_conditions TEXT,
  has_penicillin_allergy BOOLEAN DEFAULT FALSE,
  has_aspirin_allergy BOOLEAN DEFAULT FALSE,
  has_latex_allergy BOOLEAN DEFAULT FALSE,
  has_anesthesia_allergy BOOLEAN DEFAULT FALSE,
  other_allergies TEXT,
  current_medications TEXT,
  takes_anticoagulants BOOLEAN DEFAULT FALSE,
  takes_bisphosphonates BOOLEAN DEFAULT FALSE,
  previous_dental_treatments TEXT,
  previous_complications TEXT,
  last_dental_visit DATE,
  smokes BOOLEAN DEFAULT FALSE,
  alcohol_consumption VARCHAR(20),
  bruxism BOOLEAN DEFAULT FALSE,
  additional_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(consultation_id)
);

-- ─── dental_prescriptions (migration 41) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS {schema_name}.dental_prescriptions (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
  medication   VARCHAR(200) NOT NULL,
  dosage       VARCHAR(100) NOT NULL,
  frequency    VARCHAR(100) NOT NULL,
  duration     VARCHAR(100) NOT NULL,
  route        VARCHAR(50),
  instructions TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_consultation
    ON {schema_name}.dental_prescriptions(consultation_id);

-- ─── dental_odontogram_entries + attachments (migration 42) ───────────────────
CREATE TABLE IF NOT EXISTS {schema_name}.dental_odontogram_entries (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE CASCADE,
  consultation_id INTEGER NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  surface VARCHAR(20),
  finding_type VARCHAR(50) NOT NULL,
  finding_status VARCHAR(30) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'normal',
  observation TEXT,
  procedure_suggestion_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS {schema_name}.dental_odontogram_attachments (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES {schema_name}.dental_odontogram_entries(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(200),
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_odontogram_patient
    ON {schema_name}.dental_odontogram_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_odontogram_consultation
    ON {schema_name}.dental_odontogram_entries(consultation_id);

-- ─── dental_diagnoses (migration 43) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS {schema_name}.dental_diagnoses (
  id                  SERIAL PRIMARY KEY,
  consultation_id     INTEGER NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
  odontogram_entry_id INTEGER REFERENCES {schema_name}.dental_odontogram_entries(id) ON DELETE SET NULL,
  diagnosis_code      VARCHAR(20),
  diagnosis_text      VARCHAR(500) NOT NULL,
  severity            VARCHAR(20) DEFAULT 'moderate',
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dental_diagnoses_consultation
    ON {schema_name}.dental_diagnoses(consultation_id);

-- ═══════════════════════════════════════════════════════════════
-- CORE 4 — INVENTORY
-- Módulo de inventario y abastecimiento. Proveedores, bodegas,
-- correlativos, compras, recepciones y ledger de stock por tenant.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {schema_name}.suppliers (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    normalized_name      VARCHAR(255) NOT NULL,
    document_type        VARCHAR(50),
    document_number      VARCHAR(80),
    phone                VARCHAR(50),
    mobile               VARCHAR(50),
    email                VARCHAR(150),
    country              VARCHAR(100),
    region_state         VARCHAR(100),
    city                 VARCHAR(100),
    commune_district     VARCHAR(100),
    address              TEXT,
    contact_name         VARCHAR(150),
    payment_term_days    INTEGER      NOT NULL DEFAULT 0,
    notes                TEXT,
    status               VARCHAR(30)  NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.warehouses (
    id                   SERIAL PRIMARY KEY,
    code                 VARCHAR(30)  NOT NULL,
    name                 VARCHAR(150) NOT NULL,
    warehouse_type       VARCHAR(30)  NOT NULL DEFAULT 'main',
    country              VARCHAR(100),
    region_state         VARCHAR(100),
    city                 VARCHAR(100),
    commune_district     VARCHAR(100),
    address              TEXT,
    manager_name         VARCHAR(150),
    phone                VARCHAR(50),
    notes                TEXT,
    status               VARCHAR(30)  NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouses_code UNIQUE (code),
    CONSTRAINT chk_warehouses_type CHECK (warehouse_type IN ('main', 'store', 'transit', 'external'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.document_sequences (
    id                   SERIAL PRIMARY KEY,
    document_type        VARCHAR(30) NOT NULL,
    prefix               VARCHAR(20) NOT NULL,
    current_number       INTEGER     NOT NULL DEFAULT 0,
    padding              INTEGER     NOT NULL DEFAULT 6,
    reset_policy         VARCHAR(20) NOT NULL DEFAULT 'yearly',
    status               VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    seq_year             INTEGER     NOT NULL,
    CONSTRAINT uq_document_sequences_type UNIQUE (document_type),
    CONSTRAINT chk_document_sequences_type CHECK (document_type IN (
        'purchase_order', 'purchase_invoice', 'dispatch_order', 'stock_count', 'quote'
    )),
    CONSTRAINT chk_document_sequences_reset_policy CHECK (reset_policy IN ('yearly', 'never'))
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_products_preferred_supplier'
          AND conrelid = '{schema_name}.products'::regclass
    ) THEN
        ALTER TABLE {schema_name}.products
            ADD CONSTRAINT fk_products_preferred_supplier
            FOREIGN KEY (preferred_supplier_id)
            REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS {schema_name}.purchase_documents (
    id                        SERIAL PRIMARY KEY,
    document_type             VARCHAR(30)   NOT NULL,
    internal_number           VARCHAR(50)   NOT NULL,
    supplier_document_number  VARCHAR(80),
    supplier_id               INTEGER       NOT NULL REFERENCES {schema_name}.suppliers(id) ON DELETE RESTRICT,
    issue_date                DATE          NOT NULL,
    expected_reception_date   DATE,
    due_date                  DATE,
    payment_condition         VARCHAR(20)   NOT NULL DEFAULT 'cash',
    payment_term_days         INTEGER       NOT NULL DEFAULT 0,
    currency                  VARCHAR(10)   NOT NULL DEFAULT 'CLP',
    subtotal                  NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_total            NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    total                     NUMERIC(14,2) NOT NULL DEFAULT 0,
    status                    VARCHAR(30)   NOT NULL DEFAULT 'draft',
    notes                     TEXT,
    created_by                INTEGER,
    created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_purchase_documents_internal_number UNIQUE (internal_number),
    CONSTRAINT chk_purchase_documents_type CHECK (document_type IN ('purchase_order', 'purchase_invoice')),
    CONSTRAINT chk_purchase_documents_payment_condition CHECK (payment_condition IN ('cash', 'credit')),
    CONSTRAINT chk_purchase_documents_status CHECK (status IN (
        'draft', 'issued', 'partially_received', 'received', 'cancelled'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.purchase_document_lines (
    id                     SERIAL PRIMARY KEY,
    purchase_document_id   INTEGER       NOT NULL REFERENCES {schema_name}.purchase_documents(id) ON DELETE CASCADE,
    product_id             INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    product_name_snapshot  VARCHAR(150)  NOT NULL,
    sku_snapshot           VARCHAR(80),
    quantity               NUMERIC(12,2) NOT NULL,
    received_quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_quantity       NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit                   VARCHAR(30),
    unit_cost              NUMERIC(14,4) NOT NULL DEFAULT 0,
    discount_percent       NUMERIC(8,4)  NOT NULL DEFAULT 0,
    tax_percent            NUMERIC(8,4)  NOT NULL DEFAULT 0,
    line_total             NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes                  TEXT,
    CONSTRAINT chk_purchase_document_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_purchase_document_lines_received CHECK (received_quantity >= 0),
    CONSTRAINT chk_purchase_document_lines_pending CHECK (pending_quantity >= 0)
);

CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipts (
    id                    SERIAL PRIMARY KEY,
    receipt_number        VARCHAR(50) NOT NULL,
    purchase_document_id  INTEGER     NOT NULL REFERENCES {schema_name}.purchase_documents(id) ON DELETE RESTRICT,
    warehouse_id          INTEGER     NOT NULL REFERENCES {schema_name}.warehouses(id) ON DELETE RESTRICT,
    reception_date        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supplier_id           INTEGER     NOT NULL REFERENCES {schema_name}.suppliers(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes                 TEXT,
    created_by            INTEGER,
    created_at            TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stock_receipts_number UNIQUE (receipt_number),
    CONSTRAINT chk_stock_receipts_status CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipt_lines (
    id                         SERIAL PRIMARY KEY,
    stock_receipt_id           INTEGER       NOT NULL REFERENCES {schema_name}.stock_receipts(id) ON DELETE CASCADE,
    purchase_document_line_id  INTEGER       REFERENCES {schema_name}.purchase_document_lines(id) ON DELETE SET NULL,
    product_id                 INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    quantity_received          NUMERIC(12,2) NOT NULL,
    unit_cost                  NUMERIC(14,4) NOT NULL DEFAULT 0,
    unit                       VARCHAR(30),
    batch_number               VARCHAR(120),
    serial_number              VARCHAR(120),
    expiration_date            DATE,
    CONSTRAINT chk_stock_receipt_lines_quantity CHECK (quantity_received > 0)
);

CREATE TABLE IF NOT EXISTS {schema_name}.stock_movements (
    id                   SERIAL PRIMARY KEY,
    movement_type        VARCHAR(30)   NOT NULL,
    product_id           INTEGER       NOT NULL REFERENCES {schema_name}.products(id) ON DELETE RESTRICT,
    warehouse_id         INTEGER       NOT NULL REFERENCES {schema_name}.warehouses(id) ON DELETE RESTRICT,
    related_warehouse_id INTEGER       REFERENCES {schema_name}.warehouses(id) ON DELETE SET NULL,
    reference_table      VARCHAR(80)   NOT NULL,
    reference_id         INTEGER,
    reference_number     VARCHAR(80),
    quantity             NUMERIC(12,2) NOT NULL,
    unit_cost            NUMERIC(14,4) NOT NULL DEFAULT 0,
    total_cost           NUMERIC(14,4) NOT NULL DEFAULT 0,
    movement_date        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signed_quantity      NUMERIC(12,2) NOT NULL,
    notes                TEXT,
    created_by           INTEGER,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_movements_type CHECK (movement_type IN (
        'receipt', 'transfer_out', 'transfer_in', 'adjustment_in',
        'adjustment_out', 'consumption', 'reversal'
    )),
    CONSTRAINT chk_stock_movements_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_normalized_name            ON {schema_name}.suppliers(normalized_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status                     ON {schema_name}.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_status                    ON {schema_name}.warehouses(status);
CREATE INDEX IF NOT EXISTS idx_document_sequences_status            ON {schema_name}.document_sequences(status);
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier_id       ON {schema_name}.products(preferred_supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_documents_supplier_id       ON {schema_name}.purchase_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_documents_status            ON {schema_name}.purchase_documents(status);
CREATE INDEX IF NOT EXISTS idx_purchase_document_lines_document_id  ON {schema_name}.purchase_document_lines(purchase_document_id);
CREATE INDEX IF NOT EXISTS idx_purchase_document_lines_product_id   ON {schema_name}.purchase_document_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_purchase_document_id  ON {schema_name}.stock_receipts(purchase_document_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_warehouse_id          ON {schema_name}.stock_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_supplier_id           ON {schema_name}.stock_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_status                ON {schema_name}.stock_receipts(status);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_receipt_id       ON {schema_name}.stock_receipt_lines(stock_receipt_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_document_line_id ON {schema_name}.stock_receipt_lines(purchase_document_line_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_product_id       ON {schema_name}.stock_receipt_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id           ON {schema_name}.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id         ON {schema_name}.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_related_warehouse_id ON {schema_name}.stock_movements(related_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse    ON {schema_name}.stock_movements(product_id, warehouse_id);

CREATE OR REPLACE FUNCTION {schema_name}.trg_stock_movements_immutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'stock_movements is append-only (no UPDATE/DELETE)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_movements_no_mutate ON {schema_name}.stock_movements;

CREATE TRIGGER stock_movements_no_mutate
BEFORE UPDATE OR DELETE ON {schema_name}.stock_movements
FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_stock_movements_immutable();

-- ═══════════════════════════════════════════════════════════════
-- CORE 5 — HUMAN RESOURCES
-- Organización, perfiles de empleados y solicitudes internas por tenant.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {schema_name}.hr_departments (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(50) NOT NULL,
    name       VARCHAR(150) NOT NULL,
    status     VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_departments_code UNIQUE (code),
    CONSTRAINT chk_hr_departments_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_positions (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(50) NOT NULL,
    name       VARCHAR(150) NOT NULL,
    status     VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_positions_code UNIQUE (code),
    CONSTRAINT chk_hr_positions_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_cost_centers (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(50) NOT NULL,
    name       VARCHAR(150) NOT NULL,
    status     VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_cost_centers_code UNIQUE (code),
    CONSTRAINT chk_hr_cost_centers_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_work_shifts (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(50) NOT NULL,
    name       VARCHAR(150) NOT NULL,
    status     VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_work_shifts_code UNIQUE (code),
    CONSTRAINT chk_hr_work_shifts_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_types (
    id             SERIAL PRIMARY KEY,
    code           VARCHAR(50) NOT NULL,
    name           VARCHAR(150) NOT NULL,
    description    TEXT,
    requires_dates BOOLEAN NOT NULL DEFAULT FALSE,
    status         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_request_types_code UNIQUE (code),
    CONSTRAINT chk_hr_request_types_status CHECK (status IN ('active', 'inactive'))
);

INSERT INTO {schema_name}.hr_request_types (code, name, description, requires_dates, status)
VALUES
    ('leave', 'Vacaciones/Licencia', 'Solicitud de licencia o ausencia', TRUE, 'active'),
    ('permission', 'Permiso', 'Solicitud de permiso', TRUE, 'active'),
    ('general', 'General', 'Solicitud general', FALSE, 'active')
ON CONFLICT (code) DO NOTHING;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_department' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES {schema_name}.hr_departments(id) ON DELETE SET NULL;
    END IF;
END; $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_position' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES {schema_name}.hr_positions(id) ON DELETE SET NULL;
    END IF;
END; $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_cost_center' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT fk_employees_cost_center FOREIGN KEY (cost_center_id) REFERENCES {schema_name}.hr_cost_centers(id) ON DELETE SET NULL;
    END IF;
END; $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_work_shift' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT fk_employees_work_shift FOREIGN KEY (work_shift_id) REFERENCES {schema_name}.hr_work_shifts(id) ON DELETE SET NULL;
    END IF;
END; $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_supervisor' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT fk_employees_supervisor FOREIGN KEY (supervisor_employee_id) REFERENCES {schema_name}.employees(id) ON DELETE SET NULL;
    END IF;
END; $$;

CREATE TABLE IF NOT EXISTS {schema_name}.hr_requests (
    id              SERIAL PRIMARY KEY,
    request_type_id INTEGER NOT NULL REFERENCES {schema_name}.hr_request_types(id) ON DELETE RESTRICT,
    employee_id     INTEGER NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE RESTRICT,
    title           VARCHAR(150),
    description     TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'submitted',
    current_step    VARCHAR(30) NOT NULL DEFAULT 'supervisor',
    created_by      INTEGER,
    updated_by      INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hr_requests_status CHECK (status IN ('submitted', 'supervisor_approved', 'supervisor_rejected', 'hr_approved', 'hr_rejected', 'annulled')),
    CONSTRAINT chk_hr_requests_current_step CHECK (current_step IN ('supervisor', 'hr', 'done'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_approvals (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL REFERENCES {schema_name}.hr_requests(id) ON DELETE CASCADE,
    step        VARCHAR(30) NOT NULL,
    decision    VARCHAR(30) NOT NULL DEFAULT 'pending',
    decided_by  INTEGER,
    decided_at  TIMESTAMP,
    comment     TEXT,
    CONSTRAINT chk_hr_request_approvals_step CHECK (step IN ('supervisor', 'hr')),
    CONSTRAINT chk_hr_request_approvals_decision CHECK (decision IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_status_history (
    id            SERIAL PRIMARY KEY,
    request_id    INTEGER NOT NULL REFERENCES {schema_name}.hr_requests(id) ON DELETE CASCADE,
    from_status   VARCHAR(30),
    to_status     VARCHAR(30),
    actor_user_id INTEGER,
    actor_role    VARCHAR(30),
    note          TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_supervisor_employee_id ON {schema_name}.employees(supervisor_employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON {schema_name}.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON {schema_name}.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_cost_center_id ON {schema_name}.employees(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_shift_id ON {schema_name}.employees(work_shift_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_request_type_id ON {schema_name}.hr_requests(request_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_employee_id ON {schema_name}.hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_status ON {schema_name}.hr_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_requests_current_step ON {schema_name}.hr_requests(current_step);
CREATE INDEX IF NOT EXISTS idx_hr_request_approvals_request_id ON {schema_name}.hr_request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_hr_request_status_history_request_id ON {schema_name}.hr_request_status_history(request_id);
-- =============================================================
-- CORE 6 - TREASURY
-- Treasury, receivables and payables tables per tenant.
-- =============================================================

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_counterparties (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    counterparty_type VARCHAR(20) NOT NULL,
    customer_id INTEGER,
    supplier_id INTEGER,
    name_snapshot VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    document_number VARCHAR(80),
    phone VARCHAR(50),
    email VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_counterparties_document UNIQUE (tenant_id, document_number),
    CONSTRAINT chk_treasury_counterparties_type CHECK (counterparty_type IN ('customer', 'supplier', 'both'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_payment_terms (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    term_type VARCHAR(20) NOT NULL,
    days_due INTEGER NOT NULL DEFAULT 0,
    installments_count INTEGER NOT NULL DEFAULT 1,
    grace_days INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_payment_terms_code UNIQUE (code),
    CONSTRAINT chk_treasury_payment_terms_type CHECK (term_type IN ('cash', 'credit', 'installments'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_sequences (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    document_type VARCHAR(50) NOT NULL,
    seq_year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_treasury_document_sequences UNIQUE (tenant_id, document_type, seq_year)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_registers (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_cash_registers_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    cash_register_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_cash_registers(id) ON DELETE RESTRICT,
    employee_id INTEGER NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE RESTRICT,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    closed_at TIMESTAMP,
    expected_amount NUMERIC(14,2),
    counted_amount NUMERIC(14,2),
    difference_amount NUMERIC(14,2),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    CONSTRAINT chk_treasury_cash_sessions_status CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_movements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    cash_session_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL,
    reference_table VARCHAR(80),
    reference_id INTEGER,
    amount NUMERIC(14,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
    signed_amount NUMERIC(14,2) NOT NULL,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_treasury_cash_movements_type CHECK (movement_type IN (
        'sale_in', 'payment_out', 'deposit_out', 'withdrawal_out', 'adjustment_in', 'adjustment_out'
    ))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_documents (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    document_type VARCHAR(30) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    internal_number VARCHAR(50) NOT NULL,
    external_number VARCHAR(80),
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    origin_core VARCHAR(50),
    origin_table VARCHAR(80),
    origin_id INTEGER,
    issue_date DATE NOT NULL,
    due_date DATE,
    payment_term_id INTEGER,
    notes TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL,
    balance_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_documents_internal_number UNIQUE (tenant_id, internal_number),
    CONSTRAINT chk_treasury_documents_type CHECK (document_type IN (
        'sale_invoice', 'sale_note', 'purchase_invoice', 'debit_note', 'credit_note', 'installment_plan', 'internal_charge'
    )),
    CONSTRAINT chk_treasury_documents_direction CHECK (direction IN ('receivable', 'payable')),
    CONSTRAINT chk_treasury_documents_status CHECK (status IN ('draft', 'open', 'partially_applied', 'settled', 'void'))
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_treasury_documents_payment_term'
          AND conrelid = '{schema_name}.treasury_documents'::regclass
    ) THEN
        ALTER TABLE {schema_name}.treasury_documents
            ADD CONSTRAINT fk_treasury_documents_payment_term
            FOREIGN KEY (payment_term_id)
            REFERENCES {schema_name}.treasury_payment_terms(id) ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_lines (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE CASCADE,
    line_number INTEGER,
    description TEXT,
    quantity NUMERIC(12,2),
    unit_price NUMERIC(14,4),
    line_total NUMERIC(14,2)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_installments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE CASCADE,
    installment_number INTEGER,
    due_date DATE,
    amount NUMERIC(14,2),
    balance_amount NUMERIC(14,2),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    CONSTRAINT chk_treasury_installments_status CHECK (status IN ('pending', 'partially_applied', 'settled'))
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    receipt_number VARCHAR(50) NOT NULL,
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    receipt_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cash_session_id INTEGER REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    total_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_receipts_number UNIQUE (tenant_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipt_applications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    receipt_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_receipts(id) ON DELETE CASCADE,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE RESTRICT,
    installment_id INTEGER REFERENCES {schema_name}.treasury_installments(id) ON DELETE RESTRICT,
    applied_amount NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    disbursement_number VARCHAR(50) NOT NULL,
    counterparty_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_counterparties(id) ON DELETE RESTRICT,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cash_session_id INTEGER REFERENCES {schema_name}.treasury_cash_sessions(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    total_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treasury_disbursements_number UNIQUE (tenant_id, disbursement_number)
);

CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursement_applications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    disbursement_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_disbursements(id) ON DELETE CASCADE,
    treasury_document_id INTEGER NOT NULL REFERENCES {schema_name}.treasury_documents(id) ON DELETE RESTRICT,
    installment_id INTEGER REFERENCES {schema_name}.treasury_installments(id) ON DELETE RESTRICT,
    applied_amount NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_treasury_counterparties_document_number ON {schema_name}.treasury_counterparties(document_number);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_cash_register_id ON {schema_name}.treasury_cash_sessions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_employee_id ON {schema_name}.treasury_cash_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_sessions_status ON {schema_name}.treasury_cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_movements_cash_session_id ON {schema_name}.treasury_cash_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_counterparty_id ON {schema_name}.treasury_documents(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_status ON {schema_name}.treasury_documents(status);
CREATE INDEX IF NOT EXISTS idx_treasury_documents_direction ON {schema_name}.treasury_documents(direction);
CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_document_id ON {schema_name}.treasury_document_lines(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_installments_document_id ON {schema_name}.treasury_installments(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_installments_status ON {schema_name}.treasury_installments(status);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_counterparty_id ON {schema_name}.treasury_receipts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_cash_session_id ON {schema_name}.treasury_receipts(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_receipt_id ON {schema_name}.treasury_receipt_applications(receipt_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_document_id ON {schema_name}.treasury_receipt_applications(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipt_applications_installment_id ON {schema_name}.treasury_receipt_applications(installment_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursements_counterparty_id ON {schema_name}.treasury_disbursements(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursements_cash_session_id ON {schema_name}.treasury_disbursements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_disbursement_id ON {schema_name}.treasury_disbursement_applications(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_document_id ON {schema_name}.treasury_disbursement_applications(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_treasury_disbursement_applications_installment_id ON {schema_name}.treasury_disbursement_applications(installment_id);

CREATE OR REPLACE FUNCTION {schema_name}.trg_treasury_cash_movements_immutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'treasury_cash_movements is append-only (no UPDATE/DELETE)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS treasury_cash_movements_no_mutate ON {schema_name}.treasury_cash_movements;

CREATE TRIGGER treasury_cash_movements_no_mutate
BEFORE UPDATE OR DELETE ON {schema_name}.treasury_cash_movements
FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_treasury_cash_movements_immutable();

-- ─── COTIZACIONES (standalone module — migration 52) ─────────
-- Distinct from dental_quotes/dental_quote_items. No shared table.
-- treasury_document_id (not treasury_collections, which does not
-- exist) is the real payment source of truth for a quote.

CREATE TABLE IF NOT EXISTS {schema_name}.quotes (
    id                             SERIAL PRIMARY KEY,
    quote_number                   VARCHAR(50)   NOT NULL,
    customer_id                    INTEGER       REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    status                         VARCHAR(30)   NOT NULL DEFAULT 'draft',
    valid_until                    DATE,
    subtotal                       NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount                NUMERIC(14,2) NOT NULL DEFAULT 0,
    final_amount                   NUMERIC(14,2) NOT NULL DEFAULT 0,
    accepted_at                    TIMESTAMP,
    accepted_by_name               VARCHAR(150),
    acceptance_notes               TEXT,
    rejected_at                    TIMESTAMP,
    rejection_reason               TEXT,
    treasury_document_id           INTEGER       REFERENCES {schema_name}.treasury_documents(id) ON DELETE SET NULL,
    paid_at                        TIMESTAMP,
    converted_at                   TIMESTAMP,
    converted_purchase_document_id INTEGER       REFERENCES {schema_name}.purchase_documents(id) ON DELETE SET NULL,
    notes                          TEXT,
    created_by                     INTEGER,
    created_at                     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_quotes_number UNIQUE (quote_number),
    CONSTRAINT chk_quotes_status CHECK (status IN (
        'draft', 'sent', 'accepted', 'rejected', 'expired', 'paid', 'converted'
    ))
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id            ON {schema_name}.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status                 ON {schema_name}.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_treasury_document_id   ON {schema_name}.quotes(treasury_document_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_purchase_doc ON {schema_name}.quotes(converted_purchase_document_id);

CREATE TABLE IF NOT EXISTS {schema_name}.quote_lines (
    id                     SERIAL PRIMARY KEY,
    quote_id               INTEGER       NOT NULL REFERENCES {schema_name}.quotes(id) ON DELETE CASCADE,
    product_id             INTEGER       REFERENCES {schema_name}.products(id) ON DELETE SET NULL,
    product_name_snapshot  VARCHAR(150),
    sku_snapshot           VARCHAR(80),
    supplier_id            INTEGER       REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL,
    supplier_cost          NUMERIC(14,4) NOT NULL DEFAULT 0,
    margin_pct             NUMERIC(8,4)  NOT NULL DEFAULT 0,
    unit_price             NUMERIC(14,4) NOT NULL DEFAULT 0,
    quantity               NUMERIC(12,2) NOT NULL DEFAULT 1,
    subtotal               NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_non_stocked         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quote_lines_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id    ON {schema_name}.quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_id  ON {schema_name}.quote_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_supplier_id ON {schema_name}.quote_lines(supplier_id);


-- Optional phpPgAdmin browse access for the hosting login.
-- This block is additive: it only GRANTs privileges when the PostgreSQL role exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hernanci') THEN
        EXECUTE 'GRANT ALL PRIVILEGES ON SCHEMA "{schema_name}" TO "hernanci"';
        EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO "hernanci"';
        EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "{schema_name}" TO "hernanci"';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL PRIVILEGES ON TABLES TO "hernanci"';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL PRIVILEGES ON SEQUENCES TO "hernanci"';
    END IF;
END $$;


-- HR balances and holidays (CORE 5 extension)
-- HR balances and holidays core (per tenant; replace {schema_name}). PostgreSQL 10.23.
CREATE TABLE IF NOT EXISTS {schema_name}.hr_holidays (
 id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, holiday_date DATE NOT NULL, end_date DATE,
 holiday_type VARCHAR(30) NOT NULL DEFAULT 'national', is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
 is_working_day BOOLEAN NOT NULL DEFAULT FALSE, notes TEXT, status VARCHAR(30) NOT NULL DEFAULT 'active',
 created_by INTEGER, updated_by INTEGER, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_hr_holidays_date_name UNIQUE (holiday_date,name),
 CONSTRAINT chk_hr_holidays_type CHECK (holiday_type IN ('national','regional','company','other')),
 CONSTRAINT chk_hr_holidays_status CHECK (status IN ('active','inactive')),
 CONSTRAINT chk_hr_holidays_end_date CHECK (end_date IS NULL OR end_date >= holiday_date)
);
CREATE INDEX IF NOT EXISTS idx_hr_holidays_holiday_date ON {schema_name}.hr_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_hr_holidays_status ON {schema_name}.hr_holidays(status);
CREATE TABLE IF NOT EXISTS {schema_name}.hr_leave_balances (
 id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE CASCADE,
 balance_code VARCHAR(30) NOT NULL, unit VARCHAR(10) NOT NULL DEFAULT 'days', base_entitlement NUMERIC(8,2) NOT NULL DEFAULT 0,
 accrual_enabled BOOLEAN NOT NULL DEFAULT FALSE, accrual_per_month NUMERIC(8,4) NOT NULL DEFAULT 0, accrual_cap NUMERIC(8,2), status VARCHAR(30) NOT NULL DEFAULT 'active',
 created_by INTEGER, updated_by INTEGER, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_hr_leave_balances_employee_code UNIQUE(employee_id,balance_code),
 CONSTRAINT chk_hr_leave_balances_code CHECK(balance_code IN ('vacation_days','permission_hours')),
 CONSTRAINT chk_hr_leave_balances_unit CHECK(unit IN ('days','hours')),
 CONSTRAINT chk_hr_leave_balances_status CHECK(status IN ('active','inactive')),
 CONSTRAINT chk_hr_leave_balances_amounts CHECK(base_entitlement >= 0 AND accrual_per_month >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee_id ON {schema_name}.hr_leave_balances(employee_id);
CREATE TABLE IF NOT EXISTS {schema_name}.hr_balance_movements (
 id SERIAL PRIMARY KEY, leave_balance_id INTEGER NOT NULL REFERENCES {schema_name}.hr_leave_balances(id) ON DELETE RESTRICT,
 employee_id INTEGER NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE RESTRICT, balance_code VARCHAR(30) NOT NULL,
 movement_type VARCHAR(40) NOT NULL, signed_quantity NUMERIC(10,2) NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL,
 request_id INTEGER REFERENCES {schema_name}.hr_requests(id) ON DELETE RESTRICT, reverses_movement_id INTEGER REFERENCES {schema_name}.hr_balance_movements(id) ON DELETE RESTRICT,
 accrual_seq INTEGER, notes TEXT, movement_date DATE NOT NULL DEFAULT CURRENT_DATE, created_by INTEGER, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_hr_balance_movements_type CHECK(movement_type IN ('accrual','hr_adjustment','reservation','reservation_release','consumption','consumption_reversal')),
 CONSTRAINT chk_hr_balance_movements_sign CHECK((movement_type='hr_adjustment' AND signed_quantity<>0) OR (movement_type IN ('reservation','consumption') AND signed_quantity<0) OR (movement_type IN ('accrual','reservation_release','consumption_reversal') AND signed_quantity>0)),
 CONSTRAINT chk_hr_balance_movements_accrual_seq CHECK((movement_type = 'accrual' AND accrual_seq IS NOT NULL) OR movement_type <> 'accrual'),
 CONSTRAINT chk_hr_balance_movements_period CHECK(period_end > period_start)
);
CREATE INDEX IF NOT EXISTS idx_hr_balance_movements_employee_balance_period ON {schema_name}.hr_balance_movements(employee_id,balance_code,period_start);
CREATE INDEX IF NOT EXISTS idx_hr_balance_movements_leave_balance_id ON {schema_name}.hr_balance_movements(leave_balance_id);
CREATE INDEX IF NOT EXISTS idx_hr_balance_movements_request_id ON {schema_name}.hr_balance_movements(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_balance_movements_accrual ON {schema_name}.hr_balance_movements(leave_balance_id,period_start,accrual_seq) WHERE movement_type='accrual';
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_balance_movements_reservation ON {schema_name}.hr_balance_movements(request_id) WHERE movement_type='reservation';
CREATE OR REPLACE FUNCTION {schema_name}.hr_balance_movements_no_mutate() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'hr_balance_movements are immutable'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_hr_balance_movements_immutable ON {schema_name}.hr_balance_movements;
CREATE TRIGGER trg_hr_balance_movements_immutable BEFORE UPDATE OR DELETE ON {schema_name}.hr_balance_movements FOR EACH ROW EXECUTE PROCEDURE {schema_name}.hr_balance_movements_no_mutate();
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS consumes_balance BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS balance_code VARCHAR(30);
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(10) NOT NULL DEFAULT 'days';
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS excludes_holidays BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE {schema_name}.hr_request_types ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(10);
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS balance_code VARCHAR(30);
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS reservation_movement_id INTEGER;
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS balance_state VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS decision_reason TEXT;
ALTER TABLE {schema_name}.hr_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='chk_hr_request_types_balance' AND conrelid='{schema_name}.hr_request_types'::regclass) THEN ALTER TABLE {schema_name}.hr_request_types ADD CONSTRAINT chk_hr_request_types_balance CHECK((NOT consumes_balance OR balance_code IN ('vacation_days','permission_hours')) AND NOT(consumes_balance AND is_unlimited)); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='chk_hr_request_types_quantity_unit' AND conrelid='{schema_name}.hr_request_types'::regclass) THEN ALTER TABLE {schema_name}.hr_request_types ADD CONSTRAINT chk_hr_request_types_quantity_unit CHECK(quantity_unit IN ('days','hours')); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='chk_hr_requests_balance_state' AND conrelid='{schema_name}.hr_requests'::regclass) THEN ALTER TABLE {schema_name}.hr_requests ADD CONSTRAINT chk_hr_requests_balance_state CHECK(balance_state IN ('none','reserved','released','consumed','reversed')); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fk_hr_requests_reservation_movement' AND conrelid='{schema_name}.hr_requests'::regclass) THEN ALTER TABLE {schema_name}.hr_requests ADD CONSTRAINT fk_hr_requests_reservation_movement FOREIGN KEY(reservation_movement_id) REFERENCES {schema_name}.hr_balance_movements(id) ON DELETE SET NULL; END IF;
END $$;
