export type PurchaseDocumentType = 'purchase_order' | 'purchase_invoice';
export type PurchaseDocumentStatus = 'draft' | 'issued' | 'partially_received' | 'received' | 'cancelled';
export type PaymentCondition = 'cash' | 'credit';

export interface PurchaseDocumentLine {
  id?: number;
  purchase_document_id?: number;
  product_id: number;
  product_name_snapshot?: string;
  sku_snapshot?: string | null;
  quantity: number;
  received_quantity?: number;
  pending_quantity?: number;
  unit: string;
  unit_cost: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  notes?: string | null;
}

export interface PurchaseDocument {
  id: number;
  document_type: PurchaseDocumentType;
  internal_number: string;
  supplier_document_number: string | null;
  supplier_id: number;
  supplier_name?: string;
  issue_date: string;
  expected_reception_date: string | null;
  due_date: string | null;
  payment_condition: PaymentCondition;
  payment_term_days: number;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  status: PurchaseDocumentStatus;
  notes: string | null;
  lines?: PurchaseDocumentLine[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseDocumentFormData {
  document_type: PurchaseDocumentType;
  supplier_document_number: string;
  supplier_id: number;
  issue_date: string;
  expected_reception_date: string;
  due_date: string;
  payment_condition: PaymentCondition;
  payment_term_days: number;
  currency: string;
  notes: string;
  lines: PurchaseDocumentLine[];
}

export type StockReceiptStatus = 'draft' | 'confirmed' | 'cancelled';

export interface StockReceiptLine {
  id?: number;
  stock_receipt_id?: number;
  purchase_document_line_id: number;
  product_id: number;
  product_name_snapshot?: string;
  quantity_received: number;
  unit_cost: number;
  unit: string;
  batch_number?: string | null;
  serial_number?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
}

export interface StockReceipt {
  id: number;
  receipt_number: string;
  purchase_document_id: number;
  internal_number?: string;
  warehouse_id: number;
  warehouse_name?: string;
  supplier_id: number;
  reception_date: string;
  status: StockReceiptStatus;
  notes: string | null;
  lines?: StockReceiptLine[];
  created_at: string;
  updated_at: string;
}

export interface StockReceiptFormData {
  purchase_document_id: number;
  warehouse_id: number;
  reception_date: string;
  notes: string;
}

export interface StockRow {
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  on_hand: number;
}
