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
    IF to_regclass(format('%I.dental_patient_profiles', r.schema_name)) IS NULL THEN
      RAISE NOTICE 'Skipping %.dental_patient_profiles: table does not exist', r.schema_name;
      CONTINUE;
    END IF;

    EXECUTE format($s$
      ALTER TABLE %I.dental_patient_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT
    $s$, r.schema_name);
  END LOOP;
END $$;
