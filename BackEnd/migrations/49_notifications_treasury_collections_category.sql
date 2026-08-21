-- Migration 49: notifications_treasury_collections_category
-- Adds the "treasury_collections" category to the global notification center.
-- PostgreSQL 10.23 compatible.

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN ('system','users','subscriptions','requests','billing','modules','dental','inventory','human_resources','treasury_collections'));

ALTER TABLE public.notification_preferences
    ALTER COLUMN categories SET DEFAULT
    '{"system":true,"users":true,"subscriptions":true,"requests":true,"billing":true,"modules":true,"dental":true,"inventory":true,"human_resources":true,"treasury_collections":true}'::jsonb;

UPDATE public.notification_preferences
SET categories = COALESCE(categories, '{}'::jsonb) || '{"treasury_collections":true}'::jsonb,
    updated_at = NOW()
WHERE NOT (COALESCE(categories, '{}'::jsonb) ? 'treasury_collections');
