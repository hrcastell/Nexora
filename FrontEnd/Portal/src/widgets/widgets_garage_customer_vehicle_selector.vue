<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, Car, User } from 'lucide-vue-next';
import { garageCustomersService } from '../services/garageCustomersService';
import { garageVehiclesService } from '../services/garageVehiclesService';
import type { CustomerListItem, Vehicle } from '../types/garage';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

defineProps<{
  customerId: number | null;
  vehicleId: number | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:customerId', val: number | null): void;
  (e: 'update:vehicleId', val: number | null): void;
}>();

const customerQuery    = ref('');
const customerResults  = ref<CustomerListItem[]>([]);
const customerOpen     = ref(false);
const selectedCustomer = ref<CustomerListItem | null>(null);

const vehicleResults   = ref<Vehicle[]>([]);
const vehicleOpen      = ref(false);
const selectedVehicle  = ref<Vehicle | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function searchCustomers(q: string) {
  if (!q.trim()) { customerResults.value = []; return; }
  const res = await garageCustomersService.list({ q, limit: 8 });
  customerResults.value = res.data.data;
}

function onCustomerInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchCustomers(customerQuery.value), 300);
}

async function selectCustomer(c: CustomerListItem) {
  selectedCustomer.value = c;
  customerQuery.value    = `${c.first_name} ${c.last_name || ''}`.trim();
  customerOpen.value     = false;
  emit('update:customerId', c.id);

  selectedVehicle.value  = null;
  emit('update:vehicleId', null);
  const res = await garageVehiclesService.listByCustomer(c.id);
  vehicleResults.value = res.data;
}

function selectVehicle(v: Vehicle) {
  selectedVehicle.value = v;
  vehicleOpen.value     = false;
  emit('update:vehicleId', v.id);
}

function clearCustomer() {
  selectedCustomer.value = null;
  customerQuery.value    = '';
  customerResults.value  = [];
  vehicleResults.value   = [];
  selectedVehicle.value  = null;
  emit('update:customerId', null);
  emit('update:vehicleId', null);
}

const vehicleLabel = computed(() => {
  if (!selectedVehicle.value) return null;
  const v = selectedVehicle.value;
  return `${v.plate || ''} — ${(v as any).brand || ''} ${(v as any).model || ''}`.trim();
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <label class="block text-xs text-white/50 mb-1">Cliente</label>
      <div class="relative">
        <div class="relative flex items-center">
          <User :size="14" class="absolute left-3 text-white/30" />
          <input
            v-model="customerQuery"
            type="text"
            :disabled="disabled"
            class="w-full pl-8 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 transition-colors"
            placeholder="Buscar cliente..."
            @input="onCustomerInput"
            @focus="customerOpen = true"
          />
          <button v-if="selectedCustomer" type="button" class="absolute right-2 text-white/30 hover:text-white/60" @click="clearCustomer">✕</button>
        </div>

        <div
          v-if="customerOpen && customerResults.length > 0"
          class="absolute z-30 w-full mt-1 rounded-xl border border-white/20 overflow-hidden shadow-xl"
          :style="{ background: 'var(--nexora-glass-bg-strong, #0b1326)' }"
        >
          <div
            v-for="c in customerResults"
            :key="c.id"
            class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
            @click="selectCustomer(c)"
          >
            <div class="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              <img v-if="c.photo_url" :src="`${BASE_URL}${c.photo_url}`" class="w-full h-full object-cover" />
              <User v-else :size="14" class="text-white/30" />
            </div>
            <div>
              <p class="text-sm text-white">{{ c.first_name }} {{ c.last_name || '' }}</p>
              <p class="text-xs text-white/40">{{ c.email || c.phone || '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedCustomer && vehicleResults.length > 0">
      <label class="block text-xs text-white/50 mb-1">Vehículo</label>
      <div class="relative">
        <button
          type="button"
          :disabled="disabled"
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm transition-all hover:border-white/30"
          :class="vehicleOpen ? 'border-[var(--nexora-primary)]' : ''"
          @click="vehicleOpen = !vehicleOpen"
        >
          <div class="flex items-center gap-2">
            <Car :size="14" class="text-white/30" />
            <span :class="selectedVehicle ? 'text-white' : 'text-white/40'">{{ vehicleLabel || 'Seleccionar vehículo...' }}</span>
          </div>
          <ChevronDown :size="14" class="text-white/40" :class="vehicleOpen ? 'rotate-180' : ''" />
        </button>

        <div
          v-if="vehicleOpen"
          class="absolute z-30 w-full mt-1 rounded-xl border border-white/20 overflow-hidden shadow-xl"
          :style="{ background: 'var(--nexora-glass-bg-strong, #0b1326)' }"
        >
          <div
            v-for="v in vehicleResults"
            :key="v.id"
            class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
            @click="selectVehicle(v)"
          >
            <Car :size="14" class="text-white/40" />
            <div>
              <p class="text-sm text-white">{{ v.plate || 'Sin placa' }} — {{ (v as any).brand || '' }} {{ (v as any).model || '' }}</p>
              <p class="text-xs text-white/40">{{ v.year || '' }} {{ (v as any).vehicle_type || '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedCustomer && vehicleResults.length === 0" class="text-xs text-white/40 italic">
      Este cliente no tiene vehículos registrados.
    </div>
  </div>
</template>
