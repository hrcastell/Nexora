-- =============================================================
-- MIGRATION: 18_financial_core_module.sql
-- Core 2 — Financial Core
--
-- Registra el módulo financial_core en el catálogo global y
-- crea todas las tablas del módulo en el schema del tenant.
--
-- ESQUEMA DE EJECUCIÓN:
--   Este archivo tiene DOS secciones:
--
--   SECCIÓN A — Ejecutar UNA SOLA VEZ en schema public:
--     Registra módulo + transacciones en module_catalog / module_transactions
--
--   SECCIÓN B — Ejecutar por cada tenant (reemplazar {schema_name}):
--     Crea las tablas del módulo en el schema del tenant
--
-- CÓMO EJECUTAR:
--   cPanel → phpPgAdmin → BD → SQL → pegar sección A y ejecutar
--   Luego reemplazar {schema_name} por el schema real y ejecutar sección B
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN A — GOBERNANZA GLOBAL (schema public)
-- ─────────────────────────────────────────────────────────────

-- A.1 Registrar módulo en module_catalog
INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('financial_core', 'Control Financiero', 'Gestión del flujo económico mensual personal',
     'wallet', 'financial', FALSE, TRUE, FALSE, TRUE, 20, 'activo', 'personal_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    version     = EXCLUDED.version,
    status      = EXCLUDED.status;

-- A.2 Registrar transacciones del módulo
DO $$
DECLARE
    mod_id INTEGER;
BEGIN
    SELECT id INTO mod_id FROM public.module_catalog WHERE code = 'financial_core';

    INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (mod_id, 'financial_dashboard',    'Dashboard Financiero', 'Panel principal financiero',                     '/financial',                                  'chart-bar',  1, TRUE,  'activo'),
        (mod_id, 'financial_periods',      'Períodos',             'Gestión de períodos mensuales',                  '/financial/periods',                           'calendar',   2, TRUE,  'activo'),
        (mod_id, 'financial_categories',   'Categorías',           'Gestión de categorías de ingresos y gastos',     '/financial/categories',                        'tag',        3, TRUE,  'activo'),
        (mod_id, 'financial_budget',       'Presupuesto',          'Planificación presupuestaria por período',       '/financial/periods/:periodId/budget',          'coins',      4, FALSE, 'activo'),
        (mod_id, 'financial_transactions', 'Transacciones',        'Registro de ingresos y gastos',                  '/financial/periods/:periodId/transactions',    'receipt',    5, FALSE, 'activo'),
        (mod_id, 'financial_summary',      'Resumen',              'Resumen y análisis financiero del período',      '/financial/periods/:periodId/summary',         'chart-pie',  6, FALSE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        route       = EXCLUDED.route,
        tab_order   = EXCLUDED.tab_order,
        status      = EXCLUDED.status;
END $$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN B — TABLAS DEL TENANT (reemplazar {schema_name})
-- ─────────────────────────────────────────────────────────────

-- B.1 Períodos financieros
CREATE TABLE IF NOT EXISTS {schema_name}.financial_periods (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  initial_balance INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_financial_period_month  CHECK (month >= 1 AND month <= 12),
  CONSTRAINT chk_financial_period_status CHECK (status IN ('open', 'closed', 'archived')),
  CONSTRAINT uq_financial_period_user_year_month UNIQUE (user_id, year, month)
);

-- B.2 Categorías financieras
CREATE TABLE IF NOT EXISTS {schema_name}.financial_categories (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  name         VARCHAR(120) NOT NULL,
  type         VARCHAR(20) NOT NULL,
  parent_id    INTEGER NULL REFERENCES {schema_name}.financial_categories(id),
  is_fixed     BOOLEAN NOT NULL DEFAULT FALSE,
  is_essential BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_financial_category_type CHECK (type IN ('income', 'expense', 'saving', 'debt', 'transfer'))
);

-- B.3 Planes de presupuesto
CREATE TABLE IF NOT EXISTS {schema_name}.budget_plans (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL,
  period_id      INTEGER NOT NULL REFERENCES {schema_name}.financial_periods(id) ON DELETE CASCADE,
  category_id    INTEGER NOT NULL REFERENCES {schema_name}.financial_categories(id),
  planned_amount INTEGER NOT NULL DEFAULT 0,
  notes          TEXT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_budget_plan_amount CHECK (planned_amount >= 0),
  CONSTRAINT uq_budget_plan_user_period_category UNIQUE (user_id, period_id, category_id)
);

-- B.4 Transacciones financieras
CREATE TABLE IF NOT EXISTS {schema_name}.financial_transactions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL,
  period_id      INTEGER NOT NULL REFERENCES {schema_name}.financial_periods(id) ON DELETE CASCADE,
  category_id    INTEGER NOT NULL REFERENCES {schema_name}.financial_categories(id),
  type           VARCHAR(20) NOT NULL,
  amount         INTEGER NOT NULL,
  date           DATE NOT NULL,
  description    TEXT NULL,
  payment_method VARCHAR(80) NULL,
  source         VARCHAR(80) NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_financial_transaction_type   CHECK (type IN ('income', 'expense', 'saving', 'debt', 'transfer')),
  CONSTRAINT chk_financial_transaction_amount CHECK (amount > 0)
);

-- B.5 Índices
CREATE INDEX IF NOT EXISTS idx_financial_periods_user            ON {schema_name}.financial_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_user_status     ON {schema_name}.financial_periods(user_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_categories_user         ON {schema_name}.financial_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_user_type    ON {schema_name}.financial_categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_period          ON {schema_name}.budget_plans(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_category             ON {schema_name}.budget_plans(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_period      ON {schema_name}.financial_transactions(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_period_type ON {schema_name}.financial_transactions(user_id, period_id, type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category         ON {schema_name}.financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date             ON {schema_name}.financial_transactions(date);

-- =============================================================
-- NOTE: menu_visible fix for financial transactions
--
-- The financial_summary, financial_budget, and financial_transactions
-- module_transactions should have menu_visible = FALSE because they
-- are accessed via dynamic route params (e.g. /financial/periods/:periodId)
-- and cannot work as standalone menu items.
--
-- If these were accidentally set to menu_visible = TRUE in the DB, run:
--
-- UPDATE public.module_transactions SET menu_visible = FALSE
-- WHERE code IN ('financial_budget', 'financial_transactions', 'financial_summary');
-- =============================================================
