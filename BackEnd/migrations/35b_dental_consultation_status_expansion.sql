-- Migration 35b: dental_consultation_status_expansion
-- Phase 1 of Dental Module Overhaul v2 — State Machine Expansion.
--
-- Replaces only the CHECK constraints that depend on dental_consultations.status,
-- migrates existing values to the new state machine, aligns the column default
-- with the current tenant template, and keeps administrative_status untouched.
--
-- PostgreSQL 10.23 multi-tenant. Idempotent (safe to run multiple times).
-- Run manually via phpPgAdmin. Requires migration 35 to be applied first.
-- Date: 2026-06-10

DO $$
DECLARE
    r   RECORD;
    con RECORD;
BEGIN
    FOR r IN
        SELECT schema_name
        FROM public.companies
        WHERE schema_name IS NOT NULL
          AND schema_name != 'public'
    LOOP
        IF to_regclass(format('%I.dental_consultations', r.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping %.dental_consultations: table does not exist', r.schema_name;
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = r.schema_name
              AND table_name   = 'dental_consultations'
              AND column_name  = 'status'
        ) THEN
            RAISE NOTICE 'Skipping %.dental_consultations: status column does not exist', r.schema_name;
            CONTINUE;
        END IF;

        -- Drop every CHECK constraint that actually depends on the status column.
        -- Do NOT match by name: chk_dental_consultation_admin_status must survive.
        FOR con IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t
              ON t.oid = c.conrelid
            JOIN pg_namespace n
              ON n.oid = t.relnamespace
            JOIN unnest(c.conkey) AS ck(attnum)
              ON TRUE
            JOIN pg_attribute a
              ON a.attrelid = t.oid
             AND a.attnum   = ck.attnum
            WHERE n.nspname = r.schema_name
              AND t.relname = 'dental_consultations'
              AND c.contype = 'c'
              AND a.attname = 'status'
        LOOP
            EXECUTE format(
                'ALTER TABLE %I.dental_consultations DROP CONSTRAINT %I',
                r.schema_name,
                con.conname
            );
        END LOOP;

        -- Align the physical column with the planned template.
        EXECUTE format(
            'ALTER TABLE %I.dental_consultations ALTER COLUMN status TYPE VARCHAR(40)',
            r.schema_name
        );

        -- Map legacy values to the new Spanish state machine before re-adding CHECK.
        EXECUTE format($sql$
            UPDATE %I.dental_consultations
            SET status = CASE status
                WHEN 'draft'        THEN 'borrador'
                WHEN 'created'      THEN 'creada'
                WHEN 'in_progress'  THEN 'en_evaluacion'
                WHEN 'in_treatment' THEN 'en_tratamiento'
                WHEN 'completed'    THEN 'finalizada_clinicamente'
                WHEN 'cancelled'    THEN 'cancelled'
                WHEN 'no_show'      THEN 'no_show'
                WHEN 'voided'       THEN 'voided'
                ELSE 'creada'
            END
            WHERE status NOT IN (
                'borrador', 'creada', 'en_evaluacion', 'cotizada',
                'propuesta_pendiente', 'aceptada', 'en_tratamiento',
                'sesion_pendiente', 'finalizada_clinicamente', 'pendiente_pago',
                'cerrada', 'rechazada', 'cancelled', 'no_show', 'voided'
            )
        $sql$, r.schema_name);

        EXECUTE format(
            'ALTER TABLE %I.dental_consultations ALTER COLUMN status SET DEFAULT %L',
            r.schema_name,
            'borrador'
        );

        EXECUTE format($sql$
            ALTER TABLE %I.dental_consultations
            ADD CONSTRAINT chk_dental_consultation_status
            CHECK (status IN (
                'borrador', 'creada', 'en_evaluacion', 'cotizada',
                'propuesta_pendiente', 'aceptada', 'en_tratamiento',
                'sesion_pendiente', 'finalizada_clinicamente', 'pendiente_pago',
                'cerrada', 'rechazada', 'cancelled', 'no_show', 'voided'
            ))
        $sql$, r.schema_name);
    END LOOP;
END $$;
