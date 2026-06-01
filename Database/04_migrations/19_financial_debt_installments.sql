-- =============================================================
-- MIGRATION: 19_financial_debt_installments.sql
-- Financial Core — Debt installment tracking
--
-- Adds installment tracking fields to the financial module:
--   - total_installments to financial_categories (set once per debt category)
--   - current_installment to budget_plans (which installment this period)
--
-- EXECUTION:
--   Replace {schema_name} with the real schema (e.g. hernancius)
--   Run via cPanel → phpPgAdmin → SQL
--   Run once per tenant schema.
-- =============================================================

ALTER TABLE {schema_name}.financial_categories
    ADD COLUMN IF NOT EXISTS total_installments INTEGER NULL;

ALTER TABLE {schema_name}.budget_plans
    ADD COLUMN IF NOT EXISTS current_installment INTEGER NULL;

-- Check constraint: total_installments must be positive when set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_category_total_installments'
          AND conrelid = '{schema_name}.financial_categories'::regclass
    ) THEN
        ALTER TABLE {schema_name}.financial_categories
            ADD CONSTRAINT chk_category_total_installments
            CHECK (total_installments IS NULL OR total_installments > 0);
    END IF;
END $$;

-- Check constraint: current_installment must be positive when set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_budget_plan_current_installment'
          AND conrelid = '{schema_name}.budget_plans'::regclass
    ) THEN
        ALTER TABLE {schema_name}.budget_plans
            ADD CONSTRAINT chk_budget_plan_current_installment
            CHECK (current_installment IS NULL OR current_installment > 0);
    END IF;
END $$;
