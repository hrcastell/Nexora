<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Lock, TrendingUp, TrendingDown, PiggyBank, Wallet, Pencil, Trash2 } from 'lucide-vue-next';
import { useFinancialPeriodsStore } from '../../stores/financialPeriods';
import { useFinancialSummaryStore } from '../../stores/financialSummary';
import { useFinancialBudgetPlansStore } from '../../stores/financialBudgetPlans';
import { useFinancialTransactionsStore } from '../../stores/financialTransactions';
import { useFinancialCategoriesStore } from '../../stores/financialCategories';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { BudgetPlanFormData, FinancialTransactionFormData, TransactionType, CategoryType } from '../../types/financial';

const route  = useRoute();
const router = useRouter();

const periodsStore      = useFinancialPeriodsStore();
const summaryStore      = useFinancialSummaryStore();
const budgetStore       = useFinancialBudgetPlansStore();
const txStore           = useFinancialTransactionsStore();
const categoriesStore   = useFinancialCategoriesStore();

const periodId  = computed(() => Number(route.params.periodId));
const activeTab = ref<'summary' | 'budget' | 'transactions'>('summary');

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Budget plan panel ──
const showBudgetPanel = ref(false);
const budgetSaving    = ref(false);
const budgetError     = ref<string | null>(null);
const editingBudget   = ref<number | null>(null);
const budgetForm      = ref<BudgetPlanFormData>({ category_id: 0, planned_amount: 0, notes: null, current_installment: null });

// ── Transaction panel ──
const showTxPanel  = ref(false);
const txSaving     = ref(false);
const txError      = ref<string | null>(null);
const editingTx    = ref<number | null>(null);
const txFilter     = ref<TransactionType | ''>('');
const txForm       = ref<FinancialTransactionFormData>({
  category_id: 0,
  type: 'expense',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: null,
  payment_method: null,
  source: null,
});

const TYPE_LABEL: Record<TransactionType | CategoryType, string> = {
  income:   'Ingreso',
  expense:  'Gasto',
  saving:   'Ahorro',
  debt:     'Deuda',
  transfer: 'Transferencia',
};

const TYPE_CLASS: Record<TransactionType | CategoryType, string> = {
  income:   'bg-green-500/20 text-green-400',
  expense:  'bg-red-500/20 text-red-400',
  saving:   'bg-blue-500/20 text-blue-400',
  debt:     'bg-orange-500/20 text-orange-400',
  transfer: 'bg-purple-500/20 text-purple-400',
};

const BUDGET_STATUS_CLASS: Record<string, string> = {
  over_budget:  'text-red-400',
  under_budget: 'text-yellow-400',
  on_track:     'text-green-400',
  no_plan:      'text-white/30',
};

const BUDGET_STATUS_LABEL: Record<string, string> = {
  over_budget:  'Excedido',
  under_budget: 'Bajo presupuesto',
  on_track:     'En presupuesto',
  no_plan:      'Sin plan',
};

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function pct(n: number) {
  return `${Math.round((n ?? 0) * 100) / 100}%`;
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

const period    = computed(() => periodsStore.current);
const summary   = computed(() => summaryStore.summary?.summary ?? null);
const breakdown = computed(() => summaryStore.breakdown);

const filteredCategories = computed(() =>
  categoriesStore.items.filter(c => c.is_active)
);

async function boot() {
  await Promise.all([
    periodsStore.loadOne(periodId.value),
    categoriesStore.load(),
  ]);
  await summaryStore.loadSummary(periodId.value);
}

onMounted(boot);

watch(activeTab, async (tab) => {
  if (tab === 'summary') {
    await Promise.all([
      summaryStore.loadSummary(periodId.value),
      summaryStore.loadBreakdown(periodId.value),
    ]);
  }
  if (tab === 'budget') {
    await budgetStore.loadByPeriod(periodId.value);
  }
  if (tab === 'transactions') {
    await txStore.loadByPeriod(periodId.value);
  }
});

// ── Budget actions ──
const selectedBudgetCategory = computed(() =>
  categoriesStore.items.find(c => c.id === budgetForm.value.category_id) ?? null
);

function openCreateBudget() {
  editingBudget.value = null;
  budgetForm.value = { category_id: 0, planned_amount: 0, notes: null, current_installment: null };
  budgetError.value = null;
  showBudgetPanel.value = true;
}

function openEditBudget(plan: any) {
  editingBudget.value = plan.id;
  budgetForm.value = {
    category_id: plan.category_id,
    planned_amount: plan.planned_amount,
    notes: plan.notes,
    current_installment: plan.current_installment ?? null,
  };
  budgetError.value = null;
  showBudgetPanel.value = true;
}

async function saveBudget() {
  budgetSaving.value = true;
  budgetError.value = null;
  try {
    if (editingBudget.value) {
      await budgetStore.update(editingBudget.value, budgetForm.value);
    } else {
      await budgetStore.create(periodId.value, budgetForm.value);
    }
    showBudgetPanel.value = false;
  } catch (e: any) {
    budgetError.value = e?.response?.data?.error || 'Error al guardar plan';
  } finally {
    budgetSaving.value = false;
  }
}

async function removeBudget(id: number) {
  if (!confirm('¿Eliminar este plan de presupuesto?')) return;
  await budgetStore.remove(id);
}

// ── Transaction actions ──
function openCreateTx() {
  editingTx.value = null;
  txForm.value = {
    category_id: 0,
    type: 'expense',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: null,
    payment_method: null,
    source: null,
  };
  txError.value = null;
  showTxPanel.value = true;
}

function openEditTx(tx: any) {
  editingTx.value = tx.id;
  txForm.value = {
    category_id: tx.category_id,
    type: tx.type,
    amount: tx.amount,
    date: tx.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    description: tx.description,
    payment_method: tx.payment_method,
    source: tx.source,
  };
  txError.value = null;
  showTxPanel.value = true;
}

async function saveTx() {
  txSaving.value = true;
  txError.value = null;
  try {
    if (editingTx.value) {
      await txStore.update(editingTx.value, txForm.value);
    } else {
      await txStore.create(periodId.value, txForm.value);
    }
    showTxPanel.value = false;
  } catch (e: any) {
    txError.value = e?.response?.data?.error || 'Error al guardar transacción';
  } finally {
    txSaving.value = false;
  }
}

async function removeTx(id: number) {
  if (!confirm('¿Eliminar esta transacción?')) return;
  await txStore.remove(id);
}

async function loadFilteredTx() {
  await txStore.loadByPeriod(periodId.value, { type: txFilter.value || undefined });
}

watch(txFilter, loadFilteredTx);

async function closePeriod() {
  if (!confirm('¿Cerrar este período? Esta acción no se puede deshacer.')) return;
  try {
    await periodsStore.closePeriod(periodId.value);
  } catch {
    // period store sets error
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button class="text-xs text-white/40 hover:text-white/70 mb-1 transition-colors" @click="router.push('/financial/periods')">
          ← Períodos
        </button>
        <h1 class="text-xl font-semibold text-white">
          {{ period ? `${MONTHS[period.month - 1]} ${period.year}` : 'Cargando...' }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="period"
          class="px-2.5 py-1 rounded-full text-xs font-semibold"
          :class="period.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'"
        >
          {{ period.status === 'open' ? 'Abierto' : period.status === 'closed' ? 'Cerrado' : 'Archivado' }}
        </span>
        <button
          v-if="period?.status === 'open'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
          @click="closePeriod"
        >
          <Lock :size="13" /> Cerrar período
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="periodsStore.loading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <template v-else-if="period">
      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-xl bg-white/5 self-start">
        <button
          v-for="tab in ['summary', 'budget', 'transactions'] as const"
          :key="tab"
          class="px-4 py-1.5 rounded-lg text-sm transition-all"
          :class="activeTab === tab ? 'bg-white/15 text-white font-semibold' : 'text-white/50 hover:text-white/80'"
          @click="activeTab = tab"
        >
          {{ tab === 'summary' ? 'Resumen' : tab === 'budget' ? 'Presupuesto' : 'Transacciones' }}
        </button>
      </div>

      <!-- SUMMARY TAB -->
      <div v-if="activeTab === 'summary'" class="flex flex-col gap-4">
        <div v-if="summaryStore.loading" class="flex flex-col gap-2">
          <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-white/5 animate-pulse"></div>
        </div>
        <template v-else-if="summary">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
              <TrendingUp :size="18" class="text-green-400" />
              <p class="text-xl font-bold text-white">{{ fmt(summary.real_income) }}</p>
              <p class="text-xs text-white/50">Ingresos reales</p>
              <p class="text-xs text-white/30">Plan: {{ fmt(summary.planned_income) }}</p>
            </div>
            <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
              <TrendingDown :size="18" class="text-red-400" />
              <p class="text-xl font-bold text-white">{{ fmt(summary.real_expenses) }}</p>
              <p class="text-xs text-white/50">Gastos reales</p>
              <p class="text-xs text-white/30">Plan: {{ fmt(summary.planned_expenses) }}</p>
            </div>
            <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
              <PiggyBank :size="18" class="text-blue-400" />
              <p class="text-xl font-bold text-white">{{ fmt(summary.real_savings) }}</p>
              <p class="text-xs text-white/50">Ahorro</p>
              <p class="text-xs text-white/30">Tasa: {{ pct(summary.savings_rate) }}</p>
            </div>
            <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
              <Wallet :size="18" class="text-cyan-400" />
              <p class="text-xl font-bold text-white">{{ fmt(summary.final_balance) }}</p>
              <p class="text-xs text-white/50">Saldo final</p>
            </div>
          </div>

          <!-- Breakdown table -->
          <div v-if="breakdown.length > 0" class="flex flex-col gap-2">
            <h2 class="text-sm font-semibold text-white/70">Desglose por categoría</h2>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="row in breakdown"
                :key="row.category_id"
                class="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10"
                :style="{ background: 'var(--nexora-glass-bg)' }"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="px-2 py-0.5 rounded-full text-xs" :class="TYPE_CLASS[row.category_type]">
                    {{ TYPE_LABEL[row.category_type] }}
                  </span>
                  <p class="text-sm text-white truncate">{{ row.category_name }}</p>
                </div>
                <div class="flex items-center gap-4 shrink-0 text-right">
                  <div class="hidden md:block">
                    <p class="text-xs text-white/30">Plan</p>
                    <p class="text-xs text-white">{{ fmt(row.planned_amount) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-white/30">Real</p>
                    <p class="text-sm font-semibold text-white">{{ fmt(row.real_amount) }}</p>
                  </div>
                  <span class="text-xs" :class="BUDGET_STATUS_CLASS[row.status]">
                    {{ BUDGET_STATUS_LABEL[row.status] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- BUDGET TAB -->
      <div v-else-if="activeTab === 'budget'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-white/50">Planes de presupuesto</p>
          <button
            v-if="period.status === 'open'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
            @click="openCreateBudget"
          >
            <Plus :size="13" /> Agregar plan
          </button>
        </div>

        <div v-if="budgetStore.loading" class="flex flex-col gap-2">
          <div v-for="i in 5" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
        </div>
        <div v-else-if="budgetStore.items.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay planes de presupuesto para este período.
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <div
            v-for="plan in budgetStore.items"
            :key="plan.id"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ plan.category_name || `Categoría #${plan.category_id}` }}</p>
              <p v-if="plan.notes" class="text-xs text-white/30 truncate">{{ plan.notes }}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <p class="text-sm font-semibold text-white">{{ fmt(plan.planned_amount) }}</p>
              <span v-if="plan.current_installment" class="text-xs text-orange-400/70">C{{ plan.current_installment }}</span>
              <button v-if="period.status === 'open'" class="text-white/30 hover:text-white/70 transition-colors" @click="openEditBudget(plan)">
                <Pencil :size="14" />
              </button>
              <button v-if="period.status === 'open'" class="text-white/30 hover:text-red-400 transition-colors" @click="removeBudget(plan.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TRANSACTIONS TAB -->
      <div v-else-if="activeTab === 'transactions'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <select v-model="txFilter" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option value="">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
            <option value="saving">Ahorros</option>
            <option value="debt">Deudas</option>
            <option value="transfer">Transferencias</option>
          </select>
          <button
            v-if="period.status === 'open'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
            @click="openCreateTx"
          >
            <Plus :size="13" /> Agregar transacción
          </button>
        </div>

        <div v-if="txStore.loading" class="flex flex-col gap-2">
          <div v-for="i in 6" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
        </div>
        <div v-else-if="txStore.items.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay transacciones para este período.
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <div
            v-for="tx in txStore.items"
            :key="tx.id"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="TYPE_CLASS[tx.type]">
              {{ TYPE_LABEL[tx.type] }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ tx.category_name || `Cat. #${tx.category_id}` }}</p>
              <p class="text-xs text-white/30">{{ fmtDate(tx.date) }}{{ tx.description ? ` · ${tx.description}` : '' }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <p class="text-sm font-semibold text-white">{{ fmt(tx.amount) }}</p>
              <button v-if="period.status === 'open'" class="text-white/30 hover:text-white/70 transition-colors" @click="openEditTx(tx)">
                <Pencil :size="14" />
              </button>
              <button v-if="period.status === 'open'" class="text-white/30 hover:text-red-400 transition-colors" @click="removeTx(tx.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Budget plan panel -->
    <NxrSlidePanel :open="showBudgetPanel" :title="editingBudget ? 'Editar plan' : 'Nuevo plan'" eyebrow="Finanzas" @close="showBudgetPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="saveBudget">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Categoría</label>
          <select v-model.number="budgetForm.category_id" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" required>
            <option value="0" disabled>Seleccionar categoría</option>
            <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto planeado</label>
          <input v-model.number="budgetForm.planned_amount" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas (opcional)</label>
          <input v-model="budgetForm.notes" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div v-if="selectedBudgetCategory?.type === 'debt'" class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">
            Cuota actual (N° de esta cuota)
            <span v-if="selectedBudgetCategory.total_installments" class="text-white/30 ml-1">
              de {{ selectedBudgetCategory.total_installments }} cuotas
            </span>
          </label>
          <input
            v-model.number="budgetForm.current_installment"
            type="number"
            min="1"
            :max="selectedBudgetCategory.total_installments ?? undefined"
            placeholder="Ej: 8"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
          <p class="text-xs text-white/30">
            Ej: si vas en la cuota 8 de 24, ingresá 8
          </p>
        </div>
        <p v-if="budgetError" class="text-xs text-red-400">{{ budgetError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showBudgetPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="budgetSaving" @click="saveBudget">
          {{ budgetSaving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Transaction panel -->
    <NxrSlidePanel :open="showTxPanel" :title="editingTx ? 'Editar transacción' : 'Nueva transacción'" eyebrow="Finanzas" @close="showTxPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="saveTx">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Tipo</label>
          <select v-model="txForm.type" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" required>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="saving">Ahorro</option>
            <option value="debt">Deuda</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Categoría</label>
          <select v-model.number="txForm.category_id" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" required>
            <option value="0" disabled>Seleccionar categoría</option>
            <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto</label>
          <input v-model.number="txForm.amount" type="number" min="1" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha</label>
          <input v-model="txForm.date" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Descripción (opcional)</label>
          <input v-model="txForm.description" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Medio de pago (opcional)</label>
          <input v-model="txForm.payment_method" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <p v-if="txError" class="text-xs text-red-400">{{ txError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showTxPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="txSaving" @click="saveTx">
          {{ txSaving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
