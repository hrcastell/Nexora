-- =============================================================
-- MIGRATION: 62_auth_login_lockout.sql
-- Adds a per-account failed-login counter and timed lockout to
-- public.users so /api/auth/login can reject brute-force attempts.
-- SEGURO: solo ADD COLUMN IF NOT EXISTS
-- =============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until           TIMESTAMP WITH TIME ZONE;
