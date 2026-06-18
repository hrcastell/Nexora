<template>
  <div id="dental-print-target">
    <!-- Header -->
    <div class="print-header" style="display:flex; align-items:flex-start; gap:16pt; margin-bottom:12pt; border-bottom:2px solid #000; padding-bottom:8pt;">
      <img v-if="config.logo_url" :src="config.logo_url" alt="Logo" style="height:60pt; width:auto; object-fit:contain;" />
      <div style="flex:1;">
        <div style="font-size:14pt; font-weight:bold;">{{ config.company_name }}</div>
        <div v-if="config.address" style="font-size:9pt; color:#555;">{{ config.address }}</div>
        <div style="font-size:9pt; color:#555;">
          <span v-if="config.phone">Tel: {{ config.phone }}</span>
          <span v-if="config.phone && config.email"> · </span>
          <span v-if="config.email">{{ config.email }}</span>
        </div>
        <div v-if="config.tax_id" style="font-size:9pt; color:#555;">RIF/NIT: {{ config.tax_id }}</div>
      </div>
    </div>

    <!-- Document title + number -->
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10pt;">
      <div style="font-size:13pt; font-weight:bold; text-transform:uppercase;">{{ title }}</div>
      <div v-if="documentNumber" style="font-size:10pt;">N°: {{ documentNumber }}</div>
    </div>

    <!-- Patient + Professional info -->
    <div class="print-no-break" style="display:grid; grid-template-columns:1fr 1fr; gap:8pt; margin-bottom:10pt; font-size:9pt;">
      <div v-if="patient" style="border:1px solid #ddd; padding:6pt;">
        <div style="font-weight:bold; margin-bottom:2pt;">Paciente</div>
        <div>{{ patient.name }}</div>
        <div v-if="patient.cedula">Cédula: {{ patient.cedula }}</div>
        <div v-if="patient.phone">Tel: {{ patient.phone }}</div>
      </div>
      <div v-if="professional" style="border:1px solid #ddd; padding:6pt;">
        <div style="font-weight:bold; margin-bottom:2pt;">Profesional</div>
        <div>{{ professional.name }}</div>
        <div v-if="professional.license">Matrícula: {{ professional.license }}</div>
      </div>
    </div>

    <!-- Slot for document-specific content -->
    <div class="print-no-break">
      <slot />
    </div>

    <!-- Signatures -->
    <div style="display:flex; justify-content:space-around; margin-top:40pt; font-size:9pt;">
      <div style="text-align:center;">
        <div class="print-signature-line"></div>
        <div>Firma del Profesional</div>
        <div v-if="professional?.name">{{ professional.name }}</div>
      </div>
      <div style="text-align:center;">
        <div class="print-signature-line"></div>
        <div>Firma del Paciente</div>
        <div v-if="patient?.name">{{ patient.name }}</div>
      </div>
    </div>

    <!-- Legal text -->
    <div v-if="legalText" style="margin-top:12pt; font-size:7pt; color:#777; border-top:1px solid #ddd; padding-top:6pt;">
      {{ legalText }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface CompanyConfig {
  company_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  logo_url?: string | null;
}

interface PrintPerson {
  name: string;
  cedula?: string;
  phone?: string;
  license?: string;
}

defineProps<{
  config: CompanyConfig;
  title: string;
  documentNumber?: string;
  patient?: PrintPerson;
  professional?: PrintPerson;
  legalText?: string;
}>();
</script>
