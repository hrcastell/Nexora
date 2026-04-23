-- ============================================================
-- Migration 09: subscription_plans
-- Crea la tabla global de planes de suscripción y la vincula
-- a public.companies mediante FK. Seed de 3 planes por defecto.
-- Agrega entrada de menú para la vista de suscripciones.
-- Seguro para re-ejecución (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(50)    NOT NULL UNIQUE,
    name                VARCHAR(100)   NOT NULL,
    description         TEXT,
    amount              DECIMAL(10,2)  NOT NULL DEFAULT 0,
    currency            VARCHAR(3)     DEFAULT 'CLP',
    payment_frequency   VARCHAR(20)    DEFAULT 'monthly',
    due_day             INTEGER        DEFAULT 1
                            CONSTRAINT chk_sp_due_day CHECK (due_day BETWEEN 1 AND 28),
    grace_period_days   INTEGER        DEFAULT 5,
    discount            DECIMAL(5,2)   DEFAULT 0,
    is_active           BOOLEAN        DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_code
    ON public.subscription_plans(code);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
    ON public.subscription_plans(is_active);

-- Seed planes por defecto
INSERT INTO public.subscription_plans (code, name, description, amount, currency, payment_frequency, due_day, grace_period_days, discount, is_active)
VALUES
  ('basic',      'Básico',     'Plan básico de acceso al sistema',                0, 'CLP', 'monthly', 1, 5, 0, TRUE),
  ('pro',        'Pro',        'Plan profesional con funcionalidades avanzadas',  0, 'CLP', 'monthly', 1, 5, 0, TRUE),
  ('enterprise', 'Enterprise', 'Plan empresarial con soporte prioritario',        0, 'CLP', 'monthly', 1, 5, 0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Agregar columna subscription_plan_id a companies (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'companies'
      AND column_name  = 'subscription_plan_id'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN subscription_plan_id INTEGER
          REFERENCES public.subscription_plans(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_companies_subscription_plan
    ON public.companies(subscription_plan_id);

-- Backfill: vincular empresas existentes al plan correspondiente
UPDATE public.companies c
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE c.plan_type = sp.code
  AND c.subscription_plan_id IS NULL;

-- Agregar entrada de menú para la vista de suscripciones
INSERT INTO public.module_transactions (module_id, code, name, route, icon, tab_order, menu_visible, status)
SELECT mc.id, 'subscriptions', 'Planes de Suscripción', '/admin/subscriptions', 'FileText', 8, TRUE, 'activo'
FROM public.module_catalog mc
WHERE mc.code = 'configuration'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_transactions WHERE code = 'subscriptions'
  );
