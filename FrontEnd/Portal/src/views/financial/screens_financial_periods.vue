<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, ChevronRight, CalendarDays } from 'lucide-vue-next';
import { useFinancialPeriodsStore } from '../../stores/financialPeriods';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { FinancialPeriodFormData, PeriodStatus } from '../../types/financial';

const router = useRouter();
const store  = useFinancialPeriodsStore();

const showCreate = ref(false);
const saving     = ref(false);
const saveError  = ref<string | null>(null);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const now = new Date();
const form = ref<FinancialPeriodFormData>({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  initial_balance: 0,
});

const STATUS_LABEL: Record<PeriodStatus, string> = {
  open:     'Abierto',
  closed:   'Cerrado',
  archived: 'Archivado',
};

const STATUS_CLASS: Record<PeriodStatus, string> = {
  open:     'bg-green-500/20 text-green-400',
  closed:   'bg-white/10 text-white/40',
  archived: 'bg-white/5 text-white/25',
};

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

onMounted(() => store.load());

async function createPeriod() {
  saving.value = true;
  saveError.value = null;
  try {
    await store.create(form.value);
    showCreate.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al crear período';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Períodos Financieros</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="showCreate = true"
      >
        <Plus :size="15" /> Nuevo período
      </button>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">
      No hay períodos financieros creados.
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="p in store.items"
        :key="p.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/financial/periods/${p.id}`)"
      >
        <CalendarDays :size="20" class="text-white/30 shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white">{{ MONTHS[p.month - 1] }} {{ p.year }}</p>
          <p class="text-xs text-white/40">Saldo inicial: {{ fmt(p.initial_balance) }}</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0" :class="STATUS_CLASS[p.status]">
          {{ STATUS_LABEL[p.status] }}
        </span>
        <ChevronRight :size="16" class="text-white/30 shrink-0" />
      </div>
    </div>

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
