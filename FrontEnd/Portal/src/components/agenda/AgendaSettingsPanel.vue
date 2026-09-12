<script setup lang="ts">
import { ref, watch } from 'vue';
import { Save, Loader2, Minus, Plus, CalendarRange } from 'lucide-vue-next';

export interface AgendaSettingsValue {
  max_appointments_per_day: number | null;
  business_hours_start: string; // "HH:MM"
  business_hours_end: string;
}

const props = defineProps<{
  moduleLabel: string;
  settings: AgendaSettingsValue;
  saving?: boolean;
  error?: string;
  saved?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', value: AgendaSettingsValue): void;
}>();

const form = ref<AgendaSettingsValue>({ ...props.settings });
const unlimited = ref(props.settings.max_appointments_per_day === null);
const validationError = ref('');
const lastLimit = ref(props.settings.max_appointments_per_day ?? 10);

watch(() => props.settings, (next) => {
  form.value = { ...next };
  unlimited.value = next.max_appointments_per_day === null;
  if (next.max_appointments_per_day !== null) lastLimit.value = next.max_appointments_per_day;
  validationError.value = '';
});

function setUnlimited(value: boolean) {
  unlimited.value = value;
  validationError.value = '';
  if (!value) form.value.max_appointments_per_day = lastLimit.value;
}

function changeLimit(delta: number) {
  const current = Number(form.value.max_appointments_per_day) || 1;
  form.value.max_appointments_per_day = Math.max(1, current + delta);
  lastLimit.value = form.value.max_appointments_per_day;
}

function submit() {
  const limit = Number(form.value.max_appointments_per_day);
  if (!unlimited.value && (!Number.isInteger(limit) || limit < 1)) {
    validationError.value = 'Ingresa una cantidad entera mayor o igual a 1.';
    return;
  }
  validationError.value = '';
  emit('save', {
    ...form.value,
    max_appointments_per_day: unlimited.value ? null : limit,
  });
}
</script>

<template>
  <form class="w-full min-w-0 max-w-lg space-y-5 rounded-2xl p-4 sm:p-5 nxr-card-subtle" @submit.prevent="submit">
    <div>
      <p class="text-sm font-semibold nxr-text">Configuración de citas — {{ moduleLabel }}</p>
      <p class="mt-1 text-xs nxr-text-muted">Limitá cuántas citas se pueden agendar por día y el horario visible en la agenda.</p>
    </div>

    <div class="min-w-0 space-y-3 rounded-2xl border p-3 sm:p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
      <div class="flex items-start gap-3">
        <CalendarRange class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
        <div class="min-w-0">
          <p class="text-sm font-semibold nxr-text">Cantidad de citas permitidas por día</p>
          <p class="mt-1 text-xs nxr-text-muted">Al alcanzar el límite, no se podrán crear ni mover más citas activas a ese día.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2 rounded-2xl p-1 sm:grid-cols-2 nxr-card-subtle" role="radiogroup" aria-label="Tipo de límite diario">
        <button type="button" role="radio" :aria-checked="unlimited" class="rounded-xl px-3 py-2 text-xs font-medium transition"
                :class="unlimited ? 'nxr-btn-primary text-white' : 'nxr-text-muted'" @click="setUnlimited(true)">
          Sin límite
        </button>
        <button type="button" role="radio" :aria-checked="!unlimited" class="rounded-xl px-3 py-2 text-xs font-medium transition"
                :class="!unlimited ? 'nxr-btn-primary text-white' : 'nxr-text-muted'" @click="setUnlimited(false)">
          Limitar por día
        </button>
      </div>

      <div v-if="!unlimited" class="space-y-1.5">
        <label for="daily-appointment-limit" class="block text-xs font-medium nxr-text-muted">Máximo diario</label>
        <div class="flex items-center gap-2">
          <button type="button" class="nxr-btn nxr-btn-secondary !h-10 !w-10 shrink-0 !p-0" aria-label="Disminuir límite" @click="changeLimit(-1)">
            <Minus class="h-4 w-4" />
          </button>
          <input id="daily-appointment-limit" v-model.number="form.max_appointments_per_day" type="number" min="1" step="1" inputmode="numeric"
                 class="h-10 min-w-0 flex-1 rounded-2xl border px-3 text-center text-sm font-semibold outline-none"
                 :aria-invalid="!!validationError"
                 :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: 'var(--nexora-input-text)' }" />
          <button type="button" class="nxr-btn nxr-btn-secondary !h-10 !w-10 shrink-0 !p-0" aria-label="Aumentar límite" @click="changeLimit(1)">
            <Plus class="h-4 w-4" />
          </button>
        </div>
        <p class="text-xs nxr-text-muted">Se cuentan las citas programadas, confirmadas, recibidas o reagendadas. Las canceladas y ausencias no ocupan cupo.</p>
        <p v-if="validationError" class="text-xs text-red-400">{{ validationError }}</p>
      </div>
    </div>

    <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-xs font-medium nxr-text-muted">Horario desde</label>
        <input v-model="form.business_hours_start" type="time" class="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
               :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: 'var(--nexora-input-text)' }" />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-medium nxr-text-muted">Horario hasta</label>
        <input v-model="form.business_hours_end" type="time" class="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
               :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: 'var(--nexora-input-text)' }" />
      </div>
    </div>

    <div class="flex justify-end">
      <button type="submit" :disabled="saving" class="nxr-btn nxr-btn-primary w-full disabled:opacity-60 sm:w-auto">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        Guardar configuración
      </button>
    </div>
    <p v-if="error" class="text-xs text-red-400" role="alert">{{ error }}</p>
    <p v-else-if="saved" class="text-xs text-emerald-400" role="status">Configuración guardada correctamente.</p>
  </form>
</template>
