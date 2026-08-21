-- =============================================================
-- MIGRATION: 67_appointment_settings.sql
-- Per-module appointment capacity/business-hours config, one row
-- per module_code ('garage_operations' | 'dental_core'). Backs the
-- new "Configuración" tab on both modules' Agenda screens.
--
-- Idempotent; safe to re-paste via phpPgAdmin.
-- PostgreSQL 10.23 compatible.
-- =============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name FROM public.companies
    WHERE schema_name IS NOT NULL AND schema_name != 'public'
  LOOP

    EXECUTE format($s$
      CREATE TABLE IF NOT EXISTS %I.appointment_settings (
        id                         SERIAL PRIMARY KEY,
        module_code                VARCHAR(50)   NOT NULL UNIQUE,
        max_appointments_per_day   INTEGER,
        business_hours_start       TIME          NOT NULL DEFAULT '08:00',
        business_hours_end         TIME          NOT NULL DEFAULT '20:00',
        updated_at                 TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      )
    $s$, r.schema_name);

  END LOOP;
END $$;
