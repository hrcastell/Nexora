<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, ChevronRight, ArrowRight } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../../stores/garageAppointments';
import widgets_garage_appointment_form_modal from '../../widgets/widgets_garage_appointment_form_modal.vue';
import widgets_garage_appointment_status_badge from '../../widgets/widgets_garage_appointment_status_badge.vue';
import widgets_garage_convert_appointment_modal from '../../widgets/widgets_garage_convert_appointment_modal.vue';
import type { Appointment } from '../../types/garage';

const router    = useRouter();
const store     = useGarageAppointmentsStore();
const status    = ref('');
const dateFrom  = ref(new Date().toISOString().split('T')[0]);
const showForm  = ref(false);
const editing   = ref<Appointment | null>(null);
const converting = ref<Appointment | null>(null);
const page      = ref(1);

async function load() {
  await store.load({ status: status.value || undefined, date_from: dateFrom.value || undefined, page: page.value, limit: 50 });
}

onMounted(load);
watch([status, dateFrom], () => { page.value = 1; load(); });

function openCreate()                  { editing.value = null; showForm.value = true; }
function openEdit(a: Appointment)      { editing.value = a; showForm.value = true; }
function openConvert(a: Appointment)   { converting.value = a; }

const showConvertModal = computed({
  get: () => !!converting.value,
  set: (v: boolean) => { if (!v) converting.value = null; }
});

function onConverted(woId: number) {
  converting.value = null;
  router.push(`/garage/work-orders/${woId}`);
}

const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
const fmtTime      = (d: string) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

const PRIORITY_COLOR: Record<string, string> = {
  low:    'bg-white/10 text-white/50',
  normal: 'bg-blue-500/20 text-blue-300',
  high:   'bg-orange-500/20 text-orange-300',
  urgent: 'bg-red-500/20 text-red-300',
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Agenda / Citas</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Nueva cita
      </button>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <input v-model="dateFrom" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="">Todos los estados</option>
        <option value="scheduled">Programada</option>
        <option value="confirmed">Confirmada</option>
        <option value="arrived">Cliente llegó</option>
        <option value="rescheduled">Reagendada</option>
        <option value="cancelled">Cancelada</option>
        <option value="no_show">No se presentó</option>
        <option value="converted_to_work_order">Convertida</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-20 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">No hay citas para los filtros seleccionados.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="a in store.items"
        :key="a.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="w-12 text-center shrink-0">
          <p class="text-lg font-bold text-white leading-none">{{ fmtTime(a.scheduled_start) }}</p>
          <p class="text-xs text-white/40">{{ fmtDateShort(a.scheduled_start) }}</p>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm font-medium text-white truncate">{{ a.customer_name || 'Sin cliente' }}</p>
            <widgets_garage_appointment_status_badge :status="a.status" :small="true" />
            <span class="text-xs px-2 py-0.5 rounded-full" :class="PRIORITY_COLOR[a.priority]">{{ a.priority }}</span>
          </div>
          <p class="text-xs text-white/40 truncate">{{ a.plate ? `${a.plate} ·` : '' }} {{ a.requested_service_summary || a.reported_issue || 'Sin descripción' }}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="['scheduled','confirmed','arrived'].includes(a.status)"
            type="button"
            class="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
            @click.stop="openConvert(a)"
          >
            <ArrowRight :size="12" /> Crear OT
          </button>
          <button type="button" class="text-white/30 hover:text-white/70" @click.stop="openEdit(a)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} citas</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <widgets_garage_appointment_form_modal v-model="showForm" :appointment="editing" @saved="showForm = false; load()" />
    <widgets_garage_convert_appointment_modal v-model="showConvertModal" :appointment="converting" @converted="onConverted" />
  </div>
</template>
