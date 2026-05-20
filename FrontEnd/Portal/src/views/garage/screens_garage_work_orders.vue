<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, ChevronRight, Car } from 'lucide-vue-next';
import { useGarageWorkOrdersStore } from '../../stores/garageWorkOrders';
import widgets_garage_work_order_form_modal from '../../widgets/widgets_garage_work_order_form_modal.vue';
import widgets_garage_work_order_status_badge from '../../widgets/widgets_garage_work_order_status_badge.vue';
const router   = useRouter();
const store    = useGarageWorkOrdersStore();
const q        = ref('');
const status   = ref('');

function photoSrc(url: string) {
  try { const base = new URL(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').origin; return url.startsWith('http') ? url : `${base}${url}`; }
  catch { return url; }
}
const page     = ref(1);
const showForm = ref(false);

async function load() {
  await store.load({ q: q.value || undefined, status: status.value || undefined, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAmt  = (n: number) => `$${Math.round(n ?? 0).toLocaleString()}`;

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-white/30', normal: 'text-white/50', high: 'text-orange-400', urgent: 'text-red-400'
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Órdenes de Trabajo</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="showForm = true">
        <Plus :size="15" /> Nueva orden
      </button>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex-1 relative min-w-48">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="N° orden, cliente, placa..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="received">Recibida</option>
        <option value="diagnosis">Diagnóstico</option>
        <option value="approved">Aprobada</option>
        <option value="in_progress">En proceso</option>
        <option value="waiting_parts">Esp. repuestos</option>
        <option value="completed">Completada</option>
        <option value="delivered">Entregada</option>
        <option value="cancelled">Cancelada</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-18 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">No se encontraron órdenes de trabajo.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="wo in store.items"
        :key="wo.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/garage/work-orders/${wo.id}`)"
      >
        <div class="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
          <img v-if="(wo as any).first_photo_url" :src="photoSrc((wo as any).first_photo_url)" class="w-full h-full object-cover" @error="(e) => (e.target as HTMLImageElement).style.display='none'" />
          <Car v-else :size="20" class="text-white/20" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-semibold text-white font-mono">{{ wo.order_number }}</span>
            <widgets_garage_work_order_status_badge :status="wo.status" :small="true" />
            <span class="text-xs" :class="PRIORITY_COLOR[wo.priority]">{{ wo.priority }}</span>
          </div>
          <p class="text-xs text-white/50 truncate">
            {{ wo.customer_name || '—' }} · {{ wo.plate || 'Sin placa' }} · {{ (wo as any).vehicle_desc || '' }}
          </p>
          <p class="text-xs text-white/30 mt-0.5">Ingreso: {{ fmtDate(wo.entry_date) }}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-semibold text-white">{{ fmtAmt(wo.total_amount) }}</p>
          <p class="text-xs text-white/30">{{ wo.currency }}</p>
        </div>
        <ChevronRight :size="16" class="text-white/30 shrink-0" />
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} órdenes en total</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <widgets_garage_work_order_form_modal v-model="showForm" @saved="wo => { showForm = false; router.push(`/garage/work-orders/${wo.id}`) }" />
  </div>
</template>
