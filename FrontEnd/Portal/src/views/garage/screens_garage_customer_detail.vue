<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit, Car, User, Phone, Mail, MapPin, Calendar } from 'lucide-vue-next';
import { useGarageCustomersStore } from '../../stores/garageCustomers';
import { useGarageVehiclesStore } from '../../stores/garageVehicles';
import widgets_garage_customer_form_modal from '../../widgets/widgets_garage_customer_form_modal.vue';
import widgets_garage_vehicle_form_modal from '../../widgets/widgets_garage_vehicle_form_modal.vue';

const route  = useRoute();
const router = useRouter();
const custStore    = useGarageCustomersStore();
const vehicleStore = useGarageVehiclesStore();

const showEdit       = ref(false);
const showNewVehicle = ref(false);
const activeTab      = ref<'info' | 'vehicles'>('info');

const apiBase = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/api.*$/, '');
  }
})();

function customerPhotoSrc(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('blob:') || photoUrl.startsWith('http')) return photoUrl;
  return `${apiBase}${photoUrl}`;
}

onMounted(async () => {
  const id = parseInt(route.params.id as string);
  await custStore.loadOne(id);
  await vehicleStore.load({ customer_id: id, status: 'all', limit: 100 });
});

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-4xl mx-auto">
    <div class="flex items-center gap-3">
      <button class="text-white/40 hover:text-white" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1 class="text-xl font-semibold text-white flex-1">Detalle de Cliente</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 transition-colors" @click="showEdit = true">
        <Edit :size="14" /> Editar
      </button>
    </div>

    <div v-if="custStore.loading" class="h-48 rounded-2xl bg-white/5 animate-pulse"></div>

    <template v-else-if="custStore.current">
      <div class="flex items-start gap-5 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
          <img v-if="custStore.current.photo_url" :src="customerPhotoSrc(custStore.current.photo_url)" class="w-full h-full object-cover" @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }" />
          <User v-else :size="32" class="text-white/20" />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-white">{{ custStore.current.first_name }} {{ custStore.current.last_name || '' }}</h2>
          <p v-if="custStore.current.document_number" class="text-sm text-white/50">{{ custStore.current.document_type }}: {{ custStore.current.document_number }}</p>
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
            <span v-if="custStore.current.phone" class="flex items-center gap-1"><Phone :size="13" /> {{ custStore.current.phone }}</span>
            <span v-if="custStore.current.mobile" class="flex items-center gap-1"><Phone :size="13" /> {{ custStore.current.mobile }}</span>
            <span v-if="custStore.current.email" class="flex items-center gap-1"><Mail :size="13" /> {{ custStore.current.email }}</span>
            <span v-if="custStore.current.birth_date" class="flex items-center gap-1"><Calendar :size="13" /> {{ fmtDate(custStore.current.birth_date) }}</span>
          </div>
          <div v-if="custStore.current.address || custStore.current.city" class="flex items-center gap-1 mt-2 text-xs text-white/40">
            <MapPin :size="11" />
            <span>{{ [custStore.current.address, custStore.current.commune_district, custStore.current.city, custStore.current.country].filter(Boolean).join(', ') }}</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs" :class="custStore.current.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">
          {{ custStore.current.status === 'active' ? 'Activo' : 'Inactivo' }}
        </span>
      </div>

      <div class="flex gap-2">
        <button v-for="tab in ['info', 'vehicles']" :key="tab"
          class="px-4 py-2 rounded-xl text-sm transition-colors"
          :class="activeTab === tab ? 'bg-[var(--nexora-primary)] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'"
          @click="activeTab = tab as 'info' | 'vehicles'"
        >
          {{ tab === 'info' ? 'Información' : `Vehículos (${vehicleStore.items.length})` }}
        </button>
      </div>

      <div v-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="field in [
          { label: 'Fuente', value: custStore.current.source },
          { label: 'Notas', value: custStore.current.notes },
          { label: 'País', value: custStore.current.country },
          { label: 'Región', value: custStore.current.region_state },
          { label: 'Ciudad', value: custStore.current.city },
          { label: 'Dirección', value: custStore.current.address },
        ]" :key="field.label">
          <div v-if="field.value" class="p-4 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs text-white/40 mb-1">{{ field.label }}</p>
            <p class="text-sm text-white">{{ field.value }}</p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'vehicles'">
        <div class="flex justify-end mb-3">
          <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="showNewVehicle = true">
            <Car :size="14" /> Agregar vehículo
          </button>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="v in vehicleStore.items"
            :key="v.id"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 cursor-pointer transition-all"
            :style="{ background: 'var(--nexora-glass-bg)' }"
            @click="router.push(`/garage/vehicles/${v.id}`)"
          >
            <Car :size="18" class="text-white/40 shrink-0" />
            <div class="flex-1">
              <p class="text-sm text-white font-medium">{{ (v as any).brand || '' }} {{ (v as any).model || '' }} {{ v.version || '' }}</p>
              <p class="text-xs text-white/40">{{ v.plate || 'Sin placa' }} · {{ v.year || '' }}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="v.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">{{ v.status === 'active' ? 'Activo' : 'Inactivo' }}</span>
          </div>
          <div v-if="vehicleStore.items.length === 0" class="text-center text-white/30 py-8 text-sm">Sin vehículos registrados</div>
        </div>
      </div>
    </template>

    <widgets_garage_customer_form_modal v-model="showEdit" :customer="custStore.current" @saved="custStore.loadOne(parseInt(route.params.id as string))" />
    <widgets_garage_vehicle_form_modal v-model="showNewVehicle" :customer-id="custStore.current?.id" @saved="vehicleStore.load({ customer_id: custStore.current?.id, status: 'all', limit: 100 })" />
  </div>
</template>
