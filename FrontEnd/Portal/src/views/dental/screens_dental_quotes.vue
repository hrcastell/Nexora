<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Plus, FileText } from 'lucide-vue-next';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import { useToast } from '../../composables/useToast';
import { dentalQuotesService } from '../../services/dentalQuotesService';
import type { DentalQuote, DentalQuoteFormData, DentalPatient } from '../../types/dental';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '../../types/dental';

const router = useRouter();
const route  = useRoute();
const patientsStore = useDentalPatientsStore();
const { toasts, triggerToast, removeToast } = useToast();

const quotes      = ref<DentalQuote[]>([]);
const total       = ref(0);
const loading     = ref(false);
const loadError   = ref<string | null>(null);
const page        = ref(1);
const statusFilter = ref('');

const showPanel  = ref(false);
const saving     = ref(false);
const saveError  = ref<string | null>(null);

// Patient search
const patientSearch   = ref('');
const selectedPatient = ref<DentalPatient | null>(null);
const showPatientDrop = ref(false);
let patientSearchTimer: ReturnType<typeof setTimeout> | null = null;

const defaultForm = (): DentalQuoteFormData => ({
  customer_id:    '',
  valid_until:    '',
  notes:          '',
  conditions_text: '',
});
const form = ref<DentalQuoteFormData>(defaultForm());

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

function selectPatient(p: DentalPatient) {
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

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const params: Record<string, unknown> = { page: page.value, limit: 20 };
    if (statusFilter.value) params.status = statusFilter.value;
    // Pre-filter by customer_id from query param if coming from patient detail
    const qCustomerId = route.query.customer_id;
    if (qCustomerId) params.customer_id = Number(qCustomerId);
    const res = await dentalQuotesService.list(params as { customer_id?: number; status?: string; page?: number; limit?: number });
    quotes.value = res.data.data ?? [];
    total.value  = res.data.total ?? 0;
  } catch (e: any) {
    loadError.value = e?.response?.data?.error || 'Error al cargar presupuestos';
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  form.value = defaultForm();
  saveError.value = null;
  patientSearch.value = '';
  selectedPatient.value = null;
  showPatientDrop.value = false;

  // Pre-fill patient if coming from patient detail
  const qCustomerId = route.query.customer_id;
  if (qCustomerId) {
    const existing = patientsStore.items.find(p => String(p.id) === String(qCustomerId));
    if (existing) {
      selectedPatient.value = existing;
      form.value.customer_id = existing.id;
      patientSearch.value = `${existing.first_name} ${existing.last_name}`;
    }
  }

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
    const payload: DentalQuoteFormData = {
      customer_id: form.value.customer_id,
    };
    if (form.value.valid_until) payload.valid_until = form.value.valid_until;
    if (form.value.notes) payload.notes = form.value.notes;
    if (form.value.conditions_text) payload.conditions_text = form.value.conditions_text;

    const res = await dentalQuotesService.create(payload);
    triggerToast('Éxito', 'Presupuesto creado', 'success');
    showPanel.value = false;
    router.push(`/dental/quotes/${res.data.data.id}`);
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al crear presupuesto';
    triggerToast('Error', e?.response?.data?.error || 'Error al crear presupuesto', 'error');
  } finally {
    saving.value = false;
  }
}

function openDetail(id: number) {
  router.push(`/dental/quotes/${id}`);
}

onMounted(() => {
  load();
  patientsStore.load();
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Presupuestos</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nuevo Presupuesto
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <select
        v-model="statusFilter"
        class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none"
        @change="load"
      >
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="sent">Enviado</option>
        <option value="accepted">Aceptado</option>
        <option value="rejected">Rechazado</option>
        <option value="expired">Vencido</option>
        <option value="converted">Convertido</option>
      </select>
      <span class="text-xs text-white/30">{{ total }} presupuestos</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-center text-red-400 py-10 text-sm">{{ loadError }}</div>

    <!-- Empty -->
    <div v-else-if="quotes.length === 0" class="flex flex-col items-center gap-4 py-20 text-center">
      <FileText :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No hay presupuestos registrados.</p>
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Crear primer presupuesto
      </button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <!-- Desktop header -->
      <div class="hidden md:grid md:grid-cols-[120px_1fr_120px_120px_120px_60px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Número</span>
        <span>Paciente</span>
        <span>Fecha</span>
        <span>Vence</span>
        <span>Estado</span>
        <span class="text-right">Total</span>
      </div>

      <div
        v-for="q in quotes"
        :key="q.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="openDetail(q.id)"
      >
        <!-- Mobile -->
        <div class="flex-1 min-w-0 md:hidden">
          <p class="text-sm font-medium text-white truncate">{{ q.customer_first_name }} {{ q.customer_last_name }}</p>
          <p class="text-xs text-white/40">{{ q.quote_number }} · {{ fmtDate(q.quote_date) }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="QUOTE_STATUS_COLORS[q.status]">{{ QUOTE_STATUS_LABELS[q.status] }}</span>
            <span class="text-xs font-semibold text-white">{{ fmt(q.final_amount) }}</span>
          </div>
        </div>

        <!-- Desktop -->
        <div class="hidden md:grid md:grid-cols-[120px_1fr_120px_120px_120px_60px] gap-4 items-center flex-1">
          <p class="text-xs text-white font-mono">{{ q.quote_number }}</p>
          <p class="text-sm text-white truncate">{{ q.customer_first_name }} {{ q.customer_last_name }}</p>
          <p class="text-xs text-white/60">{{ fmtDate(q.quote_date) }}</p>
          <p class="text-xs text-white/60">{{ q.valid_until ? fmtDate(q.valid_until) : '—' }}</p>
          <span class="px-2 py-0.5 rounded-full text-xs w-fit" :class="QUOTE_STATUS_COLORS[q.status]">{{ QUOTE_STATUS_LABELS[q.status] }}</span>
          <p class="text-sm font-semibold text-white text-right">{{ fmt(q.final_amount) }}</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > 20" class="flex items-center justify-center gap-3 mt-2">
      <button
        class="px-3 py-1.5 rounded-xl text-xs text-white/60 border border-white/10 hover:border-white/30 disabled:opacity-30"
        :disabled="page === 1"
        @click="page--; load()"
      >
        Anterior
      </button>
      <span class="text-xs text-white/40">Página {{ page }}</span>
      <button
        class="px-3 py-1.5 rounded-xl text-xs text-white/60 border border-white/10 hover:border-white/30 disabled:opacity-30"
        :disabled="page * 20 >= total"
        @click="page++; load()"
      >
        Siguiente
      </button>
    </div>

    <!-- Create panel -->
    <NxrSlidePanel :open="showPanel" title="Nuevo Presupuesto" eyebrow="Dental" @close="showPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <!-- Patient search -->
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
          <div
            v-if="selectedPatient"
            class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--nexora-primary)]/20 border border-[var(--nexora-primary)]/30 text-xs text-white"
          >
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

        <!-- Valid until -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Válido hasta</label>
          <input
            v-model="form.valid_until"
            type="date"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 resize-none"
            placeholder="Observaciones generales..."
          />
        </div>

        <!-- Error -->
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl text-sm text-white/60 border border-white/10 hover:border-white/30"
            @click="showPanel = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? 'Creando...' : 'Crear presupuesto' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
  </div>
</template>
