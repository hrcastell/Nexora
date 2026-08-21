-- =============================================================
-- MIGRATION: 66_schema_migrations_tracking.sql
-- Tracking table for the automated migration runner
-- (BackEnd/migrations/runner.js). Records which migration number
-- has been applied to which schema ('public' for public-schema-only
-- migrations, a tenant schema name for per-tenant ones), so the
-- runner never re-executes a migration it's already run and can
-- self-heal a schema that's individually missing one.
--
-- This file is created by the runner itself on first boot (it can't
-- depend on tracking to know whether it's been applied); it's kept
-- here too so it's visible in migration history and applies cleanly
-- if ever pasted by hand.
-- SEGURO: solo CREATE TABLE IF NOT EXISTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id                 SERIAL PRIMARY KEY,
    schema_name        VARCHAR(100) NOT NULL,
    migration_number   INTEGER      NOT NULL,
    filename           VARCHAR(255) NOT NULL,
    applied_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_schema_migrations UNIQUE (schema_name, migration_number)
);
