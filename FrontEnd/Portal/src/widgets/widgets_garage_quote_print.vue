<template>
  <Teleport to="body">
    <div id="garage-print-target">
      <!-- Header: company info left, document info right -->
      <div class="nxr-print-header">
        <div class="nxr-print-company">
          <img v-if="companyInfo.logoUrl" :src="companyInfo.logoUrl" alt="Logo" style="height:32pt; width:auto; object-fit:contain; margin-bottom:4pt;" />
          <div class="nxr-print-company-name">{{ companyInfo.name }}</div>
          <div class="nxr-print-company-details">
            <div v-if="companyInfo.address">{{ companyInfo.address }}</div>
            <div v-if="companyInfo.phone || companyInfo.email">
              <span v-if="companyInfo.phone">Tel: {{ companyInfo.phone }}</span>
              <span v-if="companyInfo.phone && companyInfo.email"> · </span>
              <span v-if="companyInfo.email">{{ companyInfo.email }}</span>
            </div>
            <div v-if="companyInfo.rut">RUT/NIT: {{ companyInfo.rut }}</div>
          </div>
        </div>
        <div class="nxr-print-doc-info">
          <div class="nxr-print-doc-title">Cotización</div>
          <div class="nxr-print-doc-meta">
            <div><label>N° Cotización: </label><span>{{ quote.quote_number }}</span></div>
            <div><label>Fecha: </label><span>{{ fmtDate(quote.created_at) }}</span></div>
            <div v-if="quote.valid_until"><label>Válida hasta: </label><span>{{ fmtDate(quote.valid_until) }}</span></div>
          </div>
        </div>
      </div>

      <!-- Client info -->
      <div class="nxr-print-info-box print-no-break" style="margin-bottom:10pt;">
        <div class="nxr-print-section-title">Datos del Cliente</div>
        <div class="nxr-print-info-grid">
          <div class="nxr-print-info-field">
            <label>Nombre</label>
            <span>{{ customerInfo.name }}</span>
          </div>
          <div v-if="customerInfo.document" class="nxr-print-info-field">
            <label>Documento</label>
            <span>{{ customerInfo.document }}</span>
          </div>
          <div v-if="customerInfo.phone" class="nxr-print-info-field">
            <label>Teléfono</label>
            <span>{{ customerInfo.phone }}</span>
          </div>
          <div v-if="customerInfo.address" class="nxr-print-info-field">
            <label>Dirección</label>
            <span>{{ customerInfo.address }}</span>
          </div>
          <div v-if="customerInfo.city" class="nxr-print-info-field">
            <label>Ciudad</label>
            <span>{{ customerInfo.city }}</span>
          </div>
        </div>
      </div>

      <!-- Items table -->
      <div>
        <div class="nxr-print-section-title">Detalle de la Cotización</div>
        <table class="nxr-print-items-table">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>Descripción</th>
              <th class="text-center">Cant.</th>
              <th class="text-right">Val. Unitario</th>
              <th class="text-right">Val. Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, idx) in lines" :key="line.id">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <div>{{ line.product_name_snapshot || line.sku_snapshot || 'Ítem sin producto' }}</div>
                <div v-if="line.is_non_stocked" style="font-size:6.5pt; color:#888;">Tercerizado{{ line.supplier_name ? ` · ${line.supplier_name}` : '' }}</div>
              </td>
              <td class="text-center">{{ line.quantity }}</td>
              <td class="text-right">{{ fmt(line.unit_price) }}</td>
              <td class="text-right">{{ fmt(line.subtotal) }}</td>
            </tr>
            <tr v-if="lines.length === 0">
              <td colspan="5" class="text-center" style="color:#aaa;">Sin ítems</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="nxr-print-totals-wrap">
        <table class="nxr-print-totals-table">
          <tbody>
            <tr>
              <td class="nxr-print-totals-label">Subtotal</td>
              <td class="nxr-print-totals-value">{{ fmt(quote.subtotal) }}</td>
            </tr>
            <tr v-if="quote.discount_amount > 0">
              <td class="nxr-print-totals-label">Descuento</td>
              <td class="nxr-print-totals-value">- {{ fmt(quote.discount_amount) }}</td>
            </tr>
            <tr>
              <td class="nxr-print-totals-label">TOTAL</td>
              <td class="nxr-print-totals-value">{{ fmt(quote.final_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Notes -->
      <div v-if="quote.notes" class="nxr-print-conditions">
        <div class="nxr-print-conditions-title">Notas</div>
        <div style="white-space:pre-wrap;">{{ quote.notes }}</div>
      </div>

      <!-- Acceptance declaration + signatures -->
      <div class="nxr-print-acceptance">
        Acepto la cotización detallada en el presente documento.
      </div>
      <div class="nxr-print-signatures nxr-print-signatures-3">
        <div>
          <div class="print-signature-line"></div>
          <div>Nombre del Cliente</div>
        </div>
        <div>
          <div class="print-signature-line"></div>
          <div>Firma del Cliente</div>
        </div>
        <div>
          <div class="print-signature-line"></div>
          <div>Fecha de aceptación</div>
        </div>
      </div>

      <div class="nxr-print-footer">
        Documento generado el {{ fmtDate(todayIso) }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Quote, QuoteLine } from '../types/cotizaciones';

const props = defineProps<{
  quote: Quote;
  lines: QuoteLine[];
  customer: Record<string, unknown>;
  config: Record<string, unknown>;
}>();

const todayIso = new Date().toISOString();

const companyInfo = computed(() => ({
  name:    props.config.company_name ? String(props.config.company_name) : '—',
  address: props.config.address ? String(props.config.address) : '',
  phone:   props.config.phone ? String(props.config.phone) : '',
  email:   props.config.email ? String(props.config.email) : '',
  rut:     props.config.rut ? String(props.config.rut) : '',
  logoUrl: props.config.logo_url ? String(props.config.logo_url) : '',
}));

const customerInfo = computed(() => {
  const first = String(props.customer.first_name ?? '');
  const last  = String(props.customer.last_name ?? '');
  return {
    name: `${first} ${last}`.trim() || '—',
    document: props.customer.document_number
      ? `${props.customer.document_type ?? ''} ${props.customer.document_number}`.trim()
      : '',
    phone:   props.customer.phone   ? String(props.customer.phone)   : '',
    address: props.customer.address ? String(props.customer.address) : '',
    city:    props.customer.city    ? String(props.customer.city)    : '',
  };
});

function fmt(n: number | undefined | null) {
  return `$${Math.round(n ?? 0).toLocaleString('es-CL')}`;
}

function fmtDate(iso: string | undefined | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
