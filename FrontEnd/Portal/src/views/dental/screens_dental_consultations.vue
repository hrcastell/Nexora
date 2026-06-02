<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Stethoscope } from 'lucide-vue-next';
import { useDentalConsultationsStore } from '../../stores/dentalConsultations';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import { useDentalServicesStore } from '../../stores/dentalServices';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { DentalConsultationFormData } from '../../types/dental';

const router = useRouter();

const store = useDentalConsultationsStore();
const patientsStore = useDentalPatientsStore();
const servicesStore = useDentalServicesStore();

const selectedService = ref<any>(null);

function onServiceSelect(serviceId: string | number) {
  const svc = servicesStore.items.find(s => String(s.id) === String(serviceId));
  selectedService.value = svc || null;
  if (svc) form.value.total_amount = svc.final_price;
}


const patientSearch = ref('');
const selectedPatient = ref<any>(null);
const showPatientDrop = ref(false);

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
}

const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);

const statusFilter      = ref('');
const adminStatusFilter = ref('');

const defaultForm = (): DentalConsultationFormData => ({
  customer_id: '',
  reason: '',
  diagnosis: '',
  clinical_notes: '',
  indications: '',
  total_amount: 0,
});

const form = ref<DentalConsultationFormData>(defaultForm());

const STATUS_LABEL: Record<string, string> = {
  draft:       'Borrador',
  scheduled:   'Programada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
};

const STATUS_CLASS: Record<string, string> = {
  draft:       'bg-white/10 text-white/40',
  scheduled:   'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-cyan-500/20 text-cyan-400',
  completed:   'bg-green-500/20 text-green-400',
  cancelled:   'bg-red-500/20 text-red-400',
  no_show:     'bg-orange-500/20 text-orange-400',
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
  showPanel.value = true;
}

async function save() {
  saving.value = true;
  saveError.value = null;
  try {
    await store.create(form.value);
    showPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar consulta';
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
  servicesStore.load();
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
        <option value="draft">Borrador</option>
        <option value="scheduled">Programada</option>
        <option value="in_progress">En curso</option>
        <option value="completed">Completada</option>
        <option value="cancelled">Cancelada</option>
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
        <span>Servicio / Motivo</span>
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
          <p class="text-xs text-white/40">{{ fmtDate(c.consultation_date) }} · {{ c.service?.name ?? c.reason ?? '—' }}</p>
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
          <p class="text-xs text-white/60 truncate">{{ c.service?.name ?? c.reason ?? '—' }}</p>
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
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Servicio</label>
          <select
            v-model="form.service_id"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
            @change="onServiceSelect(form.service_id as string)"
          >
            <option value="">Sin servicio</option>
            <option v-for="s in servicesStore.items" :key="s.id" :value="s.id">{{ s.name }}</option>
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
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto total</label>
          <input v-model.number="form.total_amount" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : 'Crear consulta' }}
        </button>
      </template>
    </NxrSlidePanel>

  </div>
</template>
