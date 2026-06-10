-- 36_dental_patient_photo.sql
-- Adds photo_url column to dental_patient_profiles for every existing tenant schema.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name
    FROM public.companies
    WHERE schema_name IS NOT NULL
      AND schema_name != 'public'
  LOOP
    EXECUTE format($s$
      ALTER TABLE %I.dental_patient_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT
    $s$, r.schema_name);
  END LOOP;
END $$;
