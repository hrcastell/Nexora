// Cotizaciones — standalone module types (spec: Cotizaciones Module domain;
// design §5/§6). Mirrors BackEnd/controllers/cotizaciones/quotesController.js
// response shapes exactly (see apply-progress topic sdd/products-catalog-transversal
// for the full API surface reference).

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'paid' | 'converted';

export interface QuoteLine {
  id: number;
  quote_id: number;
  product_id: number | null;
  product_name_snapshot: string | null;
  sku_snapshot: string | null;
  supplier_id: number | null;
  supplier_name?: string | null;
  supplier_cost: number;
  margin_pct: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  is_non_stocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  quote_number: string;
  customer_id: number | null;
  customer_name?: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  subtotal: number;
  discount_amount: number;
  final_amount: number;
  accepted_at: string | null;
  accepted_by_name: string | null;
  acceptance_notes: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  treasury_document_id: number | null;
  paid_at: string | null;
  converted_at: string | null;
  converted_purchase_document_id: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteDetail extends Quote {
  lines: QuoteLine[];
}

export interface QuoteFormData {
  customer_id?: number | null;
  valid_until?: string | null;
  notes?: string | null;
  discount_amount?: number;
}

// Two line shapes accepted by the API, discriminated by is_non_stocked:
// - stocked line: product_id required, unit_price optional (defaults to
//   product.reference_price server-side).
// - non-stocked (tercerizado) line: supplier_id + supplier_cost required,
//   product_id optional, unit_price is app-computed server-side
//   (supplier_cost * (1 + margin_pct/100)).
export interface QuoteLineFormData {
  is_non_stocked: boolean;
  product_id?: number | null;
  quantity: number;
  unit_price?: number;
  supplier_id?: number | null;
  supplier_cost?: number;
  margin_pct?: number;
  product_name?: string;
  sku?: string;
}

export interface QuoteAcceptPayload {
  counterparty_id: number;
  accepted_by_name?: string;
  acceptance_notes?: string;
}

export interface QuoteRejectPayload {
  rejection_reason?: string;
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Por aprobar',
  accepted: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  paid: 'Pagada',
  converted: 'Convertida',
};

// Statuses the "Estado" field can freely move between. Once a quote reaches
// 'accepted' it is permanently locked (see BackEnd quotesController's
// UNLOCKED_STATUSES) — 'paid'/'converted' are automation-only and never
// offered here.
export const QUOTE_MANUAL_STATUSES: QuoteStatus[] = ['draft', 'sent', 'expired', 'rejected', 'accepted'];
