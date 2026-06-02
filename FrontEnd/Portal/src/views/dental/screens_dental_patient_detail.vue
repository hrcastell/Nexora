<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, User, FileText, Stethoscope, CreditCard, CalendarDays, Pencil } from 'lucide-vue-next';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { DentalClinicalHistoryEntry, DentalConsultation, DentalPayment, DentalCharge } from '../../types/dental';

const route  = useRoute();
const router = useRouter();
const store  = useDentalPatientsStore();

const activeTab         = ref<'summary' | 'personal' | 'history' | 'consultations' | 'payments' | 'appointments'>('summary');
const showEditPanel     = ref(false);
const saving            = ref(false);
const saveError         = ref<string | null>(null);
const clinicalHistory   = ref<DentalClinicalHistoryEntry[]>([]);
const consultations     = ref<DentalConsultation[]>([]);
const payments          = ref<DentalPayment[]>([]);
const debt              = ref<DentalCharge[]>([]);

const patient = computed(() => store.current);

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
    showEditPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar cambios';
  } finally {
    saving.value = false;
  }
}

async function loadTabData(tab: typeof activeTab.value) {
  activeTab.value = tab;
  if (tab === 'history' && clinicalHistory.value.length === 0) {
    clinicalHistory.value = await store.getClinicalHistory(route.params.id as string);
  }
  if (tab === 'consultations' && consultations.value.length === 0) {
    consultations.value = await store.getConsultations(route.params.id as string);
  }
  if (tab === 'payments' && payments.value.length === 0) {
    payments.value = await store.getPayments(route.params.id as string);
    debt.value = await store.getDebt(route.params.id as string);
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
      <button class="text-white/40 hover:text-white transition-colors" @click="router.back()">
        <ArrowLeft :size="20" />
      </button>
      <div class="flex-1 min-w-0">
        <div v-if="store.loading" class="h-5 w-48 bg-white/5 animate-pulse rounded-lg"></div>
        <h1 v-else class="text-xl font-semibold text-white truncate">
          {{ patient?.first_name }} {{ patient?.last_name }}
        </h1>
        <p class="text-xs text-white/40">{{ patient?.document_type }} {{ patient?.document_number }}</p>
      </div>
      <button
        v-if="patient"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-all"
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
      <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          v-for="tab in [
            { key: 'summary',       label: 'Resumen',       icon: User },
            { key: 'personal',      label: 'Datos',         icon: FileText },
            { key: 'history',       label: 'Historia',      icon: Stethoscope },
            { key: 'consultations', label: 'Consultas',     icon: Stethoscope },
            { key: 'payments',      label: 'Pagos',         icon: CreditCard },
            { key: 'appointments',  label: 'Citas',         icon: CalendarDays },
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
          <div class="grid grid-cols-2 gap-3">
            <div><p class="text-xs text-white/40">Nombre</p><p class="text-sm text-white">{{ patient.first_name }} {{ patient.last_name }}</p></div>
            <div><p class="text-xs text-white/40">Documento</p><p class="text-sm text-white">{{ patient.document_type }} {{ patient.document_number ?? '—' }}</p></div>
            <div><p class="text-xs text-white/40">Teléfono</p><p class="text-sm text-white">{{ patient.phone ?? patient.mobile ?? '—' }}</p></div>
            <div><p class="text-xs text-white/40">Email</p><p class="text-sm text-white">{{ patient.email ?? '—' }}</p></div>
          </div>
        </div>
        <div v-if="patient.dental_profile_id" class="p-5 rounded-2xl border border-white/10 flex flex-col gap-3" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Historial médico</p>
          <div class="grid grid-cols-1 gap-3">
            <div><p class="text-xs text-white/40">Antecedentes</p><p class="text-sm text-white/80">{{ patient.medical_background || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Alergias</p><p class="text-sm text-white/80">{{ patient.allergies || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Medicación actual</p><p class="text-sm text-white/80">{{ patient.current_medications || '—' }}</p></div>
            <div><p class="text-xs text-white/40">Enfermedades crónicas</p><p class="text-sm text-white/80">{{ patient.chronic_conditions || '—' }}</p></div>
          </div>
        </div>
      </div>

      <!-- Tab: Clinical history -->
      <div v-if="activeTab === 'history'" class="flex flex-col gap-2">
        <div v-if="clinicalHistory.length === 0" class="text-center text-white/30 py-10 text-sm">
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
            <p class="text-xs text-white/40 truncate">{{ c.reason ?? c.service?.name ?? '—' }}</p>
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
        <div class="text-center text-white/30 py-10 text-sm">
          Ver citas desde el módulo de <button class="text-[var(--nexora-primary)] hover:underline" @click="router.push('/dental/appointments')">Citas</button>.
        </div>
      </div>
    </template>

    <!-- Edit panel -->
    <NxrSlidePanel :open="showEditPanel" title="Editar paciente" eyebrow="Dental" @close="showEditPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="saveEdit">
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Datos personales</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Nombre *</label>
            <input v-model="editForm.first_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Apellido *</label>
            <input v-model="editForm.last_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
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
        <div class="grid grid-cols-2 gap-4">
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
  </div>
</template>
