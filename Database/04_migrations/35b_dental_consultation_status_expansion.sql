-- Migration 35b: dental_consultation_status_expansion
-- Phase 1 of Dental Module Overhaul v2 — State Machine Expansion.
-- Drops the old status CHECK constraint on dental_consultations,
-- migrates existing data to new status values, and adds the new constraint.
--
-- New valid states:
--   borrador | creada | en_evaluacion | cotizada | propuesta_pendiente
--   aceptada | en_tratamiento | sesion_pendiente | finalizada_clinicamente
--   pendiente_pago | cerrada | rechazada | cancelled | no_show | voided
--
-- PostgreSQL 10.23 multi-tenant. Idempotent (safe to run twice).
-- Run manually via phpPgAdmin. Requires migration 35 to be applied first.
-- Date: 2026-06-10

DO $$
DECLARE
    r        RECORD;
    con_name TEXT;
BEGIN
    FOR r IN
        SELECT schema_name
        FROM public.companies
        WHERE schema_name IS NOT NULL
          AND schema_name != 'public'
    LOOP

        -- ── 1. Migrate data: map old English status values to new Spanish values ──

        -- Only run data migration if old values still exist (idempotency guard)
        EXECUTE format($s$
            UPDATE %I.dental_consultations
            SET status = CASE status
                WHEN 'draft'        THEN 'borrador'
                WHEN 'created'      THEN 'creada'
                WHEN 'in_progress'  THEN 'en_evaluacion'
                WHEN 'in_treatment' THEN 'en_tratamiento'
                WHEN 'completed'    THEN 'finalizada_clinicamente'
                -- These three are kept as-is (valid in new constraint)
                WHEN 'cancelled'    THEN 'cancelled'
                WHEN 'no_show'      THEN 'no_show'
                WHEN 'voided'       THEN 'voided'
                -- Any unknown value → safe default
                ELSE 'creada'
            END
            WHERE status NOT IN (
                'borrador', 'creada', 'en_evaluacion', 'cotizada',
                'propuesta_pendiente', 'aceptada', 'en_tratamiento',
                'sesion_pendiente', 'finalizada_clinicamente', 'pendiente_pago',
                'cerrada', 'rechazada', 'cancelled', 'no_show', 'voided'
            )
        $s$, r.schema_name);

        -- ── 2. Drop old CHECK constraint (find by name pattern) ──

        con_name := NULL;

        EXECUTE format($s$
            DO $inner$
            DECLARE cname TEXT;
            BEGIN
                SELECT constraint_name INTO cname
                FROM information_schema.table_constraints
                WHERE table_schema = %L
                  AND table_name = 'dental_consultations'
                  AND constraint_type = 'CHECK'
                  AND constraint_name LIKE '%%status%%'
                LIMIT 1;

                IF cname IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE ' || quote_ident(%L) || '.dental_consultations DROP CONSTRAINT ' || quote_ident(cname);
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

        -- ── 3. Add new CHECK constraint (idempotent — only if not already present) ──

        EXECUTE format($s$
            DO $inner$
            DECLARE cname TEXT;
            BEGIN
                SELECT constraint_name INTO cname
                FROM information_schema.table_constraints
                WHERE table_schema = %L
                  AND table_name = 'dental_consultations'
                  AND constraint_type = 'CHECK'
                  AND constraint_name LIKE '%%status%%'
                LIMIT 1;

                IF cname IS NULL THEN
                    ALTER TABLE %I.dental_consultations
                    ADD CONSTRAINT dental_consultations_status_check
                    CHECK (status IN (
                        'borrador', 'creada', 'en_evaluacion', 'cotizada',
                        'propuesta_pendiente', 'aceptada', 'en_tratamiento',
                        'sesion_pendiente', 'finalizada_clinicamente', 'pendiente_pago',
                        'cerrada', 'rechazada', 'cancelled', 'no_show', 'voided'
                    ));
                END IF;
            END
            $inner$
        $s$, r.schema_name, r.schema_name);

    END LOOP;
END $$;
