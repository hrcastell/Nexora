<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CreditCard, Plus, Loader2, X, Save, ShieldAlert, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, FileText } from 'lucide-vue-next';
import AppToast, { type ToastItem, type ToastType } from '../../components/AppToast.vue';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { useAuthStore } from '../../stores/auth';
import { usePermissions } from '../../composables/usePermissions';
import type { PaymentAgreement, Invoice, Payment, Company } from '../../types/auth';

const cfg   = useVisualConfigStore();
const auth  = useAuthStore();
const perms = usePermissions();

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(9,18,36,0.85)');
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');
const modalBg     = computed(() => isLight.value ? '#ffffff' : '#0d1829');

const companyId  = computed(() => auth.currentCompany?.id);
const company    = ref<Company | null>(null);
const agreements = ref<PaymentAgreement[]>([]);
const invoices   = ref<Invoice[]>([]);
const payments   = ref<Payment[]>([]);
const isLoading  = ref(true);

const activeTab   = ref<'agreements' | 'invoices' | 'payments'>('invoices');
const showModal   = ref(false);
const modalType   = ref<'agreement' | 'invoice' | 'payment'>('invoice');
const isSaving    = ref(false);
const saveError   = ref('');

// Toast state
const activeToast = ref<ToastItem | null>(null);
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = { id: Date.now(), title, message, type };
};

// Generate invoice from agreement
const isGenerating = ref(false);
async function generateInvoice(agreementId: number) {
  if (!companyId.value) return;
  isGenerating.value = true;
  try {
    await api.post(`/companies/${companyId.value}/agreements/${agreementId}/generate-invoice`);
    triggerToast('Recibo generado', 'El recibo fue creado automáticamente desde el convenio.', 'success');
    await loadData();
    activeTab.value = 'invoices';
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    triggerToast('Error', err?.response?.data?.error ?? 'No se pudo generar el recibo.', 'error');
  } finally {
    isGenerating.value = false;
  }
}

const agreementForm = ref({
  amount: '', currency: 'CLP', frequency: 'monthly',
  start_date: '', due_day: 1, service_description: '', grace_period_days: 5
});

const invoiceForm = ref({
  agreement_id: '' as string | number,
  period_start: '', period_end: '', due_date: '',
  amount: '', currency: 'CLP', notes: ''
});

const paymentForm = ref({
  invoice_id: '' as string | number,
  amount: '', payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'transferencia', reference: '', notes: ''
});

async function loadData() {
  if (!companyId.value) return;
  isLoading.value = true;
  try {
    const [cRes, aRes, iRes, pRes] = await Promise.all([
      api.get(`/companies/${companyId.value}`),
      api.get(`/companies/${companyId.value}/agreements`),
      api.get(`/companies/${companyId.value}/invoices`),
      api.get(`/companies/${companyId.value}/payments`),
    ]);
    company.value    = cRes.data;
    agreements.value = aRes.data;
    invoices.value   = iRes.data;
    payments.value   = pRes.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

onMounted(loadData);

function openAgreementModal() {
  modalType.value = 'agreement';
  agreementForm.value = { amount: '', currency: 'CLP', frequency: 'monthly', start_date: '', due_day: 1, service_description: '', grace_period_days: 5 };
  saveError.value = '';
  showModal.value = true;
}

function openInvoiceModal() {
  modalType.value = 'invoice';
  invoiceForm.value = { agreement_id: agreements.value[0]?.id ?? '', period_start: '', period_end: '', due_date: '', amount: '', currency: 'CLP', notes: '' };
  saveError.value = '';
  showModal.value = true;
}

function openPaymentModal(invoiceId?: number) {
  modalType.value = 'payment';
  paymentForm.value = { invoice_id: invoiceId ?? (invoices.value.find(i => i.status === 'emitido' || i.status === 'pendiente')?.id ?? ''), amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'transferencia', reference: '', notes: '' };
  saveError.value = '';
  showModal.value = true;
}

async function saveForm() {
  isSaving.value = true;
  saveError.value = '';
  try {
    if (modalType.value === 'agreement') {
      if (!agreementForm.value.amount || !agreementForm.value.start_date || !agreementForm.value.service_description) {
        saveError.value = 'Monto, fecha de inicio y descripción son requeridos'; isSaving.value = false; return;
      }
      await api.post(`/companies/${companyId.value}/agreements`, agreementForm.value);
    } else if (modalType.value === 'invoice') {
      if (!invoiceForm.value.period_start || !invoiceForm.value.due_date || !invoiceForm.value.amount) {
        saveError.value = 'Período, fecha límite y monto son requeridos'; isSaving.value = false; return;
      }
      await api.post(`/companies/${companyId.value}/invoices`, invoiceForm.value);
    } else {
      if (!paymentForm.value.amount || !paymentForm.value.invoice_id) {
        saveError.value = 'Recibo y monto son requeridos'; isSaving.value = false; return;
      }
      await api.post(`/companies/${companyId.value}/invoices/${paymentForm.value.invoice_id}/payment`, paymentForm.value);
    }
    showModal.value = false;
    triggerToast('Guardado', 'Registro creado correctamente.', 'success');
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveError.value = err?.response?.data?.error ?? 'Error al guardar';
  } finally {
    isSaving.value = false;
  }
}

async function changeCommercialStatus(status: string) {
  if (!confirm(`¿Cambiar el estado comercial a "${status}"?`)) return;
  try {
    await api.patch(`/companies/${companyId.value}/commercial-status`, { commercial_status: status });
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    alert(err?.response?.data?.error ?? 'Error');
  }
}

async function updateInvoiceStatus(invoice: Invoice, status: string) {
  try {
    await api.put(`/companies/${companyId.value}/invoices/${invoice.id}`, { status });
    invoice.status = status as Invoice['status'];
  } catch { /* silent */ }
}

const csColor = (s?: string) => {
  if (s === 'activa')         return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'pendiente_pago') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  if (s === 'suspendida')     return 'bg-orange-500/15 text-orange-300 border-orange-500/25';
  if (s === 'bloqueada')      return 'bg-red-500/15 text-red-300 border-red-500/25';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const invoiceStatusColor = (s: string) => {
  if (s === 'pagado')   return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'vencido')  return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (s === 'anulado')  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  if (s === 'pendiente') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  return 'bg-blue-500/15 text-blue-300 border-blue-500/25';
};

const invoiceStatusIcon = (s: string) => {
  if (s === 'pagado')  return CheckCircle;
  if (s === 'vencido') return XCircle;
  if (s === 'pendiente') return AlertTriangle;
  return Clock;
};

const fmtDate     = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL') : '—';
const fmtCurrency = (n: number, c = 'CLP') => new Intl.NumberFormat('es-CL', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
const freqLabel   = (f: string) => ({ monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' }[f] ?? f);
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <CreditCard class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Control Comercial</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Convenios de pago, recibos e historial de pagos</p>
        </div>
      </div>
      <button @click="loadData" class="flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition hover:bg-white/5"
        :style="{ borderColor: cardBorder, color: mutedColor }">
        <RefreshCw class="h-4 w-4" /> Actualizar
      </button>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <template v-else>
      <!-- Estado Comercial -->
      <div class="rounded-2xl border p-5" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide mb-1" :style="{ color: mutedColor }">Estado comercial</p>
            <div class="flex items-center gap-3">
              <span class="text-lg font-semibold" :style="{ color: headerColor }">{{ auth.currentCompany?.name }}</span>
              <span class="text-xs rounded-full px-3 py-1 border font-medium"
                :class="csColor(company?.commercial_status ?? auth.currentCompany?.commercial_status)">
                {{ (company?.commercial_status ?? auth.currentCompany?.commercial_status ?? 'activa').replace('_', ' ') }}
              </span>
            </div>
          </div>
          <div v-if="perms.canManageCommercial.value" class="flex flex-wrap gap-2">
            <button @click="changeCommercialStatus('activa')" class="text-xs rounded-2xl px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition">Activar</button>
            <button @click="changeCommercialStatus('suspendida')" class="text-xs rounded-2xl px-3 py-1.5 border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition">Suspender</button>
            <button @click="changeCommercialStatus('bloqueada')" class="text-xs rounded-2xl px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">Bloquear</button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="rounded-2xl border p-3" :style="{ borderColor: cardBorder, backgroundColor: rowHoverBg }">
            <p class="text-xs" :style="{ color: mutedColor }">Convenios activos</p>
            <p class="mt-1 text-xl font-bold" :style="{ color: headerColor }">{{ agreements.filter(a => a.status === 'activo').length }}</p>
          </div>
          <div class="rounded-2xl border p-3" :style="{ borderColor: cardBorder, backgroundColor: rowHoverBg }">
            <p class="text-xs" :style="{ color: mutedColor }">Recibos pendientes</p>
            <p class="mt-1 text-xl font-bold text-amber-300">{{ invoices.filter(i => ['emitido','pendiente'].includes(i.status)).length }}</p>
          </div>
          <div class="rounded-2xl border p-3" :style="{ borderColor: cardBorder, backgroundColor: rowHoverBg }">
            <p class="text-xs" :style="{ color: mutedColor }">Pagos registrados</p>
            <p class="mt-1 text-xl font-bold text-emerald-300">{{ payments.length }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b pb-0" :style="{ borderColor: cardBorder }">
        <button v-for="tab in [{ key: 'invoices', label: 'Recibos' }, { key: 'agreements', label: 'Convenios' }, { key: 'payments', label: 'Historial de Pagos' }]"
          :key="tab.key"
          @click="activeTab = (tab.key as 'agreements' | 'invoices' | 'payments')"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px"
          :style="{
            borderColor: activeTab === tab.key ? '#D4AF37' : 'transparent',
            color: activeTab === tab.key ? '#D4AF37' : mutedColor
          }">
          {{ tab.label }}
        </button>
      </div>

      <!-- TAB: Recibos -->
      <div v-if="activeTab === 'invoices'">
        <div class="flex justify-between items-center mb-3">
          <p class="text-sm font-medium" :style="{ color: headerColor }">{{ invoices.length }} recibo{{ invoices.length !== 1 ? 's' : '' }}</p>
          <button v-if="perms.canManageCommercial.value" @click="openInvoiceModal"
            class="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-medium text-white nxr-btn-primary">
            <Plus class="h-4 w-4" /> Nuevo recibo
          </button>
        </div>

        <div class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div v-if="invoices.length === 0" class="p-10 text-center text-sm" :style="{ color: mutedColor }">No hay recibos registrados.</div>
          <table v-else class="min-w-full text-sm">
            <thead class="border-b" :style="{ backgroundColor: rowHoverBg, borderColor: cardBorder }">
              <tr>
                <th class="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Período</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Emisión</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Vencimiento</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Monto</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Estado</th>
                <th v-if="perms.canManageCommercial.value" class="py-3 pl-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y" :style="{ borderColor: cardBorder }">
              <tr v-for="inv in invoices" :key="inv.id" class="transition-colors"
                @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
                @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                <td class="py-3 pl-5 pr-3 font-medium" :style="{ color: headerColor }">
                  {{ fmtDate(inv.period_start) }} – {{ fmtDate(inv.period_end) }}
                </td>
                <td class="px-3 py-3" :style="{ color: mutedColor }">{{ fmtDate(inv.issue_date) }}</td>
                <td class="px-3 py-3" :style="{ color: mutedColor }">{{ fmtDate(inv.due_date) }}</td>
                <td class="px-3 py-3 font-medium" :style="{ color: headerColor }">{{ fmtCurrency(inv.amount, inv.currency) }}</td>
                <td class="px-3 py-3">
                  <span class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border" :class="invoiceStatusColor(inv.status)">
                    <component :is="invoiceStatusIcon(inv.status)" class="h-3 w-3" />
                    {{ inv.status }}
                  </span>
                </td>
                <td v-if="perms.canManageCommercial.value" class="py-3 pl-3 pr-5 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button v-if="['emitido','pendiente'].includes(inv.status)" @click="openPaymentModal(inv.id)"
                      class="text-xs rounded-xl px-2.5 py-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition">
                      Registrar pago
                    </button>
                    <button v-if="inv.status !== 'pagado' && inv.status !== 'anulado'"
                      @click="updateInvoiceStatus(inv, 'anulado')"
                      class="text-xs rounded-xl px-2.5 py-1 border border-slate-500/20 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition">
                      Anular
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB: Convenios -->
      <div v-else-if="activeTab === 'agreements'">
        <div class="flex justify-between items-center mb-3">
          <p class="text-sm font-medium" :style="{ color: headerColor }">{{ agreements.length }} convenio{{ agreements.length !== 1 ? 's' : '' }}</p>
          <button v-if="perms.canManageCommercial.value" @click="openAgreementModal"
            class="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-medium text-white nxr-btn-primary">
            <Plus class="h-4 w-4" /> Nuevo convenio
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div v-if="agreements.length === 0" class="rounded-2xl border p-8 text-center text-sm col-span-2"
            :style="{ backgroundColor: cardBg, borderColor: cardBorder, color: mutedColor }">
            No hay convenios registrados.
          </div>
          <div v-for="ag in agreements" :key="ag.id" class="rounded-2xl border p-5"
            :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="font-semibold" :style="{ color: headerColor }">{{ fmtCurrency(ag.amount, ag.currency) }}</p>
                <p class="text-xs mt-0.5" :style="{ color: mutedColor }">{{ freqLabel(ag.frequency) }} · Día {{ ag.due_day }}</p>
              </div>
              <span class="text-xs rounded-full px-2 py-0.5 border" :class="ag.status === 'activo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                {{ ag.status }}
              </span>
            </div>
            <p class="text-sm" :style="{ color: mutedColor }">{{ ag.service_description }}</p>
            <p class="text-xs mt-2" :style="{ color: mutedColor }">Desde {{ fmtDate(ag.start_date) }} · Gracia {{ ag.grace_period_days }} días</p>
            <button v-if="perms.canManageCommercial.value && ag.status === 'activo'" @click="generateInvoice(ag.id)"
              :disabled="isGenerating"
              class="mt-3 flex items-center gap-1.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-300 px-3 py-1.5 text-xs font-medium hover:bg-blue-500/20 transition disabled:opacity-50">
              <FileText class="h-3.5 w-3.5" />
              {{ isGenerating ? 'Generando...' : 'Generar Recibo' }}
            </button>
          </div>
        </div>
      </div>

      <!-- TAB: Historial de Pagos -->
      <div v-else>
        <p class="text-sm font-medium mb-3" :style="{ color: headerColor }">{{ payments.length }} pago{{ payments.length !== 1 ? 's' : '' }} registrado{{ payments.length !== 1 ? 's' : '' }}</p>

        <div class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div v-if="payments.length === 0" class="p-10 text-center text-sm" :style="{ color: mutedColor }">No hay pagos registrados.</div>
          <table v-else class="min-w-full text-sm">
            <thead class="border-b" :style="{ backgroundColor: rowHoverBg, borderColor: cardBorder }">
              <tr>
                <th class="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Fecha pago</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Período</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Monto</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Método</th>
                <th class="py-3 pl-3 pr-5 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Referencia</th>
              </tr>
            </thead>
            <tbody class="divide-y" :style="{ borderColor: cardBorder }">
              <tr v-for="p in payments" :key="p.id" class="transition-colors"
                @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
                @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                <td class="py-3 pl-5 pr-3 font-medium" :style="{ color: headerColor }">{{ fmtDate(p.payment_date) }}</td>
                <td class="px-3 py-3" :style="{ color: mutedColor }">
                  {{ p.period_start ? `${fmtDate(p.period_start)} – ${fmtDate(p.period_end)}` : '—' }}
                </td>
                <td class="px-3 py-3 font-medium text-emerald-300">{{ fmtCurrency(p.amount, p.currency) }}</td>
                <td class="px-3 py-3" :style="{ color: mutedColor }">{{ p.payment_method || '—' }}</td>
                <td class="py-3 pl-3 pr-5" :style="{ color: mutedColor }">{{ p.reference || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal Genérico -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-lg rounded-3xl border shadow-2xl" :style="{ backgroundColor: modalBg, borderColor: cardBorder }">
          <div class="flex items-center justify-between border-b p-5" :style="{ borderColor: cardBorder }">
            <h2 class="text-base font-semibold" :style="{ color: headerColor }">
              {{ { agreement: 'Nuevo convenio de pago', invoice: 'Generar recibo', payment: 'Registrar pago' }[modalType] }}
            </h2>
            <button @click="showModal = false" class="rounded-xl p-1.5 hover:bg-white/10 transition">
              <X class="h-5 w-5" :style="{ color: mutedColor }" />
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <ShieldAlert class="h-4 w-4 shrink-0" /> {{ saveError }}
            </div>

            <!-- Convenio Form -->
            <template v-if="modalType === 'agreement'">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Monto *</label>
                  <input v-model="agreementForm.amount" type="number" placeholder="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Moneda</label>
                  <select v-model="agreementForm.currency" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option>CLP</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Frecuencia</label>
                  <select v-model="agreementForm.frequency" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Día límite de pago</label>
                  <input v-model.number="agreementForm.due_day" type="number" min="1" max="28" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Fecha de inicio *</label>
                  <input v-model="agreementForm.start_date" type="date" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Descripción del servicio *</label>
                  <textarea v-model="agreementForm.service_description" rows="2" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Días de gracia</label>
                  <input v-model.number="agreementForm.grace_period_days" type="number" min="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
              </div>
            </template>

            <!-- Invoice Form -->
            <template v-else-if="modalType === 'invoice'">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Período inicio *</label>
                  <input v-model="invoiceForm.period_start" type="date" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Período fin *</label>
                  <input v-model="invoiceForm.period_end" type="date" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Fecha límite de pago *</label>
                  <input v-model="invoiceForm.due_date" type="date" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Monto *</label>
                  <input v-model="invoiceForm.amount" type="number" placeholder="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Moneda</label>
                  <select v-model="invoiceForm.currency" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option>CLP</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
                <div v-if="agreements.length" class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Convenio asociado</label>
                  <select v-model="invoiceForm.agreement_id" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="">Sin convenio</option>
                    <option v-for="ag in agreements" :key="ag.id" :value="ag.id">
                      {{ fmtCurrency(ag.amount, ag.currency) }} · {{ freqLabel(ag.frequency) }}
                    </option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Notas</label>
                  <textarea v-model="invoiceForm.notes" rows="2" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
              </div>
            </template>

            <!-- Payment Form -->
            <template v-else>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Recibo *</label>
                  <select v-model="paymentForm.invoice_id" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="">Seleccionar recibo</option>
                    <option v-for="inv in invoices.filter(i => ['emitido','pendiente','vencido'].includes(i.status))" :key="inv.id" :value="inv.id">
                      {{ fmtDate(inv.period_start) }} – {{ fmtDate(inv.period_end) }} · {{ fmtCurrency(inv.amount, inv.currency) }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Monto *</label>
                  <input v-model="paymentForm.amount" type="number" placeholder="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Fecha de pago</label>
                  <input v-model="paymentForm.payment_date" type="date" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Método de pago</label>
                  <select v-model="paymentForm.payment_method" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Referencia / comprobante</label>
                  <input v-model="paymentForm.reference" placeholder="N° transferencia..." class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
              </div>
            </template>
          </div>

          <div class="flex justify-end gap-3 border-t p-5" :style="{ borderColor: cardBorder }">
            <button @click="showModal = false" class="rounded-2xl border px-4 py-2 text-sm hover:bg-white/5 transition"
              :style="{ borderColor: cardBorder, color: mutedColor }">Cancelar</button>
            <button @click="saveForm" :disabled="isSaving"
              class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
          <AppToast :toast="activeToast" @close="activeToast = null" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
