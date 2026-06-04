-- Migration 31: notifications_dental_category
-- Adds the "dental" category to the global notification center.
-- PostgreSQL 10.23 compatible.

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN ('system','users','subscriptions','requests','billing','modules','dental'));

ALTER TABLE public.notification_preferences
    ALTER COLUMN categories SET DEFAULT
    '{"system":true,"users":true,"subscriptions":true,"requests":true,"billing":true,"modules":true,"dental":true}'::jsonb;

UPDATE public.notification_preferences
SET categories = COALESCE(categories, '{}'::jsonb) || '{"dental":true}'::jsonb,
    updated_at = NOW()
WHERE NOT (COALESCE(categories, '{}'::jsonb) ? 'dental');
