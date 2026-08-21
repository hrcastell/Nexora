-- ============================================================================
-- Migration 12: Centro de Notificaciones
-- Crea las tablas public.notifications y public.notification_preferences
-- Agrega transacciones al módulo 'configuration' para las vistas de notificaciones
-- ============================================================================

-- ── 1. Tabla de notificaciones ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    company_id      INTEGER REFERENCES public.companies(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('info','success','warning','error')),
    category        TEXT NOT NULL CHECK (category IN ('system','users','subscriptions','requests','billing','modules','dental')),
    title           TEXT NOT NULL,
    body            TEXT,
    action_url      TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    is_dismissed    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_company_created
    ON public.notifications(company_id, created_at DESC);

-- ── 2. Tabla de preferencias por usuario ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id     INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    categories  JSONB DEFAULT '{"system":true,"users":true,"subscriptions":true,"requests":true,"billing":true,"modules":true,"dental":true}',
    show_toast  BOOLEAN DEFAULT TRUE,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Transacciones para el módulo 'configuration' ──────────────────────────
-- Obtener el ID del módulo configuration
DO $$
DECLARE
    v_module_id INTEGER;
BEGIN
    SELECT id INTO v_module_id
    FROM public.module_catalog
    WHERE code = 'configuration'
    LIMIT 1;

    IF v_module_id IS NOT NULL THEN

        -- Transacción: centro de notificaciones
        INSERT INTO public.module_transactions
            (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
        VALUES
            (v_module_id, 'notifications', 'Notificaciones', 'Centro de notificaciones del sistema',
             '/admin/notifications', 'Bell', 900, TRUE, 'activo')
        ON CONFLICT (module_id, code) DO NOTHING;

        -- Transacción: configuración de preferencias de notificaciones
        INSERT INTO public.module_transactions
            (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
        VALUES
            (v_module_id, 'notification_settings', 'Preferencias de notificaciones', 'Configurar preferencias de notificaciones',
             '/admin/notifications/settings', 'Settings', 910, FALSE, 'activo')
        ON CONFLICT (module_id, code) DO NOTHING;

    END IF;
END $$;

-- ── 4. Permisos de perfil para las nuevas transacciones ──────────────────────
-- (Opcional: asignar can_view a perfiles existentes si se requiere)
-- Se omite por ahora; el super_admin tiene acceso sin restricciones.
