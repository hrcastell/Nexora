<script setup lang="ts">
import type { PropType } from 'vue'
import { BookOpen, Plus } from 'lucide-vue-next'
import type { DentalMedicalHistory } from '../../types/dental'

defineProps({
  consultation:   { type: Object as PropType<Record<string, any> | null>, default: null },
  medicalHistory: { type: Array as PropType<DentalMedicalHistory[]>, default: () => [] },
  fmtDate:        { type: Function as PropType<(v?: string | null) => string>, default: null },
})

defineEmits<{ (e: 'add-record'): void }>()
</script>

<template>
<div class="space-y-4">

  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold nxr-text">Historia clínica del paciente</h2>
    <div class="flex items-center gap-2">
      <router-link
        :to="`/dental/patients/${(consultation as any)?.customer_id ?? (consultation as any)?.customer?.id}`"
        class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm nxr-text-muted transition hover:bg-white/10"
      >
        Ver historial completo
      </router-link>
      <button
        class="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
        @click="$emit('add-record')"
      >
        <Plus class="h-4 w-4" />
        Agregar registro
      </button>
    </div>
  </div>

  <div v-if="!medicalHistory.length" class="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
    <BookOpen class="mx-auto mb-3 h-8 w-8 nxr-text-soft" />
    <p class="text-sm nxr-text-muted">Sin registros médicos cargados.</p>
  </div>

  <div v-else class="space-y-3">
    <div
      v-for="entry in medicalHistory"
      :key="entry.id"
      class="rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs nxr-text-muted">{{ fmtDate?.(entry.entry_date) ?? '—' }}</span>
        <span v-if="entry.blood_type" class="rounded bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-300">
          {{ entry.blood_type }}
        </span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-if="entry.allergies">
          <p class="mb-0.5 text-xs nxr-text-muted">Alergias</p>
          <p class="text-sm nxr-text">{{ entry.allergies }}</p>
        </div>
        <div v-if="entry.current_medications">
          <p class="mb-0.5 text-xs nxr-text-muted">Medicamentos actuales</p>
          <p class="text-sm nxr-text">{{ entry.current_medications }}</p>
        </div>
        <div v-if="entry.chronic_conditions">
          <p class="mb-0.5 text-xs nxr-text-muted">Condiciones crónicas</p>
          <p class="text-sm nxr-text">{{ entry.chronic_conditions }}</p>
        </div>
        <div v-if="entry.medical_background">
          <p class="mb-0.5 text-xs nxr-text-muted">Antecedentes</p>
          <p class="text-sm nxr-text">{{ entry.medical_background }}</p>
        </div>
        <div v-if="entry.dental_observations" class="sm:col-span-2">
          <p class="mb-0.5 text-xs nxr-text-muted">Observaciones dentales</p>
          <p class="text-sm nxr-text">{{ entry.dental_observations }}</p>
        </div>
        <div v-if="entry.notes" class="sm:col-span-2">
          <p class="mb-0.5 text-xs nxr-text-muted">Notas</p>
          <p class="text-sm nxr-text">{{ entry.notes }}</p>
        </div>
      </div>
    </div>
  </div>

</div>
</template>
