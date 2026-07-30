-- ============================================================
-- Migración 06: profile_transaction_permissions
-- Permisos CRUD por transacción a nivel de perfil (tenant-local)
-- ============================================================

-- Esta tabla reemplaza a profile_permissions como unidad de control.
-- Cada fila representa: perfil X puede hacer acciones Y en la transacción Z.
-- La transacción se referencia por su code (public.module_transactions.code)
-- para evitar FK cross-schema, ya que el catálogo está en public.

DO $$
DECLARE
    r RECORD;
    tbl TEXT;
BEGIN
    FOR r IN
        SELECT schema_name
        FROM public.companies
        WHERE schema_name IS NOT NULL
        ORDER BY schema_name
    LOOP
        tbl := format('"%s".profile_transaction_permissions', r.schema_name);

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %s (
                id               SERIAL PRIMARY KEY,
                profile_id       INT  NOT NULL,
                transaction_code VARCHAR(80) NOT NULL,
                can_view         BOOLEAN NOT NULL DEFAULT FALSE,
                can_create       BOOLEAN NOT NULL DEFAULT FALSE,
                can_edit         BOOLEAN NOT NULL DEFAULT FALSE,
                can_delete       BOOLEAN NOT NULL DEFAULT FALSE,
                can_approve      BOOLEAN NOT NULL DEFAULT FALSE,
                can_export       BOOLEAN NOT NULL DEFAULT FALSE,
                can_admin        BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_ptp_profile_tx UNIQUE (profile_id, transaction_code),
                CONSTRAINT fk_ptp_profile FOREIGN KEY (profile_id)
                    REFERENCES "%s".profiles(id) ON DELETE CASCADE
            );
        ', tbl, r.schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_ptp_profile_id
                ON %s (profile_id);
        ', tbl);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_ptp_tx_code
                ON %s (transaction_code);
        ', tbl);

        RAISE NOTICE 'profile_transaction_permissions creada/verificada en schema: %', r.schema_name;
    END LOOP;
END;
$$;

-- Grant al rol de la app (ajustar nexora_app si el nombre es diferente)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schema_name FROM public.companies
        WHERE schema_name IS NOT NULL
    LOOP
        BEGIN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON "%s".profile_transaction_permissions TO hernanci_nexoragarage',
                r.schema_name
            );
            EXECUTE format(
                'GRANT USAGE, SELECT ON SEQUENCE "%s".profile_transaction_permissions_id_seq TO hernanci_nexoragarage',
                r.schema_name
            );
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Grant omitido para schema %: %', r.schema_name, SQLERRM;
        END;
    END LOOP;
END;
$$;
