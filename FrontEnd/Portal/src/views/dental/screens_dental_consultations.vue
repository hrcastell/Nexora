<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Stethoscope } from 'lucide-vue-next';
import { useDentalConsultationsStore } from '../../stores/dentalConsultations';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import { useToast } from '../../composables/useToast';
import type { DentalConsultationFormData, DentalPatientFormData } from '../../types/dental';

const router = useRouter();

const store = useDentalConsultationsStore();
const patientsStore = useDentalPatientsStore();
const treatmentsStore = useDentalTreatmentsStore();
const { toasts, triggerToast, removeToast } = useToast();

const selectedService = ref<any>(null);

function onServiceSelect(treatmentId: string | number) {
  const trt = treatmentsStore.items.find(t => String(t.id) === String(treatmentId));
  selectedService.value = trt || null;
  if (trt) form.value.total_amount = trt.final_price;
}


const patientSearch = ref('');
const selectedPatient = ref<any>(null);
const showPatientDrop = ref(false);
const showInlinePatientForm = ref(false);
const savingInlinePatient = ref(false);
const inlinePatientForm = ref<DentalPatientFormData>({ first_name: '', last_name: '', document_number: '', phone: '' });

let patientSearchTimer: ReturnType<typeof setTimeout> | null = null;

function onPatientInput() {
  selectedPatient.value = null;
  form.value.customer_id = '';
  if (patientSearchTimer) clearTimeout(patientSearchTimer);
  if (!patientSearch.value.trim()) { showPatientDrop.value = false; return; }
  patientSearchTimer = setTimeout(async () => {
    await patientsStore.load({ search: patientSearch.value });
    showPatientDrop.value = true;
  }, 300);
}

function selectPatient(p: any) {
  selectedPatient.value = p;
  form.value.customer_id = p.id;
  patientSearch.value = `${p.first_name} ${p.last_name}`;
  showPatientDrop.value = false;
}

function focusPatientDrop() {
  if (patientSearch.value && patientsStore.items.length) showPatientDrop.value = true;
}

function blurPatientDrop() {
  setTimeout(() => { showPatientDrop.value = false; }, 200);
}

function clearPatient() {
  selectedPatient.value = null;
  form.value.customer_id = '';
  patientSearch.value = '';
  showInlinePatientForm.value = false;
}

function openInlinePatientForm() {
  const parts = patientSearch.value.trim().split(/\s+/);
  inlinePatientForm.value = {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
    document_number: '',
    phone: '',
  };
  showInlinePatientForm.value = true;
  showPatientDrop.value = false;
}

async function saveInlinePatient() {
  if (!inlinePatientForm.value.first_name?.trim() || !inlinePatientForm.value.last_name?.trim()) {
    saveError.value = 'Nombre y apellido del paciente son obligatorios.';
    return;
  }
  savingInlinePatient.value = true;
  saveError.value = null;
  try {
    const patient = await patientsStore.create(inlinePatientForm.value);
    selectPatient(patient);
    showInlinePatientForm.value = false;
    triggerToast('Éxito', 'Paciente creado y seleccionado', 'success');
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al crear paciente';
  } finally {
    savingInlinePatient.value = false;
  }
}

const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);

const statusFilter      = ref('');
const adminStatusFilter = ref('');

const defaultForm = (): DentalConsultationFormData => ({
  customer_id: '',
  treatment_id: undefined,
  reason: '',
  diagnosis: '',
  clinical_notes: '',
  indications: '',
  total_amount: 0,
  requires_follow_up: false,
  requires_multiple_sessions: false,
  estimated_sessions: undefined,
  next_session_date: undefined,
  follow_up_notes: undefined,
});

const form = ref<DentalConsultationFormData>(defaultForm());

const STATUS_LABEL: Record<string, string> = {
  borrador:                'Borrador',
  creada:                  'Creada',
  en_evaluacion:           'En Evaluación',
  cotizada:                'Cotizada',
  propuesta_pendiente:     'Propuesta Pendiente',
  aceptada:                'Aceptada',
  en_tratamiento:          'En Tratamiento',
  sesion_pendiente:        'Sesión Pendiente',
  finalizada_clinicamente: 'Finalizada',
  pendiente_pago:          'Pendiente Pago',
  cerrada:                 'Cerrada',
  rechazada:               'Rechazada',
  cancelled:               'Cancelada',
  no_show:                 'No Asistió',
  voided:                  'Anulada',
};

const STATUS_CLASS: Record<string, string> = {
  borrador:                'bg-white/10 text-white/40',
  creada:                  'bg-blue-500/20 text-blue-400',
  en_evaluacion:           'bg-indigo-500/20 text-indigo-400',
  cotizada:                'bg-violet-500/20 text-violet-400',
  propuesta_pendiente:     'bg-amber-500/20 text-amber-400',
  aceptada:                'bg-cyan-500/20 text-cyan-400',
  en_tratamiento:          'bg-green-500/20 text-green-400',
  sesion_pendiente:        'bg-yellow-500/20 text-yellow-400',
  finalizada_clinicamente: 'bg-teal-500/20 text-teal-400',
  pendiente_pago:          'bg-orange-500/20 text-orange-400',
  cerrada:                 'bg-slate-500/20 text-slate-400',
  rechazada:               'bg-red-500/20 text-red-400',
  cancelled:               'bg-red-500/20 text-red-400',
  no_show:                 'bg-zinc-500/20 text-zinc-400',
  voided:                  'bg-red-900/30 text-red-300',
};

const ADMIN_STATUS_LABEL: Record<string, string> = {
  unpaid:         'Sin pagar',
  partially_paid: 'Pago parcial',
  paid:           'Pagado',
  overdue:        'Vencido',
  cancelled:      'Cancelado',
};

const ADMIN_STATUS_CLASS: Record<string, string> = {
  unpaid:         'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
};

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function applyFilters() {
  store.load({
    status: statusFilter.value || undefined,
    administrative_status: adminStatusFilter.value || undefined,
  });
}

function openCreate() {
  form.value = defaultForm();
  saveError.value = null;
  patientSearch.value = '';
  selectedPatient.value = null;
  selectedService.value = null;
  showPatientDrop.value = false;
  showInlinePatientForm.value = false;
  showPanel.value = true;
}

async function save() {
  if (!form.value.customer_id) {
    saveError.value = 'Seleccioná un paciente antes de continuar.';
    return;
  }
  saving.value = true;
  saveError.value = null;
  try {
    await store.create(form.value);
    triggerToast('Éxito', 'Consulta creada', 'success');
    showPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar consulta';
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar consulta', 'error');
  } finally {
    saving.value = false;
  }
}

function openDetail(id: number | string) {
  router.push(`/dental/consultations/${id}`);
}


onMounted(() => {
  store.load();
  patientsStore.load();
  treatmentsStore.load();
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Consultas</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nueva consulta
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="statusFilter" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" @change="applyFilters">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="creada">Creada</option>
        <option value="en_evaluacion">En Evaluación</option>
        <option value="cotizada">Cotizada</option>
        <option value="propuesta_pendiente">Propuesta Pendiente</option>
        <option value="aceptada">Aceptada</option>
        <option value="en_tratamiento">En Tratamiento</option>
        <option value="sesion_pendiente">Sesión Pendiente</option>
        <option value="finalizada_clinicamente">Finalizada</option>
        <option value="pendiente_pago">Pendiente Pago</option>
        <option value="cerrada">Cerrada</option>
        <option value="rechazada">Rechazada</option>
        <option value="cancelled">Cancelada</option>
        <option value="no_show">No Asistió</option>
        <option value="voided">Anulada</option>
      </select>
      <select v-model="adminStatusFilter" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" @change="applyFilters">
        <option value="">Todos los pagos</option>
        <option value="unpaid">Sin pagar</option>
        <option value="partially_paid">Pago parcial</option>
        <option value="paid">Pagado</option>
        <option value="overdue">Vencido</option>
      </select>
      <span class="text-xs text-white/30">{{ store.items.length }} consultas</span>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <!-- Empty -->
    <div v-else-if="store.items.length === 0" class="flex flex-col items-center gap-4 py-20 text-center">
      <Stethoscope :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No hay consultas registradas.</p>
      <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Crear primera consulta
      </button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <!-- Desktop header -->
      <div class="hidden md:grid md:grid-cols-[120px_1fr_1fr_130px_130px_80px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Fecha</span>
        <span>Paciente</span>
        <span>Tratamiento / Motivo</span>
        <span>Estado</span>
        <span>Pago</span>
        <span class="text-right">Total</span>
      </div>

      <div
        v-for="c in store.items"
        :key="c.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="openDetail(c.id)"
      >
        <!-- Mobile -->
        <div class="flex-1 min-w-0 md:hidden">
          <p class="text-sm font-medium text-white truncate">{{ c.customer?.first_name }} {{ c.customer?.last_name }}</p>
          <p class="text-xs text-white/40">{{ fmtDate(c.consultation_date) }} · {{ c.treatment?.name ?? c.reason ?? '—' }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="STATUS_CLASS[c.status]">{{ STATUS_LABEL[c.status] }}</span>
            <span class="px-2 py-0.5 rounded-full text-xs" :class="ADMIN_STATUS_CLASS[c.administrative_status]">{{ ADMIN_STATUS_LABEL[c.administrative_status] }}</span>
            <span class="text-xs font-semibold text-white">{{ fmt(c.total_amount) }}</span>
          </div>
        </div>

        <!-- Desktop -->
        <div class="hidden md:grid md:grid-cols-[120px_1fr_1fr_130px_130px_80px] gap-4 items-center flex-1">
          <p class="text-xs text-white/60">{{ fmtDate(c.consultation_date) }}</p>
          <p class="text-sm text-white truncate">{{ c.customer?.first_name }} {{ c.customer?.last_name }}</p>
          <p class="text-xs text-white/60 truncate">{{ c.treatment?.name ?? c.reason ?? '—' }}</p>
          <span class="px-2 py-0.5 rounded-full text-xs w-fit" :class="STATUS_CLASS[c.status]">{{ STATUS_LABEL[c.status] }}</span>
          <span class="px-2 py-0.5 rounded-full text-xs w-fit" :class="ADMIN_STATUS_CLASS[c.administrative_status]">{{ ADMIN_STATUS_LABEL[c.administrative_status] }}</span>
          <p class="text-sm font-semibold text-white text-right">{{ fmt(c.total_amount) }}</p>
        </div>
      </div>
    </div>

    <!-- Create panel -->
    <NxrSlidePanel :open="showPanel" title="Nueva consulta" eyebrow="Dental" @close="showPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <div class="flex flex-col gap-1.5 relative">
          <label class="text-xs text-white/50">Paciente *</label>
          <input
            v-model="patientSearch"
            type="text"
            placeholder="Buscar por nombre o documento..."
            autocomplete="off"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
            @input="onPatientInput"
            @focus="focusPatientDrop"
            @blur="blurPatientDrop"
          />
          <div v-if="selectedPatient" class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--nexora-primary)]/20 border border-[var(--nexora-primary)]/30 text-xs text-white">
            <span>{{ selectedPatient.first_name }} {{ selectedPatient.last_name }}</span>
            <button type="button" class="text-white/50 hover:text-white ml-2" @click="clearPatient">✕</button>
          </div>
          <div
            v-if="showPatientDrop && patientsStore.items.length > 0"
            class="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-white/20 shadow-xl"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <button
              v-for="p in patientsStore.items"
              :key="p.id"
              type="button"
              class="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              @mousedown.prevent="selectPatient(p)"
            >
              {{ p.first_name }} {{ p.last_name }}
              <span v-if="p.document_number" class="text-xs text-white/40 ml-2">{{ p.document_type }} {{ p.document_number }}</span>
            </button>
          </div>
          <div v-if="patientSearch && !selectedPatient && showPatientDrop && patientsStore.items.length === 0" class="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            <p>No encontramos ese paciente.</p>
            <button type="button" class="mt-2 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-yellow-50 hover:bg-yellow-500/30" @mousedown.prevent="openInlinePatientForm">
              Crear paciente acá
            </button>
          </div>
          <div v-if="showInlinePatientForm" class="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
            <input v-model="inlinePatientForm.first_name" type="text" placeholder="Nombre" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            <input v-model="inlinePatientForm.last_name" type="text" placeholder="Apellido" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            <input v-model="inlinePatientForm.document_number" type="text" placeholder="Documento" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            <input v-model="inlinePatientForm.phone" type="text" placeholder="Teléfono" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            <button type="button" class="rounded-xl bg-[var(--nexora-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2" :disabled="savingInlinePatient" @mousedown.prevent="saveInlinePatient">
              {{ savingInlinePatient ? 'Creando...' : 'Crear y seleccionar paciente' }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Tratamiento</label>
          <select
            v-model="form.treatment_id"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
            @change="onServiceSelect(form.treatment_id as string)"
          >
            <option value="">Sin tratamiento</option>
            <option v-for="s in treatmentsStore.items" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <div v-if="selectedService" class="flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
            <div class="flex justify-between">
              <span>Precio total</span>
              <span class="font-semibold text-white">${{ Math.round(selectedService.final_price ?? 0).toLocaleString('es-AR') }}</span>
            </div>
            <div v-if="(selectedService.treatments?.length ?? 0) > 0">
              <p class="text-white/40 mb-1">Tratamientos incluidos:</p>
              <p v-for="t in selectedService.treatments" :key="t.treatment_id" class="pl-2">· {{ t.treatment_name }}</p>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Motivo</label>
          <input v-model="form.reason" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Diagnóstico</label>
          <textarea v-model="form.diagnosis" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas clínicas</label>
          <textarea v-model="form.clinical_notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Indicaciones</label>
          <textarea v-model="form.indications" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <!-- Seguimiento -->
        <div class="flex flex-col gap-3 pt-2 border-t border-white/10">
          <p class="text-xs text-white/50 uppercase tracking-wide font-semibold">Seguimiento</p>
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input v-model="form.requires_follow_up" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Requiere seguimiento</span>
          </label>
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input v-model="form.requires_multiple_sessions" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Requiere múltiples sesiones</span>
          </label>
          <template v-if="form.requires_multiple_sessions">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs text-white/50">Cantidad estimada de sesiones</label>
                <input v-model.number="form.estimated_sessions" type="number" min="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" placeholder="Ej: 3" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs text-white/50">Próxima sesión</label>
                <input v-model="form.next_session_date" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
              </div>
            </div>
          </template>
          <template v-if="form.requires_follow_up">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-white/50">Observación de seguimiento</label>
              <textarea v-model="form.follow_up_notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none" placeholder="Indicá qué debe controlarse en el próximo contacto..."></textarea>
            </div>
          </template>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving || !form.customer_id" @click="save">
          {{ saving ? 'Guardando...' : 'Crear consulta' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>
  </div>
</template>
