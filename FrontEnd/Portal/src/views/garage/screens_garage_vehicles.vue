<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, Car, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-vue-next';
import { useGarageVehiclesStore } from '../../stores/garageVehicles';
import widgets_garage_vehicle_form_modal from '../../widgets/widgets_garage_vehicle_form_modal.vue';

const router   = useRouter();
const store    = useGarageVehiclesStore();
const q        = ref('');
const status   = ref('active');
const page     = ref(1);
const showForm = ref(false);

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

async function toggleStatus(id: number, current: string) {
  await store.toggleStatus(id, current === 'active' ? 'inactive' : 'active');
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Vehículos</h1>
      <button class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="showForm = true">
        <Plus :size="15" /> Nuevo vehículo
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="Buscar por placa, marca, modelo..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">No se encontraron vehículos.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="v in store.items"
        :key="v.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/garage/vehicles/${v.id}`)"
      >
        <Car :size="18" class="text-white/30 shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white">{{ (v as any).brand || '' }} {{ (v as any).model || '' }} {{ v.version || '' }}</p>
          <p class="text-xs text-white/40 truncate">{{ v.plate || 'Sin placa' }} · {{ v.year || '' }} · {{ (v as any).customer_name || '' }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="text-white/30 hover:text-white/70" @click.stop="toggleStatus(v.id, v.status)">
            <ToggleRight v-if="v.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" class="text-white/30" />
          </button>
          <ChevronRight :size="16" class="text-white/30" />
        </div>
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} vehículos en total</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <widgets_garage_vehicle_form_modal v-model="showForm" @saved="showForm = false; load()" />
  </div>
</template>
