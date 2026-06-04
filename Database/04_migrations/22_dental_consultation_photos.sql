-- Migration 22: dental_consultation_photos
-- Creates the photo storage table for consultation before/after images.

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN
        SELECT s.nspname
        FROM pg_namespace s
        INNER JOIN public.companies c ON c.schema_name = s.nspname
        WHERE c.is_active = TRUE
    LOOP
        EXECUTE format($sql$
            CREATE TABLE IF NOT EXISTS %I.dental_consultation_photos (
                id              SERIAL PRIMARY KEY,
                tenant_id       INTEGER      NOT NULL,
                consultation_id INTEGER      NOT NULL REFERENCES %I.dental_consultations(id) ON DELETE CASCADE,
                photo_url       TEXT         NOT NULL,
                stage           VARCHAR(20)  NOT NULL DEFAULT 'before',
                caption         TEXT,
                sort_order      INTEGER      DEFAULT 0,
                uploaded_by     INTEGER,
                created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_dental_photo_stage CHECK (stage IN ('before', 'after'))
            )
        $sql$, schema_name, schema_name);

        EXECUTE format($sql$
            CREATE INDEX IF NOT EXISTS idx_dental_consultation_photos_consultation
                ON %I.dental_consultation_photos(consultation_id)
        $sql$, schema_name);
    END LOOP;
END $$;
