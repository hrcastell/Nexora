<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, User, FileText, Stethoscope, CreditCard, CalendarDays, Pencil, Phone, MessageCircle, Plus, Camera, Trash2, Receipt, BookOpen } from 'lucide-vue-next';
import { dentalQuotesService } from '../../services/dentalQuotesService';
import { dentalMedicalDocumentsService } from '../../services/dentalMedicalDocumentsService';
import type { DentalQuote, DentalMedicalDocument } from '../../types/dental';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, MEDICAL_DOCUMENT_TYPE_LABELS, MEDICAL_DOCUMENT_TYPE_COLORS } from '../../types/dental';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import { useDentalAppointmentsStore } from '../../stores/dentalAppointments';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import { useToast } from '../../composables/useToast';
import type { DentalClinicalHistoryEntry, DentalConsultation, DentalPayment, DentalCharge, DentalMedicalHistory } from '../../types/dental';

const route  = useRoute();
const router = useRouter();
const store              = useDentalPatientsStore();
const appointmentsStore  = useDentalAppointmentsStore();
const { toasts, triggerToast, removeToast } = useToast();

const activeTab         = ref<'summary' | 'personal' | 'history' | 'consultations' | 'payments' | 'appointments' | 'quotes' | 'documents'>('summary');
const patientQuotes     = ref<DentalQuote[]>([]);
const patientDocs       = ref<DentalMedicalDocument[]>([]);
const docsLoading       = ref(false);
const quotesLoading     = ref(false);
const showEditPanel     = ref(false);
const saving            = ref(false);
const saveError         = ref<string | null>(null);
const clinicalHistory   = ref<DentalClinicalHistoryEntry[]>([]);
const medicalHistory    = ref<DentalMedicalHistory[]>([]);
const consultations     = ref<DentalConsultation[]>([]);
const payments          = ref<DentalPayment[]>([]);
const debt              = ref<DentalCharge[]>([]);
const appointments      = computed(() => appointmentsStore.items);

// Medical history panel
const showMedHistPanel  = ref(false);
const savingMedHist     = ref(false);
const medHistError      = ref<string | null>(null);
const medHistForm       = ref({
  entry_date: new Date().toISOString().slice(0, 10),
  blood_type: '',
  medical_background: '',
  allergies: '',
  current_medications: '',
  chronic_conditions: '',
  dental_observations: '',
  notes: '',
});

const patient = computed(() => store.current);

// Photo upload
const photoInput    = ref<HTMLInputElement | null>(null);
const uploadingPhoto = ref(false);

async function onPhotoSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !patient.value) return;
  uploadingPhoto.value = true;
  try {
    await store.uploadPhoto(patient.value.id, file);
    triggerToast('Foto actualizada', '', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al subir foto', 'error');
  } finally {
    uploadingPhoto.value = false;
    if (photoInput.value) photoInput.value.value = '';
  }
}

async function onDeletePhoto() {
  if (!patient.value) return;
  uploadingPhoto.value = true;
  try {
    await store.deletePhoto(patient.value.id);
    triggerToast('Foto eliminada', '', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al eliminar foto', 'error');
  } finally {
    uploadingPhoto.value = false;
  }
}

const editForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  mobile: '',
  email: '',
  document_type: '',
  document_number: '',
  birth_date: '',
  address: '',
  city: '',
  customer_notes: '',
  blood_type: '',
  medical_background: '',
  allergies: '',
  current_medications: '',
  chronic_conditions: '',
  dental_observations: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function cleanPhone(num: string | undefined | null): string {
  return (num ?? '').replace(/\D/g, '');
}

function openEdit() {
  if (!patient.value) return;
  const p = patient.value;
  editForm.value = {
    first_name: p.first_name,
    last_name: p.last_name,
    phone: p.phone ?? '',
    mobile: p.mobile ?? '',
    email: p.email ?? '',
    document_type: p.document_type ?? 'DNI',
    document_number: p.document_number ?? '',
    birth_date: p.birth_date ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    customer_notes: p.notes ?? '',
    blood_type: p.blood_type ?? '',
    medical_background: p.medical_background ?? '',
    allergies: p.allergies ?? '',
    current_medications: p.current_medications ?? '',
    chronic_conditions: p.chronic_conditions ?? '',
    dental_observations: p.dental_observations ?? '',
    emergency_contact_name: p.emergency_contact_name ?? '',
    emergency_contact_phone: p.emergency_contact_phone ?? '',
  };
  saveError.value = null;
  showEditPanel.value = true;
}

async function saveEdit() {
  if (!patient.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    await store.update(patient.value.id, editForm.value);
    triggerToast('Éxito', 'Datos del paciente actualizados', 'success');
    showEditPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar cambios';
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar cambios', 'error');
  } finally {
    saving.value = false;
  }
}

async function loadTabData(tab: typeof activeTab.value) {
  activeTab.value = tab;
  if (tab === 'history') {
    if (clinicalHistory.value.length === 0) {
      clinicalHistory.value = await store.getClinicalHistory(route.params.id as string) ?? [];
    }
    if (medicalHistory.value.length === 0) {
      medicalHistory.value = await store.fetchMedicalHistory(route.params.id as string) ?? [];
    }
  }
  if (tab === 'consultations' && consultations.value.length === 0) {
    consultations.value = await store.getConsultations(route.params.id as string) ?? [];
  }
  if (tab === 'payments' && payments.value.length === 0) {
    payments.value = await store.getPayments(route.params.id as string) ?? [];
    debt.value = await store.getDebt(route.params.id as string) ?? 0;
  }
  if (tab === 'appointments' && appointments.value.length === 0) {
    await appointmentsStore.load({ customer_id: route.params.id as string });
  }
  if (tab === 'quotes' && patientQuotes.value.length === 0) {
    quotesLoading.value = true;
    try {
      const res = await dentalQuotesService.getForPatient(Number(route.params.id));
      patientQuotes.value = res.data.data ?? [];
    } catch {
      // non-critical
    } finally {
      quotesLoading.value = false;
    }
  }
  if (tab === 'documents' && patientDocs.value.length === 0) {
    docsLoading.value = true;
    try {
      const res = await dentalMedicalDocumentsService.getForPatient(Number(route.params.id));
      patientDocs.value = res.data.data ?? [];
    } catch {
      // non-critical
    } finally {
      docsLoading.value = false;
    }
  }
}

async function saveMedHist() {
  if (!patient.value) return;
  savingMedHist.value = true;
  medHistError.value = null;
  try {
    await store.addMedicalHistory(patient.value.id, { ...medHistForm.value });
    medicalHistory.value = store.medicalHistory;
    triggerToast('Éxito', 'Registro médico agregado', 'success');
    showMedHistPanel.value = false;
    medHistForm.value = {
      entry_date: new Date().toISOString().slice(0, 10),
      blood_type: '',
      medical_background: '',
      allergies: '',
      current_medications: '',
      chronic_conditions: '',
      dental_observations: '',
      notes: '',
    };
  } catch (e: any) {
    medHistError.value = e?.response?.data?.error || 'Error al guardar registro';
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar registro', 'error');
  } finally {
    savingMedHist.value = false;
  }
}

const HISTORY_TYPE_LABEL: Record<string, string> = {
  initial:        'Inicial',
  evolution:      'Evolución',
  diagnosis:      'Diagnóstico',
  procedure_note: 'Procedimiento',
  follow_up:      'Seguimiento',
  general_note:   'Nota general',
};

const ADMIN_STATUS_CLASS: Record<string, string> = {
  unpaid:         'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
};

const ADMIN_STATUS_LABEL: Record<string, string> = {
  unpaid:         'Sin pagar',
  partially_paid: 'Parcial',
  paid:           'Pagado',
  overdue:        'Vencido',
  cancelled:      'Cancelado',
};

const CHARGE_STATUS_CLASS: Record<string, string> = {
  pending:        'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
  refunded:       'bg-purple-500/20 text-purple-400',
};

const PM_LABEL: Record<string, string> = {
  cash:            'Efectivo',
  card:            'Tarjeta',
  bank_transfer:   'Transferencia',
  mobile_payment:  'Pago móvil',
  insurance:       'Obra social',
  other:           'Otro',
};

onMounted(async () => {
  await store.loadOne(route.params.id as string);
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button class="text-white/40 hover:text-white transition-colors shrink-0" @click="router.back()">
        <ArrowLeft :size="20" />
      </button>

      <!-- Patient photo -->
      <div v-if="patient" class="relative shrink-0 group">
        <div class="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-semibold select-none"
          :class="patient.photo_url ? '' : 'bg-blue-500/20 text-blue-300 border border-white/10'"
        >
          <img
            v-if="patient.photo_url"
            :src="patient.photo_url"
            :alt="`${patient.first_name} ${patient.last_name}`"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (patient.first_name?.[0] ?? '').toUpperCase() }}{{ (patient.last_name?.[0] ?? '').toUpperCase() }}</span>
        </div>
        <!-- Upload overlay -->
        <button
          class="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          :disabled="uploadingPhoto"
          title="Cambiar foto"
          @click="photoInput?.click()"
        >
          <Camera :size="14" class="text-white" />
        </button>
        <input
          ref="photoInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onPhotoSelected"
        />
      </div>

      <div class="flex-1 min-w-0">
        <div v-if="store.loading" class="h-5 w-48 bg-white/5 animate-pulse rounded-lg"></div>
        <h1 v-else class="text-xl font-semibold text-white truncate">
          {{ patient?.first_name }} {{ patient?.last_name }}
        </h1>
        <p class="text-xs text-white/40">{{ patient?.document_type }} {{ patient?.document_number }}</p>
        <!-- Delete photo link (only when photo exists) -->
        <button
          v-if="patient && patient.photo_url"
          class="text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1 mt-0.5"
          :disabled="uploadingPhoto"
          @click="onDeletePhoto"
        >
          <Trash2 :size="10" /> Eliminar foto
        </button>
      </div>

      <button
        v-if="patient"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-all shrink-0"
        @click="openEdit"
      >
        <Pencil :size="12" /> Editar
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex flex-col gap-3">
      <div class="h-10 bg-white/5 rounded-xl animate-pulse"></div>
      <div class="h-32 bg-white/5 rounded-2xl animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <template v-else-if="patient">
      <!-- Tabs -->
      <!-- Mobile: dropdown -->
      <div class="md:hidden">
        <select
          :value="activeTab"
          @change="loadTabData(($event.target as HTMLSelectElement).value as any)"
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[var(--nexora-primary)]"
        >
          <option v-for="tab in [
            { key: 'summary',       label: 'Resumen' },
            { key: 'personal',      label: 'Datos' },
            { key: 'history',       label: 'Historia' },
            { key: 'consultations', label: 'Consultas' },
            { key: 'payments',      label: 'Pagos' },
            { key: 'appointments',  label: 'Citas' },
            { key: 'quotes',        label: 'Presupuestos' },
            { key: 'documents',     label: 'Documentos' },
          ]" :key="tab.key" :value="tab.key" class="bg-gray-900 text-white">
            {{ tab.label }}
          </option>
        </select>
      </div>
      <!-- Desktop: horizontal tabs -->
      <div class="hidden items-center gap-1 pb-1 md:flex">
        <button
          v-for="tab in [
            { key: 'summary',       label: 'Resumen',       icon: User },
            { key: 'personal',      label: 'Datos',         icon: FileText },
            { key: 'history',       label: 'Historia',      icon: Stethoscope },
            { key: 'consultations', label: 'Consultas',     icon: Stethoscope },
            { key: 'payments',      label: 'Pagos',         icon: CreditCard },
            { key: 'appointments',  label: 'Citas',         icon: CalendarDays },
            { key: 'quotes',        label: 'Presupuestos',  icon: Receipt   },
            { key: 'documents',     label: 'Documentos',    icon: BookOpen  },
          ]"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
          :class="activeTab === tab.key
            ? 'bg-[var(--nexora-primary)] text-white'
            : 'text-white/50 border border-white/10 hover:border-white/30 hover:text-white'"
          @click="loadTabData(tab.key as any)"
        >
          <component :is="tab.icon" :size="12" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: Summary -->
      <div v-if="activeTab === 'summary'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Contacto</p>
          <p class="text-sm text-white">{{ patient.email ?? '—' }}</p>
          <p class="text-sm text-white">{{ patient.phone ?? patient.mobile ?? '—' }}</p>
        </div>
        <div v-if="patient.dental_profile_id" class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Observaciones</p>
          <p class="text-sm text-white/70">{{ patient.dental_observations || '—' }}</p>
        </div>
        <div v-if="patient.allergies" class="flex flex-col gap-2 p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
          <p class="text-xs text-red-400 uppercase tracking-wide font-semibold">Alergias</p>
          <p class="text-sm text-white/80">{{ patient.allergies }}</p>
        </div>
        <div v-if="patient.emergency_contact_name" class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Contacto de emergencia</p>
          <p class="text-sm text-white">{{ patient.emergency_contact_name }}</p>
          <p class="text-sm text-white/60">{{ patient.emergency_contact_phone ?? '—' }}</p>
        </div>
      </div>

      <!-- Tab: Personal data -->
      <div v-if="activeTab === 'personal'" class="flex flex-col gap-4">
        <div class="p-5 rounded-2xl border border-white/10 flex flex-col gap-3" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Datos personales</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><p class="text-xs text-white/40">Nombre</p><p class="text-sm text-white">{{ patient.first_name }} {{ patient.last_name }}</p></div>
            <div><p class="text-xs text-white/40">Documento</p><p class="text-sm text-white">{{ patient.document_type }} {{ patient.document_number ?? '—' }}</p></div>
            <div>
              <p class="text-xs text-white/40">Teléfono</p>
              <div class="flex items-center gap-2">
                <p class="text-sm text-white">{{ patient.phone || '—' }}</p>
                <template v-if="patient.phone">
                  <a :href="`tel:${patient.phone}`" class="p-1 rounded-lg hover:bg-white/10 transition" title="Llamar">
                    <Phone class="h-3.5 w-3.5 text-white/50" />
                  </a>
                  <a :href="`https://wa.me/${cleanPhone(patient.phone)}`" target="_blank" class="p-1 rounded-lg hover:bg-white/10 transition" title="WhatsApp">
                    <MessageCircle class="h-3.5 w-3.5 text-green-400" />
                  </a>
                </template>
              </div>
            </div>
            <div>
              <p class="text-xs text-white/40">Celular</p>
              <div class="flex items-center gap-2">
                <p class="text-sm text-white">{{ patient.mobile || '—' }}</p>
                <template v-if="patient.mobile">
                  <a :href="`tel:${patient.mobile}`" class="p-1 rounded-lg hover:bg-white/10 transition" title="Llamar">
                    <Phone class="h-3.5 w-3.5 text-white/50" />
                  </a>
                  <a :href="`https://wa.me/${cleanPhone(patient.mobile)}`" target="_blank" class="p-1 rounded-lg hover:bg-white/10 transition" title="WhatsApp">
                    <MessageCircle class="h-3.5 w-3.5 text-green-400" />
                  </a>
                </template>
              </div>
            </div>
            <div><p class="text-xs text-white/40">Email</p><p class="text-sm text-white">{{ patient.email ?? '—' }}</p></div>
          </div>
        </div>
      </div>

      <!-- Tab: Clinical history -->
      <div v-if="activeTab === 'history'" class="flex flex-col gap-4">

        <!-- Medical profile current -->
        <div v-if="patient.dental_profile_id" class="p-5 rounded-2xl border border-white/10 flex flex-col gap-3" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Perfil médico actual</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><p class="text-xs text-white/40">Grupo sanguíneo</p><p class="text-sm text-white">{{ patient.blood_type || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Alergias</p><p class="text-sm text-white/80">{{ patient.allergies || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Antecedentes</p><p class="text-sm text-white/80">{{ patient.medical_background || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Medicación actual</p><p class="text-sm text-white/80">{{ patient.current_medications || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Enfermedades crónicas</p><p class="text-sm text-white/80">{{ patient.chronic_conditions || '—' }}</p></div>
          </div>
        </div>

        <!-- Medical history timeline -->
        <div class="flex items-center justify-between">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Registros médicos</p>
          <button
            class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-white/70 bg-white/10 hover:bg-white/20 transition"
            @click="showMedHistPanel = true"
          >
            <Plus class="h-3.5 w-3.5" />
            Agregar registro
          </button>
        </div>

        <div v-if="medicalHistory.length === 0" class="text-center text-white/30 py-6 text-sm">
          No hay registros médicos en el historial.
        </div>
        <div
          v-for="entry in medicalHistory"
          :key="entry.id"
          class="flex flex-col gap-2 px-4 py-3 rounded-xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-white">{{ fmtDate(entry.entry_date) }}</span>
            <span v-if="entry.blood_type" class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{{ entry.blood_type }}</span>
          </div>
          <div v-if="entry.medical_background" class="text-xs text-white/60"><span class="text-white/40">Antecedentes: </span>{{ entry.medical_background }}</div>
          <div v-if="entry.allergies" class="text-xs text-white/60"><span class="text-white/40">Alergias: </span>{{ entry.allergies }}</div>
          <div v-if="entry.current_medications" class="text-xs text-white/60"><span class="text-white/40">Medicación: </span>{{ entry.current_medications }}</div>
          <div v-if="entry.chronic_conditions" class="text-xs text-white/60"><span class="text-white/40">Crónicas: </span>{{ entry.chronic_conditions }}</div>
          <div v-if="entry.dental_observations" class="text-xs text-white/60"><span class="text-white/40">Obs. dentales: </span>{{ entry.dental_observations }}</div>
          <div v-if="entry.notes" class="text-xs text-white/60"><span class="text-white/40">Notas: </span>{{ entry.notes }}</div>
        </div>

        <!-- Clinical history entries -->
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold mt-2">Historial clínico</p>
        <div v-if="clinicalHistory.length === 0" class="text-center text-white/30 py-4 text-sm">
          No hay entradas en la historia clínica.
        </div>
        <div
          v-for="entry in clinicalHistory"
          :key="entry.id"
          class="flex flex-col gap-2 px-4 py-3 rounded-xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{{ HISTORY_TYPE_LABEL[entry.type] ?? entry.type }}</span>
            <span class="text-xs text-white/30">{{ fmtDate(entry.entry_date) }}</span>
          </div>
          <p v-if="entry.title" class="text-sm font-medium text-white">{{ entry.title }}</p>
          <p v-if="entry.description" class="text-xs text-white/60">{{ entry.description }}</p>
          <p v-if="entry.diagnosis" class="text-xs text-white/60"><span class="text-white/40">Diagnóstico: </span>{{ entry.diagnosis }}</p>
        </div>
      </div>

      <!-- Tab: Consultations -->
      <div v-if="activeTab === 'consultations'" class="flex flex-col gap-2">
        <div v-if="consultations.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay consultas registradas.
        </div>
        <div
          v-for="c in consultations"
          :key="c.id"
          class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          @click="router.push(`/dental/consultations/${c.id}`)"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white">{{ fmtDate(c.consultation_date) }}</p>
            <p class="text-xs text-white/40 truncate">{{ c.reason ?? c.treatment?.name ?? '—' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="ADMIN_STATUS_CLASS[c.administrative_status]">
              {{ ADMIN_STATUS_LABEL[c.administrative_status] }}
            </span>
            <p class="text-sm font-semibold text-white">{{ fmt(c.total_amount) }}</p>
          </div>
        </div>
      </div>

      <!-- Tab: Payments -->
      <div v-if="activeTab === 'payments'" class="flex flex-col gap-4">
        <div v-if="debt.length > 0" class="flex flex-col gap-2">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Deuda pendiente</p>
          <div
            v-for="charge in debt"
            :key="charge.id"
            class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white">{{ charge.description ?? 'Cargo' }}</p>
              <p class="text-xs text-white/40">Total: {{ fmt(charge.total_amount) }} · Pagado: {{ fmt(charge.paid_amount) }}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="CHARGE_STATUS_CLASS[charge.status]">
              {{ fmt(charge.pending_amount) }} pendiente
            </span>
          </div>
        </div>
        <div v-if="payments.length > 0" class="flex flex-col gap-2">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Pagos realizados</p>
          <div
            v-for="pay in payments"
            :key="pay.id"
            class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div>
              <p class="text-sm text-white">{{ fmt(pay.amount) }}</p>
              <p class="text-xs text-white/40">{{ PM_LABEL[pay.payment_method] }} · {{ fmtDate(pay.payment_date) }}</p>
            </div>
            <p v-if="pay.reference" class="text-xs text-white/30">{{ pay.reference }}</p>
          </div>
        </div>
        <div v-if="debt.length === 0 && payments.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay movimientos financieros registrados.
        </div>
      </div>

      <!-- Tab: Appointments -->
      <div v-if="activeTab === 'appointments'" class="flex flex-col gap-2">
        <div v-if="appointmentsStore.loading" class="text-center text-white/30 py-10 text-sm">Cargando citas...</div>
        <div v-else-if="appointments.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay citas registradas para este paciente.
        </div>
        <div
          v-for="appt in appointments"
          :key="appt.id"
          class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white">{{ fmtDate(appt.scheduled_start) }}</p>
            <p class="text-xs text-white/40 truncate">
              {{ appt.treatment?.name ?? appt.reason ?? '—' }}
            </p>
          </div>
          <span
            class="shrink-0 px-2 py-0.5 rounded-full text-xs"
            :class="{
              'bg-blue-500/20 text-blue-400':   appt.status === 'scheduled',
              'bg-green-500/20 text-green-400': appt.status === 'confirmed' || appt.status === 'completed' || appt.status === 'checked_in',
              'bg-white/10 text-white/40':      appt.status === 'cancelled' || appt.status === 'no_show' || appt.status === 'rescheduled',
            }"
          >
            {{
              appt.status === 'scheduled'   ? 'Programada'  :
              appt.status === 'confirmed'   ? 'Confirmada'  :
              appt.status === 'checked_in'  ? 'Presente'    :
              appt.status === 'completed'   ? 'Completada'  :
              appt.status === 'cancelled'   ? 'Cancelada'   :
              appt.status === 'no_show'     ? 'No asistió'  :
              appt.status === 'rescheduled' ? 'Reprogramada': appt.status
            }}
          </span>
        </div>
      </div>

      <!-- Tab: Quotes -->
      <div v-if="activeTab === 'quotes'" class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Presupuestos del paciente</p>
          <button
            class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-white/70 bg-white/10 hover:bg-white/20 transition"
            @click="router.push(`/dental/quotes?customer_id=${route.params.id}`)"
          >
            <Plus class="h-3.5 w-3.5" />
            Nuevo presupuesto
          </button>
        </div>

        <div v-if="quotesLoading" class="text-center text-white/30 py-10 text-sm">Cargando...</div>
        <div v-else-if="patientQuotes.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay presupuestos registrados para este paciente.
        </div>
        <div
          v-for="q in patientQuotes"
          :key="q.id"
          class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          @click="router.push(`/dental/quotes/${q.id}`)"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white font-mono">{{ q.quote_number }}</p>
            <p class="text-xs text-white/40">{{ fmtDate(q.quote_date) }}{{ q.valid_until ? ` · Vence: ${fmtDate(q.valid_until)}` : '' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="QUOTE_STATUS_COLORS[q.status]">
              {{ QUOTE_STATUS_LABELS[q.status] }}
            </span>
            <p class="text-sm font-semibold text-white">{{ fmt(q.final_amount) }}</p>
          </div>
        </div>
      </div>

      <!-- Tab: Documents -->
      <div v-if="activeTab === 'documents'" class="flex flex-col gap-3">
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Documentos médicos del paciente</p>

        <div v-if="docsLoading" class="text-center text-white/30 py-10 text-sm">Cargando...</div>

        <div v-else-if="patientDocs.length === 0" class="text-center text-white/30 py-10 text-sm">
          No hay documentos registrados para este paciente.
        </div>

        <div
          v-for="doc in patientDocs"
          :key="doc.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          @click="doc.consultation_id ? router.push(`/dental/consultations/${doc.consultation_id}`) : undefined"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="MEDICAL_DOCUMENT_TYPE_COLORS[doc.document_type]"
              >
                {{ MEDICAL_DOCUMENT_TYPE_LABELS[doc.document_type] }}
              </span>
              <span class="text-xs font-mono text-white/60">{{ doc.document_number }}</span>
              <span class="text-xs text-white/30">{{ fmtDate(doc.document_date) }}</span>
            </div>
            <p v-if="doc.title" class="mt-1 text-sm text-white truncate">{{ doc.title }}</p>
          </div>
          <button
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/60 bg-white/5 hover:bg-white/10 transition shrink-0"
            @click.stop="doc.consultation_id ? router.push(`/dental/consultations/${doc.consultation_id}`) : undefined"
          >
            Ver / Imprimir
          </button>
        </div>
      </div>
    </template>

    <!-- Medical history panel -->
    <NxrSlidePanel :open="showMedHistPanel" title="Agregar registro médico" eyebrow="Historia" @close="showMedHistPanel = false">
      <form class="flex flex-col gap-4" @submit.prevent="saveMedHist">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha *</label>
          <input v-model="medHistForm.entry_date" type="date" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Grupo sanguíneo</label>
          <input v-model="medHistForm.blood_type" type="text" placeholder="Ej: A+" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Antecedentes médicos</label>
          <textarea v-model="medHistForm.medical_background" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Alergias</label>
          <textarea v-model="medHistForm.allergies" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Medicación actual</label>
          <textarea v-model="medHistForm.current_medications" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Enfermedades crónicas</label>
          <textarea v-model="medHistForm.chronic_conditions" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Observaciones dentales</label>
          <textarea v-model="medHistForm.dental_observations" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <textarea v-model="medHistForm.notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p v-if="medHistError" class="text-red-400 text-sm">{{ medHistError }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2 text-sm text-white/70" @click="showMedHistPanel = false">Cancelar</button>
          <button type="submit" :disabled="savingMedHist" class="rounded-xl px-4 py-2 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingMedHist ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Edit panel -->
    <NxrSlidePanel :open="showEditPanel" title="Editar paciente" eyebrow="Dental" @close="showEditPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="saveEdit">
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Datos personales</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Nombre *</label>
            <input v-model="editForm.first_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Apellido *</label>
            <input v-model="editForm.last_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Tipo documento</label>
            <select v-model="editForm.document_type" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
              <option value="DNI">DNI</option>
              <option value="Cedula">Cédula</option>
              <option value="RUT">RUT</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="CUIL">CUIL</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Número de documento</label>
            <input v-model="editForm.document_number" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Teléfono</label>
            <input v-model="editForm.phone" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Celular</label>
            <input v-model="editForm.mobile" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Email</label>
          <input v-model="editForm.email" type="email" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha de nacimiento</label>
          <input v-model="editForm.birth_date" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Dirección</label>
          <input v-model="editForm.address" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Ciudad</label>
          <input v-model="editForm.city" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas internas</label>
          <textarea v-model="editForm.customer_notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Historial médico</p>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Grupo sanguíneo</label>
          <select v-model="editForm.blood_type" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option value="">Sin especificar</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Antecedentes médicos</label>
          <textarea v-model="editForm.medical_background" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Alergias</label>
          <input v-model="editForm.allergies" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Medicación actual</label>
          <input v-model="editForm.current_medications" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Enfermedades crónicas</label>
          <input v-model="editForm.chronic_conditions" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Observaciones dentales</label>
          <textarea v-model="editForm.dental_observations" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Contacto de emergencia</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Nombre</label>
            <input v-model="editForm.emergency_contact_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Teléfono</label>
            <input v-model="editForm.emergency_contact_phone" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showEditPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="saveEdit">
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>
  </div>
</template>
