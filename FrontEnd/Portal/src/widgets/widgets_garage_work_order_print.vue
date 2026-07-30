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
          <div class="nxr-print-doc-title">Orden de Trabajo</div>
          <div class="nxr-print-doc-meta">
            <div><label>N° Orden: </label><span>{{ workOrder.order_number }}</span></div>
            <div><label>Estado: </label><span>{{ statusLabel }}</span></div>
            <div><label>Fecha ingreso: </label><span>{{ fmtDate(workOrder.entry_date) }}</span></div>
            <div v-if="workOrder.estimated_delivery_date"><label>Entrega est.: </label><span>{{ fmtDate(workOrder.estimated_delivery_date) }}</span></div>
          </div>
        </div>
      </div>

      <!-- Customer + vehicle info -->
      <div class="nxr-print-info-row print-no-break">
        <div class="nxr-print-info-box">
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
          </div>
        </div>
        <div class="nxr-print-info-box">
          <div class="nxr-print-section-title">Datos del Vehículo</div>
          <div class="nxr-print-info-grid">
            <div class="nxr-print-info-field">
              <label>Placa</label>
              <span>{{ vehicleInfo.plate }}</span>
            </div>
            <div class="nxr-print-info-field">
              <label>Marca / Modelo</label>
              <span>{{ vehicleInfo.brandModel }}</span>
            </div>
            <div v-if="vehicleInfo.year" class="nxr-print-info-field">
              <label>Año</label>
              <span>{{ vehicleInfo.year }}</span>
            </div>
            <div v-if="vehicleInfo.mileage" class="nxr-print-info-field">
              <label>Kilometraje</label>
              <span>{{ vehicleInfo.mileage }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Services + parts -->
      <div>
        <div class="nxr-print-section-title">Servicios y Repuestos</div>
        <table class="nxr-print-items-table">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>Servicio</th>
              <th class="text-center">Horas</th>
              <th class="text-right">Tarifa/Hora</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(service, idx) in services" :key="service.id">
              <tr>
                <td class="text-center">{{ idx + 1 }}</td>
                <td>
                  <div>{{ service.service_name }}</div>
                  <div v-if="service.employee_name" style="font-size:6.5pt; color:#888;">Técnico: {{ service.employee_name }}</div>
                  <div v-if="service.description" style="font-size:6.5pt; color:#888;">{{ service.description }}</div>
                </td>
                <td class="text-center">{{ service.actual_hours || service.estimated_hours || 0 }}</td>
                <td class="text-right">{{ fmt(service.hourly_rate) }}</td>
                <td class="text-right">{{ fmt(service.labor_total) }}</td>
              </tr>
              <tr v-for="product in service.products ?? []" :key="`p-${product.id}`" class="nxr-print-subrow">
                <td></td>
                <td>↳ {{ product.product_name }}</td>
                <td class="text-center">{{ product.quantity }}{{ product.unit ? ` ${product.unit}` : '' }}</td>
                <td class="text-right">{{ fmt(product.unit_price) }}</td>
                <td class="text-right">{{ fmt(product.total_price) }}</td>
              </tr>
            </template>
            <tr v-if="services.length === 0">
              <td colspan="5" class="text-center" style="color:#aaa;">Sin servicios registrados</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="nxr-print-totals-wrap">
        <table class="nxr-print-totals-table">
          <tbody>
            <tr>
              <td class="nxr-print-totals-label">Subtotal Mano de Obra</td>
              <td class="nxr-print-totals-value">{{ fmt(workOrder.subtotal_labor) }}</td>
            </tr>
            <tr>
              <td class="nxr-print-totals-label">Subtotal Repuestos</td>
              <td class="nxr-print-totals-value">{{ fmt(workOrder.subtotal_products) }}</td>
            </tr>
            <tr>
              <td class="nxr-print-totals-label">TOTAL</td>
              <td class="nxr-print-totals-value">{{ fmt(workOrder.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Notes -->
      <div v-if="hasNotes" class="nxr-print-conditions">
        <div class="nxr-print-conditions-title">Observaciones</div>
        <div v-if="workOrder.reported_issue" style="margin-bottom:4pt;"><strong>Problema reportado:</strong> {{ workOrder.reported_issue }}</div>
        <div v-if="workOrder.diagnosis" style="margin-bottom:4pt;"><strong>Diagnóstico:</strong> {{ workOrder.diagnosis }}</div>
        <div v-if="workOrder.customer_notes"><strong>Notas para el cliente:</strong> {{ workOrder.customer_notes }}</div>
      </div>

      <!-- Signatures -->
      <div class="nxr-print-signatures">
        <div>
          <div class="print-signature-line"></div>
          <div>Firma del Cliente</div>
        </div>
        <div>
          <div class="print-signature-line"></div>
          <div>Firma del Técnico Responsable</div>
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
import type { WorkOrder, WorkOrderService } from '../types/garage';

const props = defineProps<{
  workOrder: WorkOrder;
  services: WorkOrderService[];
  customer: Record<string, unknown>;
  vehicle: Record<string, unknown>;
  config: Record<string, unknown>;
}>();

const todayIso = new Date().toISOString();

const STATUS_LABELS: Record<string, string> = {
  draft:         'Borrador',
  received:      'Recibida',
  diagnosis:     'Diagnóstico',
  approved:      'Aprobada',
  in_progress:   'En proceso',
  waiting_parts: 'Esp. repuestos',
  completed:     'Completada',
  delivered:     'Entregada',
  cancelled:     'Cancelada',
};

const statusLabel = computed(() => STATUS_LABELS[props.workOrder.status] ?? props.workOrder.status);

const hasNotes = computed(() =>
  Boolean(props.workOrder.reported_issue || props.workOrder.diagnosis || props.workOrder.customer_notes)
);

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
    phone: props.customer.phone ? String(props.customer.phone) : '',
  };
});

const vehicleInfo = computed(() => {
  const brand = props.vehicle.brand ? String(props.vehicle.brand) : '';
  const model = props.vehicle.model ? String(props.vehicle.model) : '';
  return {
    plate:      props.vehicle.plate ? String(props.vehicle.plate) : '—',
    brandModel: `${brand} ${model}`.trim() || '—',
    year:       props.vehicle.year ? String(props.vehicle.year) : '',
    mileage:    props.vehicle.mileage ? `${Number(props.vehicle.mileage).toLocaleString('es-CL')} km` : '',
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
