<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Trash2, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-vue-next';
import api from '../../utils/axios';

const route  = useRoute();
const router = useRouter();

const orderId  = computed(() => parseInt(route.params.id as string));
const loading  = ref(false);
const saving   = ref(false);
const error    = ref('');
const showForm = ref(false);

interface Payment {
  id: number;
  work_order_id: number;
  amount: number;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  payment_date: string;
  registered_by: number | null;
  created_at: string;
}

interface PaymentSummary {
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_status: string;
  currency: string;
}

const payments = ref<Payment[]>([]);
const summary  = ref<PaymentSummary>({ total_amount: 0, amount_paid: 0, amount_pending: 0, payment_status: 'pending', currency: 'CLP' });

const form = ref({
  amount: 0,
  currency: 'CLP',
  payment_method: 'efectivo',
  reference: '',
  notes: '',
  payment_date: new Date().toISOString().split('T')[0],
});

async function load() {
  loading.value = true;
  error.value   = '';
  try {
    const res = await api.get(`/garage/work-orders/${orderId.value}/payments`);
    payments.value = res.data.payments ?? [];
    summary.value  = res.data.summary ?? summary.value;
    form.value.currency = summary.value.currency || 'CLP';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cargar pagos';
  } finally {
    loading.value = false;
  }
}

async function registerPayment() {
  if (!form.value.amount || form.value.amount <= 0) { error.value = 'El monto debe ser mayor a 0'; return; }
  saving.value = true; error.value = '';
  try {
    await api.post(`/garage/work-orders/${orderId.value}/payments`, form.value);
    form.value = { amount: 0, currency: summary.value.currency, payment_method: 'efectivo', reference: '', notes: '', payment_date: new Date().toISOString().split('T')[0] };
    showForm.value = false;
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al registrar pago';
  } finally {
    saving.value = false;
  }
}

async function deletePayment(id: number) {
  if (!confirm('¿Eliminar este pago?')) return;
  try {
    await api.delete(`/garage/work-orders/${orderId.value}/payments/${id}`);
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar pago';
  }
}

onMounted(load);

const fmt = (n: number, currency = 'CLP') => currency === 'USD' ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString()}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const pctPaid = computed(() => {
  if (!summary.value.total_amount) return 0;
  return Math.min(100, Math.round((summary.value.amount_paid / summary.value.total_amount) * 100));
});

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro'
};

const statusConfig = computed(() => {
  const s = summary.value.payment_status;
  if (s === 'paid')    return { label: 'Pagado',          icon: CheckCircle,    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' };
  if (s === 'partial') return { label: 'Pago parcial',    icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  return               { label: 'Pendiente de pago',      icon: Clock,          color: 'text-white/40',   bg: 'bg-white/5 border-white/10' };
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-3">
      <button class="text-white/40 hover:text-white" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1 class="text-xl font-semibold text-white flex-1">Cobros y Pagos</h1>
      <button
        v-if="summary.payment_status !== 'paid'"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="showForm = !showForm"
      >
        <Plus :size="14" /> Registrar pago
      </button>
    </div>

    <div v-if="loading" class="h-36 rounded-2xl bg-white/5 animate-pulse"></div>

    <template v-else>
      <!-- Summary card -->
      <div class="p-5 rounded-2xl border" :class="statusConfig.bg">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-xs text-white/40 mb-1">Orden #{{ orderId }}</p>
            <div class="flex items-center gap-2">
              <component :is="statusConfig.icon" :size="16" :class="statusConfig.color" />
              <span class="text-sm font-semibold" :class="statusConfig.color">{{ statusConfig.label }}</span>
            </div>
          </div>
          <CreditCard :size="24" class="text-white/20" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p class="text-xs text-white/40 mb-1">Total orden</p>
            <p class="text-lg font-bold text-white">{{ fmt(summary.total_amount, summary.currency) }}</p>
          </div>
          <div>
            <p class="text-xs text-white/40 mb-1">Pagado</p>
            <p class="text-lg font-bold text-green-400">{{ fmt(summary.amount_paid, summary.currency) }}</p>
          </div>
          <div>
            <p class="text-xs text-white/40 mb-1">Pendiente</p>
            <p class="text-lg font-bold" :class="summary.amount_pending > 0 ? 'text-yellow-400' : 'text-white/30'">
              {{ fmt(summary.amount_pending, summary.currency) }}
            </p>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="pctPaid >= 100 ? 'bg-green-400' : 'bg-[var(--nexora-primary)]'"
            :style="{ width: `${pctPaid}%` }"
          ></div>
        </div>
        <p class="text-right text-xs text-white/30 mt-1">{{ pctPaid }}% pagado</p>
      </div>

      <!-- New payment form -->
      <div v-if="showForm" class="p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <h3 class="text-sm font-semibold text-white mb-4">Registrar nuevo pago</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-white/50 mb-1">Monto *</label>
            <input
              v-model.number="form.amount"
              type="number"
              min="0.01"
              step="0.01"
              :placeholder="`Máx: ${fmt(summary.amount_pending, summary.currency)}`"
              class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Método de pago</label>
            <select v-model="form.payment_method" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Fecha</label>
            <input v-model="form.payment_date" type="date" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Referencia / Folio</label>
            <input v-model="form.reference" type="text" placeholder="Nro. de transacción, folio..." class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-white/50 mb-1">Notas</label>
            <input v-model="form.notes" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
          </div>
        </div>
        <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white" @click="showForm = false">Cancelar</button>
          <button
            type="button"
            class="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50"
            :disabled="saving"
            @click="registerPayment"
          >
            {{ saving ? 'Guardando...' : 'Registrar pago' }}
          </button>
        </div>
      </div>

      <!-- Payments list -->
      <div>
        <p class="text-xs text-white/40 mb-3">{{ payments.length }} pago{{ payments.length !== 1 ? 's' : '' }} registrado{{ payments.length !== 1 ? 's' : '' }}</p>

        <div v-if="payments.length === 0" class="text-center text-white/30 py-12 text-sm rounded-xl border border-dashed border-white/10">
          Sin pagos registrados para esta orden.
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="p in payments"
            :key="p.id"
            class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
              <CreditCard :size="16" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-green-400">{{ fmt(p.amount, p.currency) }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{{ METHOD_LABELS[p.payment_method ?? 'otro'] ?? p.payment_method }}</span>
              </div>
              <p class="text-xs text-white/40">
                {{ fmtDate(p.payment_date) }}
                <span v-if="p.reference"> · Ref: {{ p.reference }}</span>
                <span v-if="p.notes"> · {{ p.notes }}</span>
              </p>
            </div>
            <button type="button" class="text-red-400/40 hover:text-red-400 transition-colors shrink-0" @click="deletePayment(p.id)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <p v-if="error && !showForm" class="text-xs text-red-400">{{ error }}</p>
    </template>
  </div>
</template>
