-- =============================================================
-- MIGRATION: 14_garage_operations_module.sql
-- Core 1 — Garage Operations
--
-- Registra el módulo garage_operations en el catálogo global y
-- crea todas las tablas del Core en el schema del tenant.
--
-- ESQUEMA DE EJECUCIÓN:
--   Este archivo tiene DOS secciones:
--
--   SECCIÓN A — Ejecutar UNA SOLA VEZ en schema public:
--     Registra módulo + transacciones en module_catalog / module_transactions
--
--   SECCIÓN B — Ejecutar por cada tenant (reemplazar {schema_name}):
--     Crea las 24 tablas del Core en el schema del tenant
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar sección A y ejecutar
--   Luego reemplazar {schema_name} por el schema real y ejecutar sección B
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN A — GOBERNANZA GLOBAL (schema public)
-- ─────────────────────────────────────────────────────────────

-- A.1 Registrar módulo en module_catalog
INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('garage_operations', 'Operaciones de Taller', 'Gestión operativa de taller: agenda, órdenes de trabajo e historial vehicular.',
     'wrench', 'garage', FALSE, TRUE, FALSE, TRUE, 10, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    version     = EXCLUDED.version,
    status      = EXCLUDED.status;

-- A.2 Registrar transacciones del módulo
-- Obtener el id del módulo recién insertado
DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id FROM public.module_catalog WHERE code = 'garage_operations';

    -- Dashboard del taller
    INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'garage_dashboard',         'Dashboard Taller',          'Panel principal del taller',                   '/garage',                     'layout-dashboard',   1,  TRUE,  'activo'),
        -- Clientes
        (mod_id, 'garage_customers',         'Clientes',                  'Gestión de clientes del taller',               '/garage/customers',           'users',              2,  TRUE,  'activo'),
        -- Vehículos
        (mod_id, 'garage_vehicles',          'Vehículos',                 'Gestión de vehículos',                         '/garage/vehicles',            'car',                3,  TRUE,  'activo'),
        -- Agenda
        (mod_id, 'garage_appointments',      'Agenda / Citas',            'Agenda y pre-ingreso de vehículos',            '/garage/appointments',        'calendar',           4,  TRUE,  'activo'),
        -- Órdenes de trabajo
        (mod_id, 'garage_work_orders',       'Órdenes de Trabajo',        'Gestión de órdenes de trabajo',                '/garage/work-orders',         'clipboard-list',     5,  TRUE,  'activo'),
        -- Empleados
        (mod_id, 'garage_employees',         'Empleados',                 'Gestión de empleados del taller',              '/garage/employees',           'user-cog',           6,  TRUE,  'activo'),
        -- Tarifas
        (mod_id, 'garage_labor_rates',       'Tarifas de Mano de Obra',   'Tempario y tarifas por empleado',              '/garage/labor-rates',         'clock',              7,  TRUE,  'activo'),
        -- Productos
        (mod_id, 'garage_products',          'Productos',                 'Productos e insumos configurables',            '/garage/products',            'package',            8,  TRUE,  'activo'),
        -- Servicios configurables
        (mod_id, 'garage_service_templates', 'Servicios Configurables',   'Plantillas de servicios reutilizables',        '/garage/service-templates',   'tool',               9,  TRUE,  'activo'),
        -- Historial vehículo (no en menú principal, se accede desde el vehículo)
        (mod_id, 'garage_vehicle_history',   'Historial Vehicular',       'Historial técnico por vehículo',               '/garage/vehicles/:id/history','history',            10, FALSE, 'activo'),
        -- Catálogos (no en menú principal, acceso desde configuración)
        (mod_id, 'garage_catalogs',          'Catálogos de Vehículos',    'Catálogos de marcas, modelos, colores, etc.',  '/garage/catalogs',            'list',               11, FALSE, 'activo'),
        -- Configuración del taller
        (mod_id, 'garage_settings',          'Configuración Taller',      'Configuración general del módulo taller',      '/garage/settings',            'settings',           12, FALSE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        route       = EXCLUDED.route,
        tab_order   = EXCLUDED.tab_order,
        status      = EXCLUDED.status;
END $$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN B — TABLAS TENANT (reemplazar {schema_name})
-- ─────────────────────────────────────────────────────────────

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

-- ─── CLIENTES ─────────────────────────────────────────────────
-- La tabla customers ya se crea completa desde tenant_schema.sql.
-- Este bloque es idempotente: no hace nada si la tabla ya existe.

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
    status            VARCHAR(30) DEFAULT 'active',
    created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_status ON {schema_name}.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email  ON {schema_name}.customers(email);

-- ─── VEHÍCULOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.vehicles (
    id                   SERIAL PRIMARY KEY,
    customer_id          INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE CASCADE,
    vehicle_type_id      INTEGER      REFERENCES {schema_name}.vehicle_types(id)        ON DELETE SET NULL,
    body_type_id         INTEGER      REFERENCES {schema_name}.vehicle_body_types(id)   ON DELETE SET NULL,
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

-- Unique index on plate only when plate is not empty
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
    stage          VARCHAR(30)  DEFAULT 'entry',  -- 'entry' | 'delivery'
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

-- ─── TARIFAS DE MANO DE OBRA ─────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.employee_labor_rates (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER      NOT NULL REFERENCES {schema_name}.employees(id) ON DELETE CASCADE,
    rate_name   VARCHAR(120) NOT NULL,
    hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency    VARCHAR(10)  DEFAULT 'CLP',
    valid_from  DATE         DEFAULT CURRENT_DATE,
    valid_to    DATE,
    status      VARCHAR(30)  DEFAULT 'active',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labor_rates_employee ON {schema_name}.employee_labor_rates(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_rates_status   ON {schema_name}.employee_labor_rates(status);

-- ─── PRODUCTOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(80),
    name            VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(180) NOT NULL,
    description     TEXT,
    product_type    VARCHAR(50)  DEFAULT 'consumable',
    unit            VARCHAR(30)  DEFAULT 'unidad',
    reference_price NUMERIC(12,2) DEFAULT 0,
    currency        VARCHAR(10)  DEFAULT 'CLP',
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON {schema_name}.products(status);

-- ─── SERVICIOS CONFIGURABLES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.service_templates (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    normalized_name     VARCHAR(180) NOT NULL UNIQUE,
    description         TEXT,
    estimated_hours     NUMERIC(8,2) DEFAULT 0,
    suggested_role      VARCHAR(120),
    suggested_specialty VARCHAR(150),
    base_labor_rate     NUMERIC(12,2),
    currency            VARCHAR(10)  DEFAULT 'CLP',
    status              VARCHAR(30)  DEFAULT 'active',
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS {schema_name}.service_template_products (
    id                  SERIAL PRIMARY KEY,
    service_template_id INTEGER      NOT NULL REFERENCES {schema_name}.service_templates(id) ON DELETE CASCADE,
    product_id          INTEGER      NOT NULL REFERENCES {schema_name}.products(id),
    quantity            NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit                VARCHAR(30),
    reference_unit_price NUMERIC(12,2) DEFAULT 0,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stp_template ON {schema_name}.service_template_products(service_template_id);
CREATE INDEX IF NOT EXISTS idx_stp_product  ON {schema_name}.service_template_products(product_id);

-- ─── CITAS / AGENDA ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS {schema_name}.appointments (
    id                        SERIAL PRIMARY KEY,
    appointment_number        VARCHAR(50)  NOT NULL UNIQUE,

    customer_id               INTEGER      REFERENCES {schema_name}.customers(id) ON DELETE SET NULL,
    vehicle_id                INTEGER      REFERENCES {schema_name}.vehicles(id)  ON DELETE SET NULL,

    scheduled_start           TIMESTAMP    NOT NULL,
    scheduled_end             TIMESTAMP,
    estimated_duration_hours  NUMERIC(8,2) DEFAULT 0,

    status                    VARCHAR(40)  DEFAULT 'scheduled',
    channel                   VARCHAR(50),

    requested_service_summary TEXT,
    reported_issue            TEXT,
    preliminary_notes         TEXT,
    internal_notes            TEXT,

    priority                  VARCHAR(30)  DEFAULT 'normal',

    suggested_employee_id     INTEGER      REFERENCES {schema_name}.employees(id) ON DELETE SET NULL,
    reception_user_id         INTEGER,

    converted_work_order_id   INTEGER,     -- FK a work_orders se agrega después
    converted_at              TIMESTAMP,

    created_by                INTEGER,
    created_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_status      ON {schema_name}.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer    ON {schema_name}.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle     ON {schema_name}.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled   ON {schema_name}.appointments(scheduled_start);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_services (
    id                       SERIAL PRIMARY KEY,
    appointment_id           INTEGER      NOT NULL REFERENCES {schema_name}.appointments(id) ON DELETE CASCADE,
    service_template_id      INTEGER      REFERENCES {schema_name}.service_templates(id) ON DELETE SET NULL,
    service_name             VARCHAR(150) NOT NULL,
    description              TEXT,
    estimated_hours          NUMERIC(8,2) DEFAULT 0,
    suggested_employee_id    INTEGER      REFERENCES {schema_name}.employees(id) ON DELETE SET NULL,
    estimated_labor_total    NUMERIC(12,2) DEFAULT 0,
    estimated_products_total NUMERIC(12,2) DEFAULT 0,
    estimated_service_total  NUMERIC(12,2) DEFAULT 0,
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_services_appt ON {schema_name}.appointment_services(appointment_id);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_service_products (
    id                     SERIAL PRIMARY KEY,
    appointment_service_id INTEGER      NOT NULL REFERENCES {schema_name}.appointment_services(id) ON DELETE CASCADE,
    product_id             INTEGER      REFERENCES {schema_name}.products(id) ON DELETE SET NULL,
    product_name           VARCHAR(150) NOT NULL,
    quantity               NUMERIC(12,2) DEFAULT 1,
    unit                   VARCHAR(30),
    estimated_unit_price   NUMERIC(12,2) DEFAULT 0,
    estimated_total_price  NUMERIC(12,2) DEFAULT 0,
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asp_service ON {schema_name}.appointment_service_products(appointment_service_id);

CREATE TABLE IF NOT EXISTS {schema_name}.appointment_status_history (
    id               SERIAL PRIMARY KEY,
    appointment_id   INTEGER      NOT NULL REFERENCES {schema_name}.appointments(id) ON DELETE CASCADE,
    previous_status  VARCHAR(40),
    new_status       VARCHAR(40)  NOT NULL,
    changed_by       INTEGER,
    notes            TEXT,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
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

    assigned_employee_id     INTEGER       REFERENCES {schema_name}.employees(id) ON DELETE SET NULL,
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

-- Agregar FK de appointments.converted_work_order_id ahora que work_orders existe
ALTER TABLE {schema_name}.appointments
    ADD CONSTRAINT IF NOT EXISTS fk_appt_converted_work_order
    FOREIGN KEY (converted_work_order_id)
    REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;

-- Agregar FK de vehicle_photos.work_order_id ahora que work_orders existe
ALTER TABLE {schema_name}.vehicle_photos
    ADD CONSTRAINT IF NOT EXISTS fk_vehicle_photos_work_order
    FOREIGN KEY (work_order_id)
    REFERENCES {schema_name}.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_work_order ON {schema_name}.vehicle_photos(work_order_id);

CREATE TABLE IF NOT EXISTS {schema_name}.work_order_services (
    id                   SERIAL PRIMARY KEY,
    work_order_id        INTEGER       NOT NULL REFERENCES {schema_name}.work_orders(id) ON DELETE CASCADE,
    service_template_id  INTEGER       REFERENCES {schema_name}.service_templates(id) ON DELETE SET NULL,
    assigned_employee_id INTEGER       REFERENCES {schema_name}.employees(id) ON DELETE SET NULL,

    service_name         VARCHAR(150)  NOT NULL,
    description          TEXT,
    status               VARCHAR(40)   DEFAULT 'pending',

    estimated_hours      NUMERIC(8,2)  DEFAULT 0,
    actual_hours         NUMERIC(8,2)  DEFAULT 0,
    hourly_rate          NUMERIC(12,2) DEFAULT 0,  -- snapshot de la tarifa al momento de asignar

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
    product_name          VARCHAR(150)  NOT NULL,   -- snapshot del nombre al momento de agregar
    quantity              NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit                  VARCHAR(30),
    unit_price            NUMERIC(12,2) DEFAULT 0,  -- snapshot del precio al momento de agregar
    total_price           NUMERIC(12,2) DEFAULT 0,  -- quantity * unit_price
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

-- ─────────────────────────────────────────────────────────────
-- SEEDS INICIALES (catálogos comunes — opcionales)
-- Descomentar para poblar los catálogos al instalar el Core
-- ─────────────────────────────────────────────────────────────

/*
INSERT INTO {schema_name}.vehicle_types (name, normalized_name) VALUES
    ('Auto',       'auto'),
    ('Moto',       'moto'),
    ('Camioneta',  'camioneta'),
    ('Camión',     'camion'),
    ('Furgón',     'furgon'),
    ('Bicicleta',  'bicicleta'),
    ('Maquinaria', 'maquinaria'),
    ('Otro',       'otro')
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO {schema_name}.vehicle_body_types (name, normalized_name) VALUES
    ('Sedán',      'sedan'),
    ('Hatchback',  'hatchback'),
    ('SUV',        'suv'),
    ('Pickup',     'pickup'),
    ('Deportivo',  'deportivo'),
    ('Minivan',    'minivan'),
    ('Station Wagon', 'station wagon'),
    ('Coupé',      'coupe'),
    ('Convertible','convertible'),
    ('Otro',       'otro')
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO {schema_name}.vehicle_transmissions (name, normalized_name) VALUES
    ('Manual',     'manual'),
    ('Automática', 'automatica'),
    ('CVT',        'cvt'),
    ('Semiautomática', 'semiautomatica'),
    ('Doble embrague', 'doble embrague')
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO {schema_name}.vehicle_fuel_types (name, normalized_name) VALUES
    ('Gasolina',   'gasolina'),
    ('Diésel',     'diesel'),
    ('Gas LP',     'gas lp'),
    ('Gas Natural','gas natural'),
    ('Eléctrico',  'electrico'),
    ('Híbrido',    'hibrido'),
    ('Hidrógeno',  'hidrogeno')
ON CONFLICT (normalized_name) DO NOTHING;
*/

-- ─────────────────────────────────────────────────────────────
-- PERMISOS AL USUARIO DE APLICACIÓN
-- ─────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA public
    TO hernanci_nexoragarage;

GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public
    TO hernanci_nexoragarage;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (descomentar para revisar)
-- ─────────────────────────────────────────────────────────────
-- SELECT code, name, category, version FROM public.module_catalog WHERE code = 'garage_operations';
-- SELECT code, name, route FROM public.module_transactions mt
--   JOIN public.module_catalog mc ON mt.module_id = mc.id
--   WHERE mc.code = 'garage_operations' ORDER BY tab_order;
