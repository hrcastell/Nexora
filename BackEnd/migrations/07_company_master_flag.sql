-- ============================================================
-- Migración 07: company_master_flag
-- Marca la empresa hernancius como schema maestro inmutable.
-- Este flag protege la empresa del super_admin de borrados,
-- suspensiones o cualquier modificación destructiva desde el backend.
-- ============================================================

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.companies
    SET is_master = TRUE
    WHERE schema_name = 'hernancius';

-- Comentario de intención (no ejecutable, solo documentación)
-- La empresa con is_master = TRUE no puede ser eliminada,
-- suspendida ni bloqueada por ningún endpoint de la API.
-- Esta restricción se aplica a nivel de aplicación (controller).
