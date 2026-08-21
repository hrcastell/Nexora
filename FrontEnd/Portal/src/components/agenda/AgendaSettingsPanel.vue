<script setup lang="ts">
import { ref, watch } from 'vue';
import { Save, Loader2 } from 'lucide-vue-next';

export interface AgendaSettingsValue {
  max_appointments_per_day: number | null;
  business_hours_start: string; // "HH:MM"
  business_hours_end: string;
}

const props = defineProps<{
  moduleLabel: string;
  settings: AgendaSettingsValue;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', value: AgendaSettingsValue): void;
}>();

const form = ref<AgendaSettingsValue>({ ...props.settings });
const unlimited = ref(props.settings.max_appointments_per_day === null);

watch(() => props.settings, (next) => {
  form.value = { ...next };
  unlimited.value = next.max_appointments_per_day === null;
});

function submit() {
  emit('save', {
    ...form.value,
    max_appointments_per_day: unlimited.value ? null : Number(form.value.max_appointments_per_day) || 1,
  });
}
</script>

<template>
  <form class="max-w-lg space-y-5 rounded-2xl p-5 nxr-card-subtle" @submit.prevent="submit">
    <div>
      <p class="text-sm font-semibold nxr-text">Configuración de citas — {{ moduleLabel }}</p>
      <p class="mt-1 text-xs nxr-text-muted">Limitá cuántas citas se pueden agendar por día y el horario visible en la agenda.</p>
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-2 text-sm nxr-text">
        <input type="checkbox" v-model="unlimited" />
        Sin límite de citas por día
      </label>
      <div v-if="!unlimited">
        <label class="mb-1.5 block text-xs font-medium nxr-text-muted">Máximo de citas por día</label>
        <input v-model.number="form.max_appointments_per_day" type="number" min="1" class="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
               :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: 'var(--nexora-input-text)' }" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
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
      <button type="submit" :disabled="saving" class="nxr-btn nxr-btn-primary disabled:opacity-60">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        Guardar configuración
      </button>
    </div>
  </form>
</template>
