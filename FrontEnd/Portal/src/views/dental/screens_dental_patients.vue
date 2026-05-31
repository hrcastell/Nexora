<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, UserRound, ChevronRight } from 'lucide-vue-next';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { DentalPatientFormData } from '../../types/dental';

const router = useRouter();
const store  = useDentalPatientsStore();

const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);
const search    = ref('');

const defaultForm = (): DentalPatientFormData => ({
  first_name: '',
  last_name: '',
  document_type: 'DNI',
  document_number: '',
  phone: '',
  email: '',
  medical_background: '',
  allergies: '',
  current_medications: '',
  chronic_conditions: '',
  dental_observations: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

const form = ref<DentalPatientFormData>(defaultForm());

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    store.load({ search: search.value || undefined });
  }, 350);
}

function openCreate() {
  form.value = defaultForm();
  saveError.value = null;
  showPanel.value = true;
}

async function save() {
  saving.value = true;
  saveError.value = null;
  try {
    await store.create(form.value);
    showPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar paciente';
  } finally {
    saving.value = false;
  }
}

onMounted(() => store.load());
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Pacientes</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nuevo paciente
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        v-model="search"
        type="text"
        placeholder="Buscar por nombre o documento..."
        class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
        @input="onSearchInput"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <!-- Empty -->
    <div v-else-if="store.items.length === 0" class="flex flex-col items-center gap-4 py-20 text-center">
      <UserRound :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No se encontraron pacientes.</p>
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Registrar primer paciente
      </button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <!-- Desktop header -->
      <div class="hidden md:grid md:grid-cols-[1fr_160px_160px_80px_40px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Nombre</span>
        <span>Documento</span>
        <span>Teléfono</span>
        <span class="text-center">Estado</span>
        <span></span>
      </div>

      <div
        v-for="p in store.items"
        :key="p.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/30 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/dental/patients/${p.id}`)"
      >
        <!-- Mobile -->
        <div class="flex-1 min-w-0 md:hidden">
          <p class="text-sm font-medium text-white truncate">{{ p.first_name }} {{ p.last_name }}</p>
          <p class="text-xs text-white/40 truncate">
            {{ p.document_type ?? 'DOC' }}: {{ p.document_number ?? '—' }} · {{ p.phone ?? p.mobile ?? '—' }}
          </p>
        </div>

        <!-- Desktop -->
        <div class="hidden md:grid md:grid-cols-[1fr_160px_160px_80px_40px] gap-4 items-center flex-1">
          <p class="text-sm text-white truncate">{{ p.first_name }} {{ p.last_name }}</p>
          <p class="text-xs text-white/60">{{ p.document_type ?? '—' }} {{ p.document_number ?? '—' }}</p>
          <p class="text-xs text-white/60">{{ p.phone ?? p.mobile ?? '—' }}</p>
          <span
            class="px-2 py-0.5 rounded-full text-xs w-fit"
            :class="p.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'"
          >
            {{ p.status === 'active' ? 'Activo' : (p.status ?? 'Activo') }}
          </span>
          <ChevronRight :size="16" class="text-white/30" />
        </div>

        <!-- Mobile chevron -->
        <ChevronRight :size="16" class="text-white/30 shrink-0 md:hidden" />
      </div>
    </div>

    <!-- Create panel -->
    <NxrSlidePanel :open="showPanel" title="Nuevo paciente" eyebrow="Dental" @close="showPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Datos personales</p>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Nombre *</label>
            <input v-model="form.first_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Apellido *</label>
            <input v-model="form.last_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Tipo documento</label>
            <select v-model="form.document_type" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
              <option value="DNI">DNI</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="CUIL">CUIL</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">N° documento</label>
            <input v-model="form.document_number" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Teléfono</label>
            <input v-model="form.phone" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Email</label>
            <input v-model="form.email" type="email" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>

        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Historial médico</p>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Antecedentes médicos</label>
          <textarea v-model="form.medical_background" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Alergias</label>
          <input v-model="form.allergies" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Medicación actual</label>
          <input v-model="form.current_medications" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Enfermedades crónicas</label>
          <input v-model="form.chronic_conditions" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Observaciones dentales</label>
          <textarea v-model="form.dental_observations" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>

        <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Contacto de emergencia</p>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Nombre</label>
            <input v-model="form.emergency_contact_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Teléfono</label>
            <input v-model="form.emergency_contact_phone" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>

        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : 'Registrar paciente' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
