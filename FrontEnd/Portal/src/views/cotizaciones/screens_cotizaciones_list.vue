<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import { useCotizacionesStore } from '../../stores/cotizaciones';
import { QUOTE_STATUS_LABEL } from '../../types/cotizaciones';

const router = useRouter();
const store = useCotizacionesStore();
const statusFilter = ref('');

async function load() {
  await store.load({ status: statusFilter.value || undefined });
}

onMounted(load);
watch(statusFilter, load);

function fmtMoney(value: number | string | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-';
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'draft': return 'bg-white/10 nxr-text-muted';
    case 'sent': return 'bg-blue-500/15 text-blue-300';
    case 'accepted': return 'bg-emerald-500/15 text-emerald-300';
    case 'rejected': return 'bg-red-500/15 text-red-300';
    case 'expired': return 'bg-amber-500/15 text-amber-300';
    case 'paid': return 'bg-violet-500/15 text-violet-300';
    case 'converted': return 'bg-cyan-500/15 text-cyan-300';
    default: return 'bg-white/10 nxr-text-muted';
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col gap-5 p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold nxr-text">Cotizaciones</h1>
        <p class="text-xs nxr-text-muted">Cotizaciones a clientes con líneas de stock o tercerizadas.</p>
      </div>
      <button class="nxr-btn nxr-btn-primary justify-center" @click="router.push('/cotizaciones/new')">
        <Plus :size="15" /> Nueva cotización
      </button>
    </div>

    <select v-model="statusFilter" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text outline-none sm:w-56">
      <option value="">Todos los estados</option>
      <option v-for="(label, code) in QUOTE_STATUS_LABEL" :key="code" :value="code">{{ label }}</option>
    </select>

    <div v-if="store.loading" class="space-y-2">
      <div v-for="i in 6" :key="i" class="h-16 animate-pulse rounded-xl bg-white/5"></div>
    </div>
    <div v-else-if="store.items.length === 0" class="py-16 text-center text-sm nxr-text-soft">Sin cotizaciones.</div>
    <div v-else class="flex flex-col gap-2">
      <button
        v-for="quote in store.items"
        :key="quote.id"
        class="rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/cotizaciones/${quote.id}`)"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold nxr-text">{{ quote.quote_number }}</p>
            <p class="text-xs nxr-text-muted">{{ quote.customer_name?.trim() || 'Sin cliente' }} · {{ fmtDate(quote.created_at) }}</p>
          </div>
          <div class="flex items-center gap-3 sm:justify-end">
            <p class="text-sm font-semibold nxr-text">{{ fmtMoney(quote.final_amount) }}</p>
            <span :class="['rounded-full px-2.5 py-1 text-xs font-medium', statusBadgeClass(quote.status)]">
              {{ QUOTE_STATUS_LABEL[quote.status] || quote.status }}
            </span>
          </div>
        </div>
      </button>
    </div>

    <p v-if="store.error" class="text-xs text-red-400">{{ store.error }}</p>
  </div>
</template>
