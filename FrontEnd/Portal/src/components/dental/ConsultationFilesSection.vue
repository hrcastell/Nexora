<script setup lang="ts">
import ConsultationDocumentsSection from './ConsultationDocumentsSection.vue'
import ConsultationAttachmentsTab from './ConsultationAttachmentsTab.vue'

defineProps<{
  consultationId: number
  customerId: number
  readOnly?: boolean
}>()
</script>

<template>
  <div class="space-y-8">

    <!-- Medical Documents -->
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Documentos medicos</p>
      <ConsultationDocumentsSection
        :consultation-id="consultationId"
        :customer-id="customerId"
        :read-only="readOnly ?? false"
      />
    </div>

    <!-- Divider -->
    <div class="border-t border-white/10" />

    <!-- Attached Files -->
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Archivos adjuntos</p>
      <ConsultationAttachmentsTab
        :consultation-id="consultationId"
        :read-only="readOnly ?? false"
      />
    </div>

  </div>
</template>
