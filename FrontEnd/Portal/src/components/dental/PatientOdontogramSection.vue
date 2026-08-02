<script setup lang="ts">
import DentalOdontogram from './DentalOdontogram.vue'
import { useDentalOdontogramStore } from '../../stores/dentalOdontogram'
import { computed } from 'vue'

defineProps<{
  patientId: number
}>()

const store = useDentalOdontogramStore()
const hasEntries = computed(() => store.entries.length > 0)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Read-only banner -->
    <div class="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"/>
      </svg>
      <p class="text-xs text-blue-300 leading-relaxed">
        El odontograma es de solo lectura desde la ficha del paciente. Para registrar un hallazgo, abri una consulta.
      </p>
    </div>

    <!-- Empty state -->
    <div
      v-if="!store.loading && !hasEntries"
      class="rounded-2xl border border-white/10 px-6 py-10 text-center"
      :style="{ background: 'var(--nexora-glass-bg)' }"
    >
      <p class="text-sm nxr-text-soft">Sin hallazgos registrados</p>
    </div>

    <!-- Odontogram chart (always render to trigger load) -->
    <DentalOdontogram
      :patient-id="patientId"
      :readonly="true"
    />
  </div>
</template>
