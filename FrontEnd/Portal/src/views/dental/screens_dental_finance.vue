<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DollarSign, TrendingUp, Clock, AlertTriangle, CreditCard, Plus } from 'lucide-vue-next';
import { useDentalChargesStore } from '../../stores/dentalCharges';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { DentalCharge } from '../../types/dental';

const store = useDentalChargesStore();

const showChargeDetail = ref(false);
const showPaymentPanel = ref(false);
const showInstallmentPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);
const statusFilter = ref('');

const paymentForm = ref({
  amount: 0,
  payment_method: 'cash',
  payment_date: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
});

const installmentForm = ref({
  installments_count: 3,
  first_due_date: new Date().toISOString().slice(0, 10),
});

const CHARGE_STATUS_LABEL: Record<string, string> = {
  pending:        'Pendiente',
  partially_paid: 'Pago parcial',
  paid:           'Pagado',
  overdue:        'Vencido',
  cancelled:      'Cancelado',
  refunded:       'Reembolsado',
};

const CHARGE_STATUS_CLASS: Record<string, string> = {
  pending:        'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
  refunded:       'bg-purple-500/20 text-purple-400',
};

const INSTALLMENT_STATUS_CLASS: Record<string, string> = {
  pending:        'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
};

const PM_LABEL: Record<string, string> = {
  cash:           'Efectivo',
  card:           'Tarjeta',
  bank_transfer:  'Transferencia',
  mobile_payment: 'Pago móvil',
  insurance:      'Obra social',
  other:          'Otro',
};

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function applyFilter() {
  store.load({ status: statusFilter.value || undefined });
}

async function openCharge(c: DentalCharge) {
  await store.loadOne(c.id);
  showChargeDetail.value = true;
}

function openPayment() {
  paymentForm.value = {
    amount: store.current?.pending_amount ?? 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  };
  saveError.value = null;
  showPaymentPanel.value = true;
}

function openInstallment() {
  installmentForm.value = {
    installments_count: 3,
    first_due_date: new Date().toISOString().slice(0, 10),
  };
  saveError.value = null;
  showInstallmentPanel.value = true;
}

async function savePayment() {
  if (!store.current) return;
  saving.value = true;
  saveError.value = null;
  try {
    await store.registerPayment(store.current.id, paymentForm.value);
    showPaymentPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al registrar pago';
  } finally {
    saving.value = false;
  }
}

async function saveInstallments() {
  if (!store.current) return;
  saving.value = true;
  saveError.value = null;
  try {
    await store.createInstallmentPlan(store.current.id, installmentForm.value);
    showInstallmentPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al crear plan de cuotas';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    store.load(),
    store.loadFinanceSummary(),
  ]);
});
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <h1 class="text-xl font-semibold text-white">Finanzas Dental</h1>

    <!-- Loading skeleton -->
    <div v-if="store.loading && !store.items.length" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Summary cards -->
    <div v-else-if="store.financeSummary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <DollarSign :size="20" class="text-green-400" />
        <p class="text-2xl font-bold text-white">{{ fmt(store.financeSummary.daily_total) }}</p>
        <p class="text-xs text-white/50">Cobrado hoy</p>
      </div>
      <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <TrendingUp :size="20" class="text-purple-400" />
        <p class="text-2xl font-bold text-white">{{ fmt(store.financeSummary.monthly_total) }}</p>
        <p class="text-xs text-white/50">Cobrado este mes</p>
      </div>
      <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <Clock :size="20" class="text-yellow-400" />
        <p class="text-2xl font-bold text-white">{{ fmt(store.financeSummary.total_pending) }}</p>
        <p class="text-xs text-white/50">Total pendiente</p>
      </div>
      <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <AlertTriangle :size="20" class="text-red-400" />
        <p class="text-2xl font-bold text-white">{{ store.financeSummary.overdue_count }}</p>
        <p class="text-xs text-white/50">Cargos vencidos</p>
      </div>
    </div>

    <!-- Charges section -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <CreditCard :size="16" class="text-blue-400" />
          <h2 class="text-sm font-semibold text-white">Cargos</h2>
        </div>
        <select v-model="statusFilter" class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" @change="applyFilter">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="partially_paid">Pago parcial</option>
          <option value="paid">Pagado</option>
          <option value="overdue">Vencido</option>
        </select>
      </div>

      <div v-if="store.loading && store.items.length === 0" class="flex flex-col gap-2">
        <div v-for="i in 5" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
      </div>

      <div v-else-if="store.error" class="text-center text-red-400 py-8 text-sm">{{ store.error }}</div>

      <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-12 text-sm">
        No hay cargos para mostrar.
      </div>

      <div v-else class="flex flex-col gap-2">
        <!-- Desktop header -->
        <div class="hidden md:grid md:grid-cols-[120px_1fr_120px_120px_120px_80px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
          <span>Fecha</span>
          <span>Descripción</span>
          <span class="text-right">Total</span>
          <span class="text-right">Pagado</span>
          <span class="text-right">Pendiente</span>
          <span class="text-center">Estado</span>
        </div>

        <div
          v-for="c in store.items"
          :key="c.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          @click="openCharge(c)"
        >
          <!-- Mobile -->
          <div class="flex-1 min-w-0 md:hidden">
            <p class="text-sm text-white truncate">{{ c.description ?? 'Cargo' }}</p>
            <p class="text-xs text-white/40">{{ fmtDate(c.created_at) }} · Pendiente: {{ fmt(c.pending_amount) }}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs shrink-0 md:hidden" :class="CHARGE_STATUS_CLASS[c.status]">{{ CHARGE_STATUS_LABEL[c.status] }}</span>

          <!-- Desktop -->
          <div class="hidden md:grid md:grid-cols-[120px_1fr_120px_120px_120px_80px] gap-4 items-center flex-1">
            <p class="text-xs text-white/60">{{ fmtDate(c.created_at) }}</p>
            <p class="text-sm text-white truncate">{{ c.description ?? 'Cargo' }}</p>
            <p class="text-sm font-semibold text-white text-right">{{ fmt(c.total_amount) }}</p>
            <p class="text-sm text-green-400 text-right">{{ fmt(c.paid_amount) }}</p>
            <p class="text-sm text-yellow-400 text-right">{{ fmt(c.pending_amount) }}</p>
            <span class="px-2 py-0.5 rounded-full text-xs w-fit mx-auto" :class="CHARGE_STATUS_CLASS[c.status]">{{ CHARGE_STATUS_LABEL[c.status] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charge detail panel -->
    <NxrSlidePanel :open="showChargeDetail" title="Detalle del cargo" eyebrow="Dental — Finanzas" @close="showChargeDetail = false">
      <div v-if="!store.current" class="text-center text-white/30 py-10 text-sm">Cargando...</div>
      <div v-else class="flex flex-col gap-4">
        <!-- Status + amounts -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1 p-3 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs text-white/40">Total</p>
            <p class="text-sm font-bold text-white">{{ fmt(store.current.total_amount) }}</p>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs text-white/40">Pagado</p>
            <p class="text-sm font-bold text-green-400">{{ fmt(store.current.paid_amount) }}</p>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs text-white/40">Pendiente</p>
            <p class="text-sm font-bold text-yellow-400">{{ fmt(store.current.pending_amount) }}</p>
          </div>
        </div>

        <span class="px-3 py-1 rounded-full text-xs w-fit font-semibold" :class="CHARGE_STATUS_CLASS[store.current.status]">
          {{ CHARGE_STATUS_LABEL[store.current.status] }}
        </span>

        <!-- Payments -->
        <div v-if="(store.current.payments?.length ?? 0) > 0" class="flex flex-col gap-2">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Pagos registrados</p>
          <div v-for="pay in store.current.payments" :key="pay.id" class="flex items-center justify-between px-3 py-2 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <div>
              <p class="text-sm text-white">{{ fmt(pay.amount) }}</p>
              <p class="text-xs text-white/40">{{ PM_LABEL[pay.payment_method] ?? pay.payment_method }} · {{ fmtDate(pay.payment_date) }}</p>
            </div>
            <p v-if="pay.reference" class="text-xs text-white/30">{{ pay.reference }}</p>
          </div>
        </div>

        <!-- Installments -->
        <div v-if="(store.current.installments?.length ?? 0) > 0" class="flex flex-col gap-2">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Plan de cuotas</p>
          <div v-for="inst in store.current.installments" :key="inst.id" class="flex items-center justify-between px-3 py-2 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <div>
              <p class="text-sm text-white">Cuota {{ inst.installment_number }}</p>
              <p class="text-xs text-white/40">Vence: {{ fmtDate(inst.due_date) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-white">{{ fmt(inst.amount) }}</p>
              <span class="px-2 py-0.5 rounded-full text-xs" :class="INSTALLMENT_STATUS_CLASS[inst.status]">{{ inst.status }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            v-if="store.current.status !== 'paid' && store.current.status !== 'cancelled'"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
            @click="showChargeDetail = false; openPayment()"
          >
            <DollarSign :size="13" /> Registrar pago
          </button>
          <button
            v-if="(store.current.installments?.length ?? 0) === 0 && store.current.status !== 'paid' && store.current.status !== 'cancelled'"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
            @click="showChargeDetail = false; openInstallment()"
          >
            <Plus :size="13" /> Crear plan de cuotas
          </button>
        </div>
      </div>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showChargeDetail = false">Cerrar</button>
      </template>
    </NxrSlidePanel>

    <!-- Register payment panel -->
    <NxrSlidePanel :open="showPaymentPanel" title="Registrar pago" eyebrow="Dental — Finanzas" @close="showPaymentPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="savePayment">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto *</label>
          <input v-model.number="paymentForm.amount" type="number" min="0.01" step="0.01" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Método de pago *</label>
          <select v-model="paymentForm.payment_method" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="bank_transfer">Transferencia</option>
            <option value="mobile_payment">Pago móvil</option>
            <option value="insurance">Obra social</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha *</label>
          <input v-model="paymentForm.payment_date" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Referencia</label>
          <input v-model="paymentForm.reference" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" placeholder="Nro. comprobante, etc." />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <textarea v-model="paymentForm.notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPaymentPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="savePayment">
          {{ saving ? 'Guardando...' : 'Registrar pago' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Create installment plan panel -->
    <NxrSlidePanel :open="showInstallmentPanel" title="Plan de cuotas" eyebrow="Dental — Finanzas" @close="showInstallmentPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="saveInstallments">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Cantidad de cuotas *</label>
          <input v-model.number="installmentForm.installments_count" type="number" min="2" max="60" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha primer vencimiento *</label>
          <input v-model="installmentForm.first_due_date" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showInstallmentPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="saveInstallments">
          {{ saving ? 'Creando...' : 'Crear plan' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
