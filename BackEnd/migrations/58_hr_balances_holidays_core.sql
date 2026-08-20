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
