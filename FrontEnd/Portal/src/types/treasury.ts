export type TreasuryStatus = 'active' | 'inactive';

export interface TreasuryCatalogItem {
  id: number;
  code: string;
  name: string;
  status: TreasuryStatus;
  created_at: string;
  updated_at: string;
}

export interface TreasuryCounterparty extends Omit<TreasuryCatalogItem, 'code' | 'name'> {
  counterparty_type: 'customer' | 'supplier' | 'both';
  name_snapshot: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  email: string | null;
}

export interface TreasuryCounterpartyFormData {
  counterparty_type: 'customer' | 'supplier' | 'both';
  name_snapshot: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  email?: string;
}

export interface TreasuryPaymentTerm extends TreasuryCatalogItem {
  term_type: 'cash' | 'credit' | 'installments';
  days_due: number;
  installments_count: number;
  grace_days: number;
}

export interface TreasuryPaymentTermFormData {
  code: string;
  name: string;
  term_type: 'cash' | 'credit' | 'installments';
  days_due: number;
  installments_count: number;
  grace_days: number;
}

export interface TreasuryCashRegister extends TreasuryCatalogItem {
  location: string | null;
}

export interface TreasuryCashRegisterFormData {
  code: string;
  name: string;
  location?: string;
}

export type TreasuryCashSessionStatus = 'open' | 'closed';
export type TreasuryMovementType = 'sale_in' | 'payment_out' | 'deposit_out' | 'withdrawal_out' | 'adjustment_in' | 'adjustment_out';

export interface TreasuryCashMovement {
  id: number;
  cash_session_id: number;
  movement_type: TreasuryMovementType;
  amount: number;
  signed_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface TreasuryCashSession {
  id: number;
  cash_register_id: number;
  cash_register_code?: string;
  cash_register_name?: string;
  employee_id: number;
  employee_name?: string;
  opened_at: string;
  opening_amount: number;
  closed_at: string | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference_amount: number | null;
  status: TreasuryCashSessionStatus;
  movements?: TreasuryCashMovement[];
}

export interface TreasuryOpenCashSessionData {
  cash_register_id: number;
  employee_id: number;
  opening_amount: number;
}

export interface TreasuryCashMovementData {
  cash_register_id: number;
  movement_type: TreasuryMovementType;
  amount: number;
  signed_amount: number;
  currency?: string;
  notes?: string;
  reference_table?: string;
  reference_id?: number;
}
