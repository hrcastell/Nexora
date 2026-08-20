-- MIGRATION: 58b_hr_backfill_employee_balances.sql
-- Per tenant after 58. Replace {schema_name}.
INSERT INTO {schema_name}.hr_leave_balances (employee_id,balance_code,unit,base_entitlement,accrual_enabled)
SELECT e.id,v.balance_code,v.unit,0,FALSE FROM {schema_name}.employees e CROSS JOIN (VALUES ('vacation_days','days'),('permission_hours','hours')) v(balance_code,unit)
ON CONFLICT(employee_id,balance_code) DO NOTHING;
