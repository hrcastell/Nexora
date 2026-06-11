<template>
  <DentalPrintDocument
    :config="(config as any)"
    :title="printTitle"
    :document-number="document.document_number"
    :patient="printPatient"
    :professional="printProfessional"
  >
    <!-- ── medical_report ─────────────────────────────────── -->
    <template v-if="document.document_type === 'medical_report'">
      <div style="margin-bottom:10pt; font-size:9pt; color:#555;">
        <span>Fecha: {{ fmtDate(document.document_date) }}</span>
      </div>
      <div style="border-top:1px solid #ddd; padding-top:8pt; margin-bottom:8pt;">
        <div style="font-weight:bold; font-size:9pt; margin-bottom:4pt;">Diagnóstico y Tratamiento:</div>
        <div style="font-size:9pt; white-space:pre-wrap; line-height:1.5;">{{ document.content }}</div>
      </div>
    </template>

    <!-- ── medical_certificate ────────────────────────────── -->
    <template v-else-if="document.document_type === 'medical_certificate'">
      <div style="margin-bottom:10pt; font-size:9pt; color:#555;">
        <span>Fecha: {{ fmtDate(document.document_date) }}</span>
      </div>
      <div style="border-top:1px solid #ddd; padding-top:8pt; margin-bottom:8pt;">
        <div style="font-size:9pt; white-space:pre-wrap; line-height:1.6;">{{ document.content }}</div>
      </div>
      <div style="margin-top:30pt; font-size:8pt; color:#555; text-align:center;">
        Firma y Sello
      </div>
    </template>

    <!-- ── prescription ───────────────────────────────────── -->
    <template v-else-if="document.document_type === 'prescription'">
      <div style="margin-bottom:6pt; font-size:9pt; color:#555;">
        <span>Fecha: {{ fmtDate(document.document_date) }}</span>
      </div>
      <div style="border-top:2px solid #000; padding-top:8pt; margin-bottom:8pt;">
        <div
          v-for="(med, idx) in parsedContent.medications || []"
          :key="idx"
          style="margin-bottom:6pt; font-size:9pt; padding-left:8pt;"
        >
          <span style="font-weight:bold;">{{ idx + 1 }}.</span>
          {{ med.name }}
          <span v-if="med.dose"> — {{ med.dose }}</span>
          <span v-if="med.frequency"> — {{ med.frequency }}</span>
          <span v-if="med.duration"> — {{ med.duration }}</span>
        </div>
        <div v-if="!parsedContent.medications?.length" style="font-size:9pt; color:#aaa;">
          Sin medicamentos registrados.
        </div>
      </div>
      <div v-if="parsedContent.instructions" style="border-top:1px solid #ddd; padding-top:6pt; margin-bottom:8pt; font-size:9pt;">
        <div style="font-weight:bold; margin-bottom:2pt;">Indicaciones:</div>
        <div style="white-space:pre-wrap; line-height:1.5;">{{ parsedContent.instructions }}</div>
      </div>
      <div style="border-top:1px solid #ddd; padding-top:6pt; font-size:8pt; color:#b00; font-weight:bold; text-align:center;">
        ⚠ NO SE AUTOMEDIQUE — Consulte a su médico ante cualquier duda
      </div>
    </template>
  </DentalPrintDocument>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DentalPrintDocument from './DentalPrintDocument.vue';
import type { DentalMedicalDocument } from '../../types/dental';
import { MEDICAL_DOCUMENT_TYPE_LABELS } from '../../types/dental';

const props = defineProps<{
  document: DentalMedicalDocument;
  patient: Record<string, unknown>;
  config: Record<string, unknown>;
}>();

const printTitle = computed(() => MEDICAL_DOCUMENT_TYPE_LABELS[props.document.document_type]);

const printPatient = computed(() => ({
  name:   `${props.patient.first_name ?? ''} ${props.patient.last_name ?? ''}`.trim(),
  cedula: props.patient.document_number
    ? `${props.patient.document_type ?? ''} ${props.patient.document_number}`.trim()
    : undefined,
  phone:  (props.patient.phone as string | undefined) ?? undefined,
}));

const printProfessional = computed(() => {
  if (!props.document.professional_name) return undefined;
  return {
    name:    props.document.professional_name,
    license: props.document.professional_license ?? undefined,
  };
});

const parsedContent = computed(() => {
  if (props.document.document_type === 'prescription') {
    try {
      return JSON.parse(props.document.content || '{}') as {
        medications?: { name: string; dose: string; frequency: string; duration: string }[];
        instructions?: string;
      };
    } catch {
      return {};
    }
  }
  return {};
});

function fmtDate(d: string | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
