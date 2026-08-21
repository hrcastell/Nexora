<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, ArrowRight } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../stores/garageAppointments';
import type { Appointment } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  appointment: Appointment | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'converted', workOrderId: number): void;
}>();

const store    = useGarageAppointmentsStore();
const saving   = ref(false);
const error    = ref('');

const form = ref({
  mileage_in:               null as number | null,
  reception_notes:          '',
  fuel_level:               '',
  vehicle_condition_notes:  '',
});

watch(() => props.modelValue, (val) => {
  if (val) {
    form.value = { mileage_in: null, reception_notes: '', fuel_level: '', vehicle_condition_notes: '' };
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function convert() {
  if (!props.appointment) return;
  saving.value = true; error.value = '';
  try {
    const res = await store.convertToWorkOrder(props.appointment.id, {
      mileage_in:              form.value.mileage_in ?? undefined,
      reception_notes:         form.value.reception_notes || undefined,
      fuel_level:              form.value.fuel_level || undefined,
      vehicle_condition_notes: form.value.vehicle_condition_notes || undefined,
    });
    emit('converted', res.work_order.id);
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al convertir cita en orden';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue && appointment" class="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" @click.self="close">
      <div class="rounded-2xl shadow-2xl overflow-hidden w-full max-w-md" :style="{ background: 'var(--nexora-glass-bg, #0b1326)', border: '1px solid var(--nexora-border-color)' }">
        <div class="flex items-center justify-between px-6 py-4" :style="{ borderBottom: '1px solid var(--nexora-border-color)' }">
          <h2 class="text-base font-semibold nxr-text">Convertir en Orden de Trabajo</h2>
          <button type="button" class="nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="close"><X :size="18" /></button>
        </div>

        <div class="p-6 flex flex-col gap-4">
          <div class="rounded-xl px-4 py-3 text-sm nxr-text-muted" :style="{ backgroundColor: 'var(--nexora-glass-bg-subtle)', border: '1px solid var(--nexora-border-color)' }">
            Cita: <span class="nxr-text font-medium">{{ appointment.appointment_number }}</span>
            <span v-if="appointment.customer_name" class="ml-2">— {{ appointment.customer_name }}</span>
          </div>

          <div>
            <label class="block text-xs nxr-text-muted mb-1">Kilometraje de ingreso</label>
            <input v-model.number="form.mileage_in" type="number" min="0" class="w-full px-3 py-2 rounded-xl nxr-text text-sm outline-none"
              :style="{ backgroundColor: 'var(--nexora-glass-bg-subtle)', border: '1px solid var(--nexora-border-color)' }" />
          </div>
          <div>
            <label class="block text-xs nxr-text-muted mb-1">Nivel de combustible</label>
            <select v-model="form.fuel_level" class="w-full px-3 py-2 rounded-xl nxr-text text-sm outline-none"
              :style="{ backgroundColor: 'var(--nexora-glass-bg-subtle)', border: '1px solid var(--nexora-border-color)' }">
              <option value="">Seleccionar</option>
              <option value="empty">Vacío</option>
              <option value="quarter">1/4</option>
              <option value="half">1/2</option>
              <option value="three_quarters">3/4</option>
              <option value="full">Lleno</option>
            </select>
          </div>
          <div>
            <label class="block text-xs nxr-text-muted mb-1">Estado general del vehículo</label>
            <textarea v-model="form.vehicle_condition_notes" rows="2" class="w-full px-3 py-2 rounded-xl nxr-text text-sm outline-none resize-none" placeholder="Rayones, golpes, etc."
              :style="{ backgroundColor: 'var(--nexora-glass-bg-subtle)', border: '1px solid var(--nexora-border-color)' }"></textarea>
          </div>
          <div>
            <label class="block text-xs nxr-text-muted mb-1">Notas de recepción</label>
            <textarea v-model="form.reception_notes" rows="2" class="w-full px-3 py-2 rounded-xl nxr-text text-sm outline-none resize-none"
              :style="{ backgroundColor: 'var(--nexora-glass-bg-subtle)', border: '1px solid var(--nexora-border-color)' }"></textarea>
          </div>
          <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4" :style="{ borderTop: '1px solid var(--nexora-border-color)' }">
          <button type="button" class="px-4 py-2 rounded-xl text-sm nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="close">Cancelar</button>
          <button type="button" class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="convert">
            <ArrowRight :size="14" />{{ saving ? 'Creando orden...' : 'Crear Orden de Trabajo' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
