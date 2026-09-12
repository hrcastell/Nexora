-- =============================================================
-- MIGRATION: 69_appointment_daily_limit_constraint.sql
-- Ensures the optional daily appointment limit is always positive.
-- Idempotent and PostgreSQL 10.23 compatible.
-- =============================================================

DO $$
DECLARE
  company_record RECORD;
  constraint_exists BOOLEAN;
BEGIN
  FOR company_record IN
    SELECT schema_name
    FROM public.companies
    WHERE schema_name IS NOT NULL AND schema_name <> 'public'
  LOOP
    IF to_regclass(format('%I.appointment_settings', company_record.schema_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'UPDATE %I.appointment_settings
       SET max_appointments_per_day = NULL
       WHERE max_appointments_per_day IS NOT NULL
         AND max_appointments_per_day < 1',
      company_record.schema_name
    );

    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
      JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
      WHERE schema_row.nspname = company_record.schema_name
        AND table_row.relname = 'appointment_settings'
        AND constraint_row.conname = 'chk_appointment_settings_daily_limit'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
      EXECUTE format(
        'ALTER TABLE %I.appointment_settings
         ADD CONSTRAINT chk_appointment_settings_daily_limit
         CHECK (max_appointments_per_day IS NULL OR max_appointments_per_day >= 1)',
        company_record.schema_name
      );
    END IF;
  END LOOP;
END $$;
