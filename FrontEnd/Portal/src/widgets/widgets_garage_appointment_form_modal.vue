<script setup lang="ts">
import { ref, watch } from 'vue';
import { Save } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../stores/garageAppointments';
import widgets_garage_customer_vehicle_selector from './widgets_garage_customer_vehicle_selector.vue';
import NxrSlidePanel from '../components/NxrSlidePanel.vue';
import type { Appointment } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  appointment?: Appointment | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', appt: Appointment): void;
}>();

const store  = useGarageAppointmentsStore();
const saving = ref(false);
const error  = ref('');

const form = ref({
  customer_id:             null as number | null,
  vehicle_id:              null as number | null,
  scheduled_start:         '',
  scheduled_end:           '',
  estimated_duration_hours: 0,
  channel:                 '',
  requested_service_summary: '',
  reported_issue:          '',
  preliminary_notes:       '',
  internal_notes:          '',
  priority:                'normal' as string,
  suggested_employee_id:   null as number | null,
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.appointment) {
      Object.assign(form.value, {
        customer_id:               props.appointment.customer_id,
        vehicle_id:                props.appointment.vehicle_id,
        scheduled_start:           props.appointment.scheduled_start?.slice(0, 16) || '',
        scheduled_end:             props.appointment.scheduled_end?.slice(0, 16) || '',
        estimated_duration_hours:  props.appointment.estimated_duration_hours || 0,
        channel:                   props.appointment.channel || '',
        requested_service_summary: props.appointment.requested_service_summary || '',
        reported_issue:            props.appointment.reported_issue || '',
        preliminary_notes:         props.appointment.preliminary_notes || '',
        internal_notes:            props.appointment.internal_notes || '',
        priority:                  props.appointment.priority || 'normal',
        suggested_employee_id:     props.appointment.suggested_employee_id,
      });
    } else {
      form.value = { customer_id: null, vehicle_id: null, scheduled_start: '', scheduled_end: '', estimated_duration_hours: 0, channel: '', requested_service_summary: '', reported_issue: '', preliminary_notes: '', internal_notes: '', priority: 'normal', suggested_employee_id: null };
    }
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function save() {
  if (!form.value.scheduled_start) { error.value = 'La fecha y hora de inicio es requerida'; return; }
  saving.value = true; error.value = '';
  try {
    let saved: Appointment;
    const payload = { ...form.value, priority: form.value.priority as Appointment['priority'] };
    if (props.appointment?.id) {
      saved = await store.update(props.appointment.id, payload);
    } else {
      saved = await store.create(payload);
    }
    emit('saved', saved);
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar cita';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NxrSlidePanel
    :open="modelValue"
    :title="appointment ? 'Editar cita' : 'Nueva cita'"
    size="md"
    @close="close"
  >
          <div class="flex flex-col gap-5">
            <widgets_garage_customer_vehicle_selector
              v-model:customer-id="form.customer_id"
              v-model:vehicle-id="form.vehicle_id"
            />

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-white/50 mb-1">Fecha y hora inicio *</label>
                <input v-model="form.scheduled_start" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Fecha y hora fin</label>
                <input v-model="form.scheduled_end" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Duración estimada (hrs)</label>
                <input v-model.number="form.estimated_duration_hours" type="number" min="0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Prioridad</label>
                <select v-model="form.priority" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40">
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Canal</label>
                <select v-model="form.channel" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40">
                  <option value="">Seleccionar</option>
                  <option value="walk_in">Presencial</option>
                  <option value="phone">Teléfono</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="web">Web</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs text-white/50 mb-1">Descripción del servicio solicitado</label>
              <input v-model="form.requested_service_summary" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Problema reportado por el cliente</label>
              <textarea v-model="form.reported_issue" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Notas preliminares</label>
              <textarea v-model="form.preliminary_notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
          </div>
    <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>

    <template #footer>
      <button type="button" class="nxr-btn nxr-btn-secondary" @click="close">Cancelar</button>
      <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">
        <Save :size="14" />{{ saving ? 'Guardando...' : 'Guardar cita' }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
