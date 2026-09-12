<script setup lang="ts">
import { ref, watch } from 'vue';
import { CalendarPlus, Loader2, Pencil, Save } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../stores/garageAppointments';
import widgets_garage_customer_vehicle_selector from './widgets_garage_customer_vehicle_selector.vue';
import NxrSlidePanel from '../components/NxrSlidePanel.vue';
import { toLocalDateTimeInput } from '../components/agenda/agendaLayout';
import type { Appointment } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  readOnly?: boolean;
  appointment?: Appointment | null;
  prefill?: { date: Date; hour?: number; minute?: number } | null;
}>();

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toLocalInputValue(date: Date, hour?: number, minute?: number): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(hour ?? date.getHours());
  const min = pad2(minute ?? 0);
  return `${y}-${m}-${d}T${h}:${min}`;
}

function addHourToInputValue(value: string, hours: number): string {
  const d = new Date(value);
  d.setHours(d.getHours() + hours);
  return toLocalInputValue(d, d.getHours(), d.getMinutes());
}

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', appt: Appointment): void;
  (e: 'failed', message: string): void;
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
        scheduled_start:           toLocalDateTimeInput(props.appointment.scheduled_start),
        scheduled_end:             toLocalDateTimeInput(props.appointment.scheduled_end),
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
      const prefillStart = props.prefill ? toLocalInputValue(props.prefill.date, props.prefill.hour, props.prefill.minute) : '';
      form.value = {
        customer_id: null, vehicle_id: null,
        scheduled_start: prefillStart,
        scheduled_end: prefillStart ? addHourToInputValue(prefillStart, 1) : '',
        estimated_duration_hours: 0, channel: '', requested_service_summary: '', reported_issue: '', preliminary_notes: '', internal_notes: '', priority: 'normal', suggested_employee_id: null,
      };
    }
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function save() {
  if (props.readOnly) return;
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
    emit('failed', error.value);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NxrSlidePanel
    :open="modelValue"
    :title="appointment ? (readOnly ? 'Detalle de cita' : 'Editar cita') : 'Nueva cita'"
    size="md"
    @close="close"

    draft-key="widgets/widgets_garage_appointment_form_modal.vue#1"
    :draft-entity="appointment?.id"
    :draft-state="{ form }">
          <div class="mb-5 flex items-start gap-3 rounded-2xl border p-3 nxr-card-subtle" :style="{ borderColor: 'var(--nexora-card-border)' }">
            <Pencil v-if="appointment" class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
            <CalendarPlus v-else class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
            <div>
              <p class="text-sm font-semibold nxr-text">{{ appointment ? `Editando cita #${appointment.id}` : 'Creando una cita nueva' }}</p>
              <p class="mt-0.5 text-xs nxr-text-muted">
                {{ appointment ? 'Los cambios se aplicarán cuando presiones Guardar cambios.' : 'El registro se creará cuando presiones Crear cita.' }}
              </p>
            </div>
          </div>
          <fieldset :disabled="readOnly" class="flex flex-col gap-5">
            <widgets_garage_customer_vehicle_selector
              v-model:customer-id="form.customer_id"
              v-model:vehicle-id="form.vehicle_id"
            />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="garage-appointment-start" class="block text-xs nxr-text-muted mb-1">Fecha y hora inicio *</label>
                <input id="garage-appointment-start" v-model="form.scheduled_start" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label for="garage-appointment-end" class="block text-xs nxr-text-muted mb-1">Fecha y hora fin</label>
                <input id="garage-appointment-end" v-model="form.scheduled_end" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs nxr-text-muted mb-1">Duración estimada (hrs)</label>
                <input v-model.number="form.estimated_duration_hours" type="number" min="0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs nxr-text-muted mb-1">Prioridad</label>
                <select v-model="form.priority" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40">
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label class="block text-xs nxr-text-muted mb-1">Canal</label>
                <select v-model="form.channel" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40">
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
              <label class="block text-xs nxr-text-muted mb-1">Descripción del servicio solicitado</label>
              <input v-model="form.requested_service_summary" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs nxr-text-muted mb-1">Problema reportado por el cliente</label>
              <textarea v-model="form.reported_issue" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
            <div>
              <label class="block text-xs nxr-text-muted mb-1">Notas preliminares</label>
              <textarea v-model="form.preliminary_notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
          </fieldset>
    <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>

    <template #footer>

      <button v-if="!readOnly" type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">
        <Loader2 v-if="saving" :size="14" class="animate-spin" />
        <Save v-else :size="14" />
        {{ saving ? (appointment ? 'Actualizando...' : 'Creando...') : (appointment ? 'Guardar cambios' : 'Crear cita') }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
