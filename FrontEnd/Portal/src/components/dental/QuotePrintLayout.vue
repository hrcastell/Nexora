<template>
  <DentalPrintDocument
    :config="companyConfig"
    title="PRESUPUESTO"
    :document-number="quote.quote_number"
    :patient="patientInfo"
    :legal-text="quote.conditions_text"
  >
    <!-- Dates row -->
    <div style="display:flex; gap:24pt; margin-bottom:10pt; font-size:9pt;">
      <div>
        <span style="color:#777;">Fecha: </span>
        <span>{{ fmtDate(quote.quote_date) }}</span>
      </div>
      <div v-if="quote.valid_until">
        <span style="color:#777;">Válido hasta: </span>
        <span>{{ fmtDate(quote.valid_until) }}</span>
      </div>
    </div>

    <!-- Items table -->
    <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:12pt;">
      <thead>
        <tr style="border-bottom:1px solid #ccc; text-align:left;">
          <th style="padding:4pt 6pt; color:#555; font-weight:600;">#</th>
          <th style="padding:4pt 6pt; color:#555; font-weight:600;">Tratamiento</th>
          <th style="padding:4pt 6pt; color:#555; font-weight:600;">Diente</th>
          <th style="padding:4pt 6pt; color:#555; font-weight:600; text-align:center;">Cant.</th>
          <th style="padding:4pt 6pt; color:#555; font-weight:600; text-align:right;">P. Unit.</th>
          <th style="padding:4pt 6pt; color:#555; font-weight:600; text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, idx) in items"
          :key="item.id"
          style="border-bottom:1px solid #eee;"
        >
          <td style="padding:4pt 6pt; color:#777;">{{ idx + 1 }}</td>
          <td style="padding:4pt 6pt;">
            <div style="font-weight:500;">{{ item.treatment_name_snapshot }}</div>
            <div v-if="item.description" style="font-size:8pt; color:#777;">{{ item.description }}</div>
          </td>
          <td style="padding:4pt 6pt; color:#777;">{{ item.tooth_reference || '—' }}</td>
          <td style="padding:4pt 6pt; text-align:center;">{{ item.quantity }}</td>
          <td style="padding:4pt 6pt; text-align:right;">{{ fmt(item.unit_price) }}</td>
          <td style="padding:4pt 6pt; text-align:right; font-weight:500;">{{ fmt(item.subtotal) }}</td>
        </tr>
        <tr v-if="items.length === 0">
          <td colspan="6" style="padding:8pt 6pt; color:#aaa; text-align:center;">Sin ítems</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals block -->
    <div style="display:flex; justify-content:flex-end; margin-bottom:16pt;">
      <table style="font-size:9pt; min-width:200pt;">
        <tr>
          <td style="padding:2pt 8pt; color:#777;">Subtotal</td>
          <td style="padding:2pt 8pt; text-align:right;">{{ fmt(quote.total_amount) }}</td>
        </tr>
        <tr v-if="quote.discount_amount > 0">
          <td style="padding:2pt 8pt; color:#777;">Descuento</td>
          <td style="padding:2pt 8pt; text-align:right; color:#c00;">- {{ fmt(quote.discount_amount) }}</td>
        </tr>
        <tr style="border-top:2px solid #000;">
          <td style="padding:4pt 8pt; font-weight:bold; font-size:11pt;">TOTAL</td>
          <td style="padding:4pt 8pt; text-align:right; font-weight:bold; font-size:11pt;">{{ fmt(quote.final_amount) }}</td>
        </tr>
      </table>
    </div>

    <!-- Acceptance block -->
    <div style="margin-top:24pt; border:1px solid #ddd; padding:10pt; font-size:9pt;">
      <div style="font-weight:600; margin-bottom:8pt;">Aceptación del presupuesto</div>
      <div style="display:flex; gap:16pt; align-items:center; margin-bottom:8pt;">
        <div style="width:12pt; height:12pt; border:1px solid #000;"></div>
        <span>Acepto el presupuesto detallado en el presente documento.</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12pt; margin-top:16pt;">
        <div>
          <div style="border-bottom:1px solid #000; height:24pt; margin-bottom:3pt;"></div>
          <div style="color:#777;">Nombre</div>
        </div>
        <div>
          <div style="border-bottom:1px solid #000; height:24pt; margin-bottom:3pt;"></div>
          <div style="color:#777;">Firma</div>
        </div>
        <div>
          <div style="border-bottom:1px solid #000; height:24pt; margin-bottom:3pt;"></div>
          <div style="color:#777;">Fecha</div>
        </div>
      </div>
    </div>
  </DentalPrintDocument>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DentalPrintDocument from './DentalPrintDocument.vue';
import type { DentalQuote, DentalQuoteItem } from '../../types/dental';

const props = defineProps<{
  quote: DentalQuote;
  items: DentalQuoteItem[];
  customer: Record<string, unknown>;
  config: Record<string, unknown>;
}>();

const companyConfig = computed(() => ({
  company_name: String(props.config.company_name ?? ''),
  address:      props.config.address   ? String(props.config.address)   : undefined,
  phone:        props.config.phone     ? String(props.config.phone)     : undefined,
  email:        props.config.email     ? String(props.config.email)     : undefined,
  tax_id:       props.config.rut       ? String(props.config.rut)       : undefined,
  logo_url:     props.config.logo_url  ? String(props.config.logo_url)  : undefined,
}));

const patientInfo = computed(() => {
  const firstName = String(props.customer.first_name ?? '');
  const lastName  = String(props.customer.last_name  ?? '');
  return {
    name:   `${firstName} ${lastName}`.trim(),
    cedula: props.customer.document_number
      ? `${props.customer.document_type ?? ''} ${props.customer.document_number}`.trim()
      : undefined,
    phone: props.customer.phone ? String(props.customer.phone) : undefined,
  };
});

function fmt(n: number | undefined | null) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string | undefined | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
