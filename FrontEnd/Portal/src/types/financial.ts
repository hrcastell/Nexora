// ─── TIPOS BASE ───────────────────────────────────────────────

export type PeriodStatus = 'open' | 'closed' | 'archived';
export type CategoryType = 'income' | 'expense' | 'saving' | 'debt' | 'transfer';
export type TransactionType = 'income' | 'expense' | 'saving' | 'debt' | 'transfer';
export type BudgetStatus = 'under_budget' | 'on_track' | 'over_budget' | 'no_plan';

// ─── PERÍODOS ─────────────────────────────────────────────────

export interface FinancialPeriod {
  id: number;
  user_id: number;
  year: number;
  month: number;
  initial_balance: number;
  status: PeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface FinancialPeriodFormData {
  year: number;
  month: number;
  initial_balance: number;
}

// ─── CATEGORÍAS ───────────────────────────────────────────────

export interface FinancialCategory {
  id: number;
  user_id: number;
  name: string;
  type: CategoryType;
  parent_id: number | null;
  is_fixed: boolean;
  is_essential: boolean;
  is_active: boolean;
  total_installments?: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategoryFormData {
  name: string;
  type: CategoryType;
  parent_id?: number | null;
  is_fixed?: boolean;
  is_essential?: boolean;
  total_installments?: number | null;
}

// ─── PLANES DE PRESUPUESTO ────────────────────────────────────

export interface BudgetPlan {
  id: number;
  user_id: number;
  period_id: number;
  category_id: number;
  category_name?: string;
  category_type?: CategoryType;
  planned_amount: number;
  notes: string | null;
  current_installment?: number | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetPlanFormData {
  category_id: number;
  planned_amount: number;
  notes?: string | null;
  current_installment?: number | null;
}

// ─── TRANSACCIONES ────────────────────────────────────────────

export interface FinancialTransaction {
  id: number;
  user_id: number;
  period_id: number;
  category_id: number;
  category_name?: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  payment_method: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransactionFormData {
  category_id: number;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
  payment_method?: string | null;
  source?: string | null;
}

// ─── RESUMEN ──────────────────────────────────────────────────

export interface FinancialSummaryData {
  planned_income: number;
  real_income: number;
  income_difference: number;
  planned_expenses: number;
  real_expenses: number;
  expense_difference: number;
  planned_savings: number;
  real_savings: number;
  savings_difference: number;
  net_cashflow: number;
  final_balance: number;
  savings_rate: number;
  expense_execution_rate: number;
}

export interface DebtItem {
  category_id: number;
  category_name: string;
  planned_amount: number;
  real_amount: number;
  total_installments: number | null;
  current_installment: number | null;
  remaining_installments: number | null;
  estimated_remaining: number | null;
}

export interface DebtSummary {
  total_debt_monthly: number;
  total_estimated_debt: number;
  debts: DebtItem[];
}

export interface FinancialSummary {
  period: FinancialPeriod;
  summary: FinancialSummaryData;
  debt_summary?: DebtSummary;
}

export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  category_type: CategoryType;
  planned_amount: number;
  real_amount: number;
  difference: number;
  status: BudgetStatus;
  is_fixed: boolean;
  is_essential: boolean;
}
