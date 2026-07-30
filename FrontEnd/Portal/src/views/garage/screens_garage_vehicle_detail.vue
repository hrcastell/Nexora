<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit, Car } from 'lucide-vue-next';
import { useGarageVehiclesStore } from '../../stores/garageVehicles';
import { garageVehicleHistoryService } from '../../services/garageVehicleHistoryService';
import widgets_garage_vehicle_form_modal from '../../widgets/widgets_garage_vehicle_form_modal.vue';
import widgets_garage_vehicle_photo_gallery from '../../widgets/widgets_garage_vehicle_photo_gallery.vue';
import widgets_garage_vehicle_history_timeline from '../../widgets/widgets_garage_vehicle_history_timeline.vue';
import type { VehicleHistory } from '../../types/garage';

const route  = useRoute();
const router = useRouter();
const store  = useGarageVehiclesStore();

const showEdit  = ref(false);
const activeTab = ref<'info' | 'photos' | 'history'>('info');
const history   = ref<VehicleHistory | null>(null);
const histLoading = ref(false);

onMounted(async () => {
  const id = parseInt(route.params.id as string);
  await store.loadOne(id);
  await store.loadPhotos(id);
});

async function loadHistory() {
  if (history.value) return;
  const id = parseInt(route.params.id as string);
  histLoading.value = true;
  try {
    const res = await garageVehicleHistoryService.getByVehicle(id);
    history.value = res.data;
  } finally {
    histLoading.value = false;
  }
}

async function onTabChange(tab: 'info' | 'photos' | 'history') {
  activeTab.value = tab;
  if (tab === 'history') await loadHistory();
}

async function onPhotoUpload(file: File, stage: 'entry' | 'delivery') {
  const id = parseInt(route.params.id as string);
  await store.uploadPhoto(id, file, stage);
}

async function onPhotoDelete(photoId: number) {
  const id = parseInt(route.params.id as string);
  await store.deletePhoto(id, photoId);
}

const fmtKm = (n: number | null) => n != null ? `${n.toLocaleString()} km` : '—';
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-4xl mx-auto">
    <div class="flex items-center gap-3">
      <button class="nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1 class="text-xl font-semibold nxr-text flex-1">Detalle del Vehículo</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/10 nxr-text hover:bg-white/20" @click="showEdit = true">
        <Edit :size="14" /> Editar
      </button>
    </div>

    <div v-if="store.loading" class="h-36 rounded-2xl bg-white/5 animate-pulse"></div>

    <template v-else-if="store.current">
      <div class="flex items-center gap-4 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <Car :size="40" class="nxr-text-soft shrink-0" />
        <div class="flex-1">
          <h2 class="text-lg font-semibold nxr-text">
            {{ (store.current as any).brand_name || '' }} {{ (store.current as any).model_name || '' }} {{ store.current.version || '' }}
          </h2>
          <p class="text-sm nxr-text-muted">
            {{ store.current.plate || 'Sin placa' }} · {{ store.current.year || '—' }} · {{ (store.current as any).customer_name || '' }}
          </p>
          <div class="flex flex-wrap gap-3 mt-2 text-xs nxr-text-muted">
            <span v-if="store.current.engine_displacement">Motor: {{ store.current.engine_displacement }}</span>
            <span v-if="store.current.mileage">Km: {{ fmtKm(store.current.mileage) }}</span>
            <span v-if="(store.current as any).fuel_type_name">{{ (store.current as any).fuel_type_name }}</span>
            <span v-if="(store.current as any).transmission_name">{{ (store.current as any).transmission_name }}</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs shrink-0" :class="store.current.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">
          {{ store.current.status === 'active' ? 'Activo' : 'Inactivo' }}
        </span>
      </div>

      <div class="flex gap-2">
        <button v-for="tab in ['info', 'photos', 'history']" :key="tab"
          class="px-4 py-2 rounded-xl text-sm transition-colors"
          :class="activeTab === tab ? 'bg-[var(--nexora-primary)] text-white' : 'bg-white/5 nxr-tab-inactive hover:bg-white/10'"
          @click="onTabChange(tab as 'info' | 'photos' | 'history')"
        >
          {{ tab === 'info' ? 'Información' : tab === 'photos' ? `Fotos (${store.photos.length})` : 'Historial' }}
        </button>
      </div>

      <div v-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="field in [
          { label: 'VIN / Chasis', value: store.current.vin },
          { label: 'N° Motor', value: store.current.engine_number },
          { label: 'Color', value: (store.current as any).color_name },
          { label: 'Carrocería', value: (store.current as any).body_type_name },
          { label: 'Notas', value: store.current.notes },
        ]" :key="field.label">
          <div v-if="field.value" class="p-4 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs nxr-text-muted mb-1">{{ field.label }}</p>
            <p class="text-sm nxr-text">{{ field.value }}</p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'photos'" class="p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <widgets_garage_vehicle_photo_gallery
          :vehicle-id="store.current.id"
          :photos="store.photos"
          @upload="onPhotoUpload"
          @delete="onPhotoDelete"
        />
      </div>

      <div v-if="activeTab === 'history'">
        <div v-if="histLoading" class="h-32 rounded-xl bg-white/5 animate-pulse"></div>
        <div v-else-if="history">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div class="p-4 rounded-xl border border-white/10 text-center" :style="{ background: 'var(--nexora-glass-bg)' }">
              <p class="text-xl font-bold nxr-text">{{ history.summary.total_orders }}</p>
              <p class="text-xs nxr-text-muted">Órdenes total</p>
            </div>
            <div class="p-4 rounded-xl border border-white/10 text-center" :style="{ background: 'var(--nexora-glass-bg)' }">
              <p class="text-xl font-bold nxr-text">{{ history.summary.last_mileage?.toLocaleString() || '—' }}</p>
              <p class="text-xs nxr-text-muted">Último km</p>
            </div>
            <div class="p-4 rounded-xl border border-white/10 text-center" :style="{ background: 'var(--nexora-glass-bg)' }">
              <p class="text-xl font-bold nxr-text">${{ Math.round(history.summary.total_spent || 0).toLocaleString() }}</p>
              <p class="text-xs nxr-text-muted">Total invertido</p>
            </div>
          </div>
          <widgets_garage_vehicle_history_timeline :orders="history.orders" />
        </div>
      </div>
    </template>

    <widgets_garage_vehicle_form_modal v-model="showEdit" :vehicle="store.current" @saved="store.loadOne(parseInt(route.params.id as string))" />
  </div>
</template>
