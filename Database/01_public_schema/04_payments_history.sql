-- 04_payments_history.sql
-- Tabla de historial de pagos separada de subscriptions

CREATE TABLE IF NOT EXISTS public.payments_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE,
    notes TEXT,
    registered_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_history_company ON public.payments_history(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_history_subscription ON public.payments_history(subscription_id);
