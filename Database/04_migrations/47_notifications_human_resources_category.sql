-- Migration 47: notifications_human_resources_category
-- Adds the "human_resources" category to the global notification center.
-- PostgreSQL 10.23 compatible.

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN ('system','users','subscriptions','requests','billing','modules','dental','inventory','human_resources'));

ALTER TABLE public.notification_preferences
    ALTER COLUMN categories SET DEFAULT
    '{"system":true,"users":true,"subscriptions":true,"requests":true,"billing":true,"modules":true,"dental":true,"inventory":true,"human_resources":true}'::jsonb;

UPDATE public.notification_preferences
SET categories = COALESCE(categories, '{}'::jsonb) || '{"human_resources":true}'::jsonb,
    updated_at = NOW()
WHERE NOT (COALESCE(categories, '{}'::jsonb) ? 'human_resources');
