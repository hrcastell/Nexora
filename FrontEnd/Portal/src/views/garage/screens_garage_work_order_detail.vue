<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit, RefreshCw, ArrowRight, CreditCard } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useGarageWorkOrdersStore } from '../../stores/garageWorkOrders';
import widgets_garage_work_order_status_badge from '../../widgets/widgets_garage_work_order_status_badge.vue';
import widgets_garage_work_order_services_editor from '../../widgets/widgets_garage_work_order_services_editor.vue';
import widgets_garage_change_status_modal from '../../widgets/widgets_garage_change_status_modal.vue';
import widgets_garage_work_order_form_modal from '../../widgets/widgets_garage_work_order_form_modal.vue';
import widgets_garage_vehicle_photo_gallery from '../../widgets/widgets_garage_vehicle_photo_gallery.vue';
import type { WorkOrderStatus, VehiclePhoto } from '../../types/garage';

const route  = useRoute();
const router = useRouter();
const store  = useGarageWorkOrdersStore();

const showStatusModal = ref(false);
const showEdit        = ref(false);
const activeTab       = ref<'services' | 'photos' | 'info' | 'history'>('services');
const recalcLoading   = ref(false);
const photos          = ref<VehiclePhoto[]>([]);
const photosLoaded    = ref(false);

async function loadPhotos() {
  if (!store.current) return;
  const res = await api.get(`/garage/work-orders/${store.current.id}/photos`);
  photos.value = res.data;
  photosLoaded.value = true;
}

async function onPhotoUpload(file: File, stage: 'entry' | 'delivery') {
  if (!store.current) return;
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('stage', stage);
  await api.post(`/garage/work-orders/${store.current.id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  await loadPhotos();
}

async function onPhotoDelete(photoId: number) {
  if (!store.current) return;
  await api.delete(`/garage/work-orders/${store.current.id}/photos/${photoId}`);
  photos.value = photos.value.filter(p => p.id !== photoId);
}

onMounted(async () => {
  const id = parseInt(route.params.id as string);
  await store.loadOne(id);
});

async function onRecalculate() {
  recalcLoading.value = true;
  try {
    await store.recalculate(parseInt(route.params.id as string));
  } finally {
    recalcLoading.value = false;
  }
}

async function reload() {
  await store.loadOne(parseInt(route.params.id as string));
}

const fmt     = (n: number) => `$${Math.round(n ?? 0).toLocaleString()}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-white/10 text-white/40', normal: 'bg-white/10 text-white/60',
  high: 'bg-orange-500/20 text-orange-300', urgent: 'bg-red-500/20 text-red-300'
};
const PRIORITY_LABEL: Record<string, string> = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-5xl mx-auto">
    <div class="flex items-center gap-3">
      <button class="text-white/40 hover:text-white" @click="router.back()"><ArrowLeft :size="20" /></button>
      <h1 class="text-xl font-semibold text-white flex-1">Orden de Trabajo</h1>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 transition-colors" @click="showEdit = true">
          <Edit :size="14" /> Editar
        </button>
        <button
          v-if="store.current"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
          @click="router.push(`/garage/work-orders/${store.current.id}/payments`)"
        >
          <CreditCard :size="14" /> Cobros
        </button>
        <button
          v-if="store.current && !['delivered','cancelled'].includes(store.current.status)"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
          @click="showStatusModal = true"
        >
          <ArrowRight :size="14" /> Cambiar estado
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="h-36 rounded-2xl bg-white/5 animate-pulse"></div>

    <template v-else-if="store.current">
      <div class="p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <span class="text-lg font-bold text-white font-mono">{{ store.current.order_number }}</span>
              <widgets_garage_work_order_status_badge :status="store.current.status" />
              <span class="text-xs px-2 py-0.5 rounded-full" :class="PRIORITY_COLOR[store.current.priority]">
                {{ PRIORITY_LABEL[store.current.priority] }}
              </span>
            </div>
            <p class="text-sm text-white/60">
              {{ store.current.customer_name || '—' }} ·
              {{ store.current.plate || 'Sin placa' }}
              {{ (store.current as any).brand ? `· ${(store.current as any).brand} ${(store.current as any).model || ''}` : '' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-white">{{ fmt(store.current.total_amount) }}</p>
            <p class="text-xs text-white/40">
              MO: {{ fmt(store.current.subtotal_labor) }} + Rep: {{ fmt(store.current.subtotal_products) }}
            </p>
            <button class="mt-1 flex items-center gap-1 text-xs text-white/30 hover:text-white/60 ml-auto" :disabled="recalcLoading" @click="onRecalculate">
              <RefreshCw :size="11" :class="recalcLoading ? 'animate-spin' : ''" /> Recalcular
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/50">
          <div><span class="text-white/30">Ingreso:</span> {{ fmtDate(store.current.entry_date) }}</div>
          <div><span class="text-white/30">Entrega est.:</span> {{ fmtDate(store.current.estimated_delivery_date) }}</div>
          <div v-if="store.current.mileage_in"><span class="text-white/30">Km ingreso:</span> {{ store.current.mileage_in?.toLocaleString() }}</div>
          <div v-if="store.current.fuel_level"><span class="text-white/30">Combustible:</span> {{ store.current.fuel_level }}</div>
          <div v-if="store.current.employee_name"><span class="text-white/30">Responsable:</span> {{ store.current.employee_name }}</div>
        </div>

        <div v-if="store.current.reported_issue" class="mt-3 p-3 rounded-xl bg-white/5 text-xs text-white/60">
          <span class="text-white/30">Problema: </span>{{ store.current.reported_issue }}
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button
          v-for="tab in ['services','photos','info','history']" :key="tab"
          class="px-4 py-2 rounded-xl text-sm transition-colors"
          :class="activeTab === tab ? 'bg-[var(--nexora-primary)] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'"
          @click="activeTab = tab as 'services' | 'photos' | 'info' | 'history'; if(tab==='photos' && !photosLoaded) loadPhotos()"
        >
          {{ tab === 'services' ? `Servicios (${store.current.services?.length ?? 0})` : tab === 'photos' ? `Fotos (${photos.length})` : tab === 'info' ? 'Información' : 'Historial' }}
        </button>
      </div>

      <div v-if="activeTab === 'services'">
        <widgets_garage_work_order_services_editor
          :order-id="store.current.id"
          :services="store.current.services ?? []"
          :disabled="['delivered','cancelled'].includes(store.current.status)"
          :currency="store.current.currency"
          @updated="reload"
        />
      </div>

      <div v-if="activeTab === 'photos'" class="p-4 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
        <widgets_garage_vehicle_photo_gallery
          :vehicle-id="store.current.vehicle_id"
          :photos="photos"
          :disabled="['delivered','cancelled'].includes(store.current.status)"
          :max-photos="20"
          @upload="onPhotoUpload"
          @delete="onPhotoDelete"
        />
      </div>

      <div v-if="activeTab === 'info'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="field in [
          { label: 'Notas de recepción', value: store.current.reception_notes },
          { label: 'Estado del vehículo', value: store.current.vehicle_condition_notes },
          { label: 'Diagnóstico', value: store.current.diagnosis },
          { label: 'Notas internas', value: store.current.internal_notes },
          { label: 'Notas para el cliente', value: store.current.customer_notes },
        ]" :key="field.label">
          <div v-if="field.value" class="p-4 rounded-xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p class="text-xs text-white/40 mb-1">{{ field.label }}</p>
            <p class="text-sm text-white whitespace-pre-wrap">{{ field.value }}</p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="flex flex-col gap-2">
        <div
          v-for="h in store.current.history ?? []"
          :key="h.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 text-sm"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="flex-1">
            <p class="text-white/60">
              <span class="text-white/30">{{ h.previous_status || '—' }}</span>
              <ArrowRight :size="12" class="inline mx-1 text-white/30" />
              <span class="text-white font-medium">{{ h.new_status }}</span>
            </p>
            <p v-if="h.notes" class="text-xs text-white/40 mt-1">{{ h.notes }}</p>
          </div>
          <span class="text-xs text-white/30 shrink-0">{{ new Date(h.created_at).toLocaleString('es-CL') }}</span>
        </div>
        <div v-if="!store.current.history?.length" class="text-center text-white/30 py-6 text-sm">Sin historial de estado</div>
      </div>
    </template>

    <widgets_garage_change_status_modal
      v-if="store.current"
      v-model="showStatusModal"
      :order-id="store.current.id"
      :current-status="store.current.status as WorkOrderStatus"
      @changed="reload"
    />
    <widgets_garage_work_order_form_modal v-model="showEdit" :work-order="store.current" @saved="reload" />
  </div>
</template>
