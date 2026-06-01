<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, BarChart2, AlertTriangle, Plus, ArrowRight, CreditCard } from 'lucide-vue-next';
import { useFinancialPeriodsStore } from '../../stores/financialPeriods';
import { useFinancialSummaryStore } from '../../stores/financialSummary';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { FinancialPeriodFormData } from '../../types/financial';

const router        = useRouter();
const periodsStore  = useFinancialPeriodsStore();
const summaryStore  = useFinancialSummaryStore();

const showCreate  = ref(false);
const saving      = ref(false);
const saveError   = ref<string | null>(null);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const now = new Date();
const form = ref<FinancialPeriodFormData>({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  initial_balance: 0,
});

const period  = computed(() => periodsStore.current);
const summary = computed(() => summaryStore.summary?.summary ?? null);

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function pct(n: number) {
  return `${Math.round((n ?? 0) * 100) / 100}%`;
}

onMounted(async () => {
  await periodsStore.loadCurrent();
  if (periodsStore.current) {
    await Promise.all([
      summaryStore.loadSummary(periodsStore.current.id),
      summaryStore.loadDeviations(periodsStore.current.id),
    ]);
  }
});

async function createPeriod() {
  saving.value = true;
  saveError.value = null;
  try {
    const p = await periodsStore.create(form.value);
    showCreate.value = false;
    periodsStore.current = p;
    await Promise.all([
      summaryStore.loadSummary(p.id),
      summaryStore.loadDeviations(p.id),
    ]);
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al crear período';
  } finally {
    saving.value = false;
  }
}

const BUDGET_STATUS_COLOR: Record<string, string> = {
  over_budget:  'text-red-400',
  under_budget: 'text-yellow-400',
  on_track:     'text-green-400',
  no_plan:      'text-white/30',
};
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Finanzas Personales</h1>
      <button
        v-if="period"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:border-white/30 hover:text-white transition-all"
        @click="router.push(`/financial/periods/${period.id}`)"
      >
        Ver detalle <ArrowRight :size="14" />
      </button>
    </div>

    <div v-if="periodsStore.loading" class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-24 rounded-2xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- No period yet -->
    <div
      v-else-if="!period"
      class="flex flex-col items-center justify-center gap-4 py-20 text-center"
    >
      <Wallet :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No hay un período financiero activo para este mes.</p>
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="showCreate = true"
      >
        <Plus :size="15" /> Crear período
      </button>
    </div>

    <!-- Period exists -->
    <template v-else>
      <div class="flex items-center gap-3">
        <div class="px-3 py-1.5 rounded-xl text-xs font-semibold" :style="{ background: 'var(--nexora-glass-bg)' }" style="border: 1px solid rgba(255,255,255,0.1)">
          <span class="text-white/50">Período:</span>
          <span class="text-white ml-1">{{ MONTHS[period.month - 1] }} {{ period.year }}</span>
        </div>
        <span
          class="px-2.5 py-1 rounded-full text-xs font-semibold"
          :class="period.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'"
        >
          {{ period.status === 'open' ? 'Abierto' : period.status === 'closed' ? 'Cerrado' : 'Archivado' }}
        </span>
      </div>

      <div v-if="summary" class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <TrendingUp :size="20" class="text-green-400" />
          <p class="text-2xl font-bold text-white">{{ fmt(summary.real_income) }}</p>
          <p class="text-xs text-white/50">Ingresos reales</p>
          <p class="text-xs text-white/30">Planeado: {{ fmt(summary.planned_income) }}</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <TrendingDown :size="20" class="text-red-400" />
          <p class="text-2xl font-bold text-white">{{ fmt(summary.real_expenses) }}</p>
          <p class="text-xs text-white/50">Gastos reales</p>
          <p class="text-xs text-white/30">Planeado: {{ fmt(summary.planned_expenses) }}</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <PiggyBank :size="20" class="text-blue-400" />
          <p class="text-2xl font-bold text-white">{{ fmt(summary.real_savings) }}</p>
          <p class="text-xs text-white/50">Ahorro real</p>
          <p class="text-xs text-white/30">Tasa: {{ pct(summary.savings_rate) }}</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <Wallet :size="20" class="text-cyan-400" />
          <p class="text-2xl font-bold text-white">{{ fmt(summary.final_balance) }}</p>
          <p class="text-xs text-white/50">Saldo final</p>
          <p class="text-xs text-white/30">
            Flujo neto: {{ fmt(summary.net_cashflow) }}
            <template v-if="period.initial_balance > 0"> · Inicial: {{ fmt(period.initial_balance) }}</template>
          </p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <BarChart2 :size="20" class="text-purple-400" />
          <p class="text-2xl font-bold text-white">{{ pct(summary.expense_execution_rate) }}</p>
          <p class="text-xs text-white/50">Ejecución de gastos</p>
          <p class="text-xs text-white/30">Gasto real vs presupuestado</p>
        </div>
      </div>

      <!-- Debt summary card -->
      <div
        v-if="(summaryStore.summary?.debt_summary?.debts?.length ?? 0) > 0"
        class="col-span-2 md:col-span-3 flex flex-col gap-3 p-5 rounded-2xl border border-white/10"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="flex items-center gap-2">
          <CreditCard :size="18" class="text-orange-400" />
          <p class="text-sm font-semibold text-white">Deudas</p>
        </div>
        <p class="text-2xl font-bold text-white">{{ fmt(summaryStore.summary?.debt_summary?.total_estimated_debt ?? 0) }}</p>
        <p class="text-xs text-white/50">Deuda total estimada pendiente</p>
        <div class="flex flex-col gap-2 mt-1">
          <div
            v-for="d in summaryStore.summary?.debt_summary?.debts"
            :key="d.category_id"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-white/70">{{ d.category_name }}</span>
            <div class="flex items-center gap-3 text-right">
              <span v-if="d.total_installments" class="text-white/40">
                Cuota {{ d.current_installment ?? '?' }}/{{ d.total_installments }}
              </span>
              <span class="text-orange-300 font-semibold">
                {{ d.estimated_remaining !== null ? fmt(d.estimated_remaining) : fmt(d.planned_amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Deviations -->
      <div v-if="summaryStore.deviations.length > 0" class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <AlertTriangle :size="16" class="text-red-400" />
          <h2 class="text-sm font-semibold text-white">Categorías con desvío</h2>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="d in summaryStore.deviations.slice(0, 5)"
            :key="d.category_id"
            class="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div>
              <p class="text-sm text-white">{{ d.category_name }}</p>
              <p class="text-xs text-white/40">Planeado: {{ fmt(d.planned_amount) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold" :class="BUDGET_STATUS_COLOR[d.status]">{{ fmt(d.real_amount) }}</p>
              <p class="text-xs text-red-400">+{{ fmt(Math.abs(d.difference)) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create period panel -->
    <NxrSlidePanel :open="showCreate" title="Nuevo período" eyebrow="Finanzas" @close="showCreate = false">
      <form class="flex flex-col gap-5" @submit.prevent="createPeriod">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Año</label>
          <input v-model.number="form.year" type="number" min="2020" max="2099" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Mes</label>
          <select v-model.number="form.month" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Saldo inicial</label>
          <input v-model.number="form.initial_balance" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showCreate = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="createPeriod">
          {{ saving ? 'Creando...' : 'Crear período' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
