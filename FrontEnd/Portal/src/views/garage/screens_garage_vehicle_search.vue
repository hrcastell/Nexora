<script setup lang="ts">
import { ref } from 'vue';
import { Search, Car, User, ClipboardList } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { garageVehiclesService } from '../../services/garageVehiclesService';
import type { Vehicle } from '../../types/garage';

const router  = useRouter();
const q       = ref('');
const results = ref<Vehicle[]>([]);
const loading = ref(false);
const searched = ref(false);

let timer: ReturnType<typeof setTimeout> | null = null;

function onInput() {
  if (timer) clearTimeout(timer);
  if (!q.value.trim()) { results.value = []; searched.value = false; return; }
  timer = setTimeout(search, 400);
}

async function search() {
  loading.value = true; searched.value = true;
  try {
    const res = await garageVehiclesService.list({ q: q.value.trim(), limit: 20 });
    results.value = res.data.data;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
    <h1 class="text-xl font-semibold text-white">Búsqueda de Vehículos</h1>

    <div class="relative">
      <Search :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        v-model="q"
        type="text"
        placeholder="Buscar por placa, VIN, marca, modelo, cliente..."
        class="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-[var(--nexora-primary)] transition-colors"
        @input="onInput"
        @keyup.enter="search"
      />
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="searched && results.length === 0" class="text-center text-white/30 py-12 text-sm">
      Sin resultados para "{{ q }}"
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="v in results"
        :key="v.id"
        class="flex items-center gap-4 px-4 py-4 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/garage/vehicles/${v.id}`)"
      >
        <Car :size="22" class="text-white/20 shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-white">
            {{ (v as any).brand_name || '' }} {{ (v as any).model_name || '' }} {{ v.version || '' }}
          </p>
          <p class="text-xs text-white/50">{{ v.plate || 'Sin placa' }} · {{ v.year || '—' }}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <div class="flex items-center gap-1 text-xs text-white/40">
            <User :size="11" />
            <span>{{ (v as any).customer_name || 'Sin cliente' }}</span>
          </div>
          <button
            type="button"
            class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--nexora-primary)]/20 text-[var(--nexora-primary)] hover:bg-[var(--nexora-primary)]/30 transition-colors"
            @click.stop="router.push(`/garage/work-orders?vehicle_id=${v.id}`)"
          >
            <ClipboardList :size="10" /> Ver órdenes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
