-- Migration 08: Add visual_config column to public.users
-- Allows per-user visual config persistence in the DB.
-- Safe to run multiple times (IF NOT EXISTS / column check).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'visual_config'
  ) THEN
    ALTER TABLE public.users ADD COLUMN visual_config JSONB;
  END IF;
END
$$;
