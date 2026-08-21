-- =============================================================
-- MIGRATION: 20_dental_core_module.sql
-- Core 3 — Dental Core
--
-- Registra el módulo dental_core en el catálogo global y
-- crea todas las tablas del módulo en el schema del tenant.
--
-- ESQUEMA DE EJECUCIÓN:
--   Este archivo tiene DOS secciones:
--
--   SECCIÓN A — Ejecutar UNA SOLA VEZ en schema public:
--     Registra módulo + transacciones en module_catalog / module_transactions
--
--   SECCIÓN B — Ejecutar por cada tenant (reemplazar {schema_name}):
--     Crea las tablas del módulo en el schema del tenant
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
    ('dental_core', 'Dental Core', 'Módulo odontológico integral',
     'tooth', 'Dental', FALSE, TRUE, FALSE, TRUE, 30, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    version     = EXCLUDED.version,
    status      = EXCLUDED.status;

-- A.2 Registrar transacciones del módulo
DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id FROM public.module_catalog WHERE code = 'dental_core';

    INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'dental_dashboard',             'Dashboard',               'Panel principal del módulo dental',           '/dental',                              'chart-bar',      1,  TRUE,  'activo'),
        (mod_id, 'dental_patients',              'Pacientes',               'Gestión de pacientes odontológicos',          '/dental/patients',                     'users',          2,  TRUE,  'activo'),
        (mod_id, 'dental_consultations',         'Consultas',               'Registro y gestión de consultas clínicas',    '/dental/consultations',                'clipboard',      3,  TRUE,  'activo'),
        (mod_id, 'dental_appointments',          'Agenda',                  'Gestión de turnos y agenda',                  '/dental/appointments',                 'calendar',       4,  TRUE,  'activo'),
        (mod_id, 'dental_finance',               'Finanzas',                'Cobros, pagos y cuotas de pacientes',         '/dental/finance',                      'wallet',         5,  TRUE,  'activo'),
        (mod_id, 'dental_treatments',            'Tratamientos',            'Configuración de tratamientos disponibles',   '/dental/config/treatments',            'tooth',          6,  FALSE, 'activo'),
        (mod_id, 'dental_services',              'Servicios',               'Configuración de servicios y precios',        '/dental/config/services',              'tag',            7,  FALSE, 'activo'),
        (mod_id, 'dental_patient_detail',        'Detalle de Paciente',     'Vista de detalle de un paciente',             '/dental/patients/:patientId',          'user',           10, FALSE, 'activo'),
        (mod_id, 'dental_consultation_detail',   'Detalle de Consulta',     'Vista de detalle de una consulta',            '/dental/consultations/:consultationId','clipboard-list', 11, FALSE, 'activo'),
        (mod_id, 'dental_appointment_detail',    'Detalle de Turno',        'Vista de detalle de un turno',                '/dental/appointments/:appointmentId',  'calendar-check', 12, FALSE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        route       = EXCLUDED.route,
        tab_order   = EXCLUDED.tab_order,
        status      = EXCLUDED.status;
END $$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN B — TABLAS DEL TENANT (reemplazar {schema_name})
-- ─────────────────────────────────────────────────────────────

-- B.1 Perfil médico del paciente (extiende customers)
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
    created_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dental_patient_profile UNIQUE (tenant_id, customer_id)
);

-- B.2 Catálogo de tratamientos
CREATE TABLE IF NOT EXISTS {schema_name}.dental_treatments (
    id                          SERIAL PRIMARY KEY,
    tenant_id                   INTEGER      NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    description                 TEXT,
    category                    VARCHAR(120),
    estimated_duration_minutes  INTEGER,
    requires_follow_up          BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_multiple_sessions  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active                   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- B.3 Catálogo de servicios
CREATE TABLE IF NOT EXISTS {schema_name}.dental_services (
    id                          SERIAL PRIMARY KEY,
    tenant_id                   INTEGER      NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    description                 TEXT,
    price_mode                  VARCHAR(20)   NOT NULL DEFAULT 'manual',
    supplies_cost               NUMERIC(12,2) NOT NULL DEFAULT 0,
    labor_cost                  NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate                    NUMERIC(8,4)  NOT NULL DEFAULT 0,
    profit_margin               NUMERIC(8,4)  NOT NULL DEFAULT 0,
    manual_price                NUMERIC(12,2),
    final_price                 NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_duration_minutes  INTEGER,
    is_active                   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_services_price_mode CHECK (price_mode IN ('manual', 'calculated'))
);

-- B.4 Tratamientos que componen un servicio (join table)
CREATE TABLE IF NOT EXISTS {schema_name}.dental_service_treatments (
    id            SERIAL PRIMARY KEY,
    tenant_id     INTEGER  NOT NULL,
    service_id    INTEGER  NOT NULL REFERENCES {schema_name}.dental_services(id)   ON DELETE CASCADE,
    treatment_id  INTEGER  NOT NULL REFERENCES {schema_name}.dental_treatments(id) ON DELETE CASCADE,
    quantity      INTEGER  NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dental_service_treatment UNIQUE (tenant_id, service_id, treatment_id)
);

-- B.5 Turnos / agenda
CREATE TABLE IF NOT EXISTS {schema_name}.dental_appointments (
    id                      SERIAL PRIMARY KEY,
    tenant_id               INTEGER      NOT NULL,
    customer_id             INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    service_id              INTEGER      REFERENCES {schema_name}.dental_services(id) ON DELETE SET NULL,
    scheduled_start         TIMESTAMP    NOT NULL,
    scheduled_end           TIMESTAMP    NOT NULL,
    status                  VARCHAR(30)  NOT NULL DEFAULT 'scheduled',
    reason                  TEXT,
    notes                   TEXT,
    reminder_email_sent_at  TIMESTAMP,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_appointment_status CHECK (status IN (
        'scheduled', 'confirmed', 'checked_in', 'completed',
        'cancelled', 'no_show', 'rescheduled'
    ))
);

-- B.6 Consultas clínicas
CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultations (
    id                      SERIAL PRIMARY KEY,
    tenant_id               INTEGER      NOT NULL,
    customer_id             INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    appointment_id          INTEGER      REFERENCES {schema_name}.dental_appointments(id) ON DELETE SET NULL,
    service_id              INTEGER      REFERENCES {schema_name}.dental_services(id) ON DELETE SET NULL,
    consultation_date       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status                  VARCHAR(30)  NOT NULL DEFAULT 'draft',
    administrative_status   VARCHAR(30)  NOT NULL DEFAULT 'unpaid',
    reason                  TEXT,
    diagnosis               TEXT,
    clinical_notes          TEXT,
    indications             TEXT,
    total_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dental_consultation_status CHECK (status IN (
        'draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
    )),
    CONSTRAINT chk_dental_consultation_admin_status CHECK (administrative_status IN (
        'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'
    ))
);

-- B.7 Tratamientos realizados en una consulta (join table)
CREATE TABLE IF NOT EXISTS {schema_name}.dental_consultation_treatments (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER  NOT NULL,
    consultation_id INTEGER  NOT NULL REFERENCES {schema_name}.dental_consultations(id) ON DELETE CASCADE,
    treatment_id    INTEGER  NOT NULL REFERENCES {schema_name}.dental_treatments(id) ON DELETE RESTRICT,
    service_id      INTEGER  REFERENCES {schema_name}.dental_services(id) ON DELETE SET NULL,
    quantity        INTEGER  NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B.8 Historia clínica
CREATE TABLE IF NOT EXISTS {schema_name}.dental_clinical_history_entries (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL,
    customer_id     INTEGER      NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    consultation_id INTEGER      REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
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

-- B.9 Cargos (deuda del paciente)
CREATE TABLE IF NOT EXISTS {schema_name}.dental_charges (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER       NOT NULL,
    customer_id     INTEGER       NOT NULL REFERENCES {schema_name}.customers(id) ON DELETE RESTRICT,
    consultation_id INTEGER       REFERENCES {schema_name}.dental_consultations(id) ON DELETE SET NULL,
    service_id      INTEGER       REFERENCES {schema_name}.dental_services(id) ON DELETE SET NULL,
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

-- B.10 Pagos recibidos
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
    CONSTRAINT chk_dental_payment_amount         CHECK (amount > 0),
    CONSTRAINT chk_dental_payment_method CHECK (payment_method IN (
        'cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance', 'other'
    ))
);

-- B.11 Cuotas de pago
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

-- B.12 Notificaciones
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

-- B.13 Índices
CREATE INDEX IF NOT EXISTS idx_dental_profiles_tenant_customer      ON {schema_name}.dental_patient_profiles(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_treatments_tenant             ON {schema_name}.dental_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dental_services_tenant               ON {schema_name}.dental_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_tenant_date      ON {schema_name}.dental_appointments(tenant_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_tenant_customer  ON {schema_name}.dental_appointments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_consultations_tenant_customer ON {schema_name}.dental_consultations(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_consultations_tenant_date     ON {schema_name}.dental_consultations(tenant_id, consultation_date);
CREATE INDEX IF NOT EXISTS idx_dental_charges_tenant_customer       ON {schema_name}.dental_charges(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_dental_charges_tenant_status         ON {schema_name}.dental_charges(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dental_payments_tenant_date          ON {schema_name}.dental_payments(tenant_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_dental_installments_tenant_status_due ON {schema_name}.dental_installments(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_dental_history_tenant_customer       ON {schema_name}.dental_clinical_history_entries(tenant_id, customer_id);
