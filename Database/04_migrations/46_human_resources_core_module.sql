-- =============================================================
-- MIGRATION: 46_human_resources_core_module.sql
-- Core 5 — Human Resources
--
-- Section A runs once in public. Section B runs once per tenant
-- after replacing {schema_name} with the target tenant schema.
-- PostgreSQL 10.23 compatible and safe to re-run.
-- =============================================================

-- =============================================================
-- SECTION A — GLOBAL GOVERNANCE (public schema)
-- =============================================================

INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('human_resources', 'Recursos Humanos',
     'Gestión de estructura organizacional, empleados y solicitudes',
     'users', 'Recursos Humanos', FALSE, TRUE, FALSE, TRUE, 50, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    version = EXCLUDED.version,
    status = EXCLUDED.status;

DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id
    FROM public.module_catalog
    WHERE code = 'human_resources';

    INSERT INTO public.module_transactions
        (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'hr_employees', 'Empleados', 'Gestión de empleados', '/hr/employees', 'users', 1, TRUE, 'activo'),
        (mod_id, 'hr_employee_profile', 'Perfil de Empleado', 'Perfil integral de empleado', '/hr/employees/:id', 'user', 2, FALSE, 'activo'),
        (mod_id, 'hr_org_settings', 'Organización', 'Configuración organizacional', '/hr/organization', 'sitemap', 3, TRUE, 'activo'),
        (mod_id, 'hr_requests', 'Solicitudes', 'Solicitudes de empleados', '/hr/requests', 'clipboard-list', 4, TRUE, 'activo'),
        (mod_id, 'hr_request_approvals', 'Aprobaciones RRHH', 'Bandeja de aprobaciones', '/hr/request-approvals', 'check-square', 5, TRUE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        route = EXCLUDED.route,
        tab_order = EXCLUDED.tab_order,
        status = EXCLUDED.status;
END;
$$;

-- =============================================================
-- SECTION B — TENANT TABLES (replace {schema_name})
-- =============================================================

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

ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(30);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS work_email VARCHAR(150);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(150);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS position_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS supervisor_employee_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS work_shift_id INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20);
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS updated_by INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_employment_status' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT chk_employees_employment_status
            CHECK (employment_status IN ('draft', 'active', 'inactive', 'on_leave', 'terminated', 'suspended'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_employment_type' AND conrelid = '{schema_name}.employees'::regclass) THEN
        ALTER TABLE {schema_name}.employees ADD CONSTRAINT chk_employees_employment_type
            CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern', 'temporary'));
    END IF;
END;
$$;

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
