-- =============================================================
-- MIGRATION: 63_auth_password_reset.sql
-- Adds self-service password recovery columns to public.users:
-- a hashed one-time reset token, its expiry, and a last-sent
-- timestamp used to throttle repeated forgot-password requests.
-- SEGURO: solo ADD COLUMN IF NOT EXISTS
-- =============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_reset_token_hash    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_expires        TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS password_reset_last_sent_at   TIMESTAMP WITH TIME ZONE;
