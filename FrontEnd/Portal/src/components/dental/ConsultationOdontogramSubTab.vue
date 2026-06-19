<script setup lang="ts">
import { computed } from 'vue'
import DentalOdontogram from './DentalOdontogram.vue'
import { useDentalOdontogramStore } from '../../stores/dentalOdontogram'

defineProps<{
  consultationId: number
  patientId: number
  readOnly: boolean
}>()

const store = useDentalOdontogramStore()

const consultationCount = computed(() =>
  store.consultationEntries.length
)
</script>

<template>
  <div class="flex flex-col gap-3">

    <!-- Consultation findings count badge -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-white/40 uppercase tracking-wide font-semibold">Odontograma</span>
      <span
        v-if="consultationCount > 0"
        class="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-medium text-violet-300"
      >
        {{ consultationCount }} hallazgo{{ consultationCount !== 1 ? 's' : '' }} en esta consulta
      </span>
      <span
        v-else-if="!store.loading"
        class="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-white/30"
      >
        Sin hallazgos en esta consulta
      </span>
    </div>

    <DentalOdontogram
      :patient-id="patientId"
      :consultation-id="consultationId"
      :readonly="readOnly"
    />
  </div>
</template>
