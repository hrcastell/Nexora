<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Search, User, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-vue-next';
import { useGarageEmployeesStore } from '../../stores/garageEmployees';
import widgets_garage_employee_form_modal from '../../widgets/widgets_garage_employee_form_modal.vue';
import type { Employee } from '../../types/garage';

const store    = useGarageEmployeesStore();
const q        = ref('');
const status   = ref('active');
const page     = ref(1);
const showForm = ref(false);
const editing  = ref<Employee | null>(null);

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

function openCreate()         { editing.value = null; showForm.value = true; }
function openEdit(e: Employee) { editing.value = e; showForm.value = true; }

async function toggleStatus(e: Employee) {
  await store.toggleStatus(e.id, e.status === 'active' ? 'inactive' : 'active');
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Empleados / Mecánicos</h1>
      <button class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate">
        <Plus :size="15" /> Nuevo empleado
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="Buscar por nombre o especialidad..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">No se encontraron empleados.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="e in store.items"
        :key="e.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
          <img v-if="e.photo_url" :src="`${apiBase}${e.photo_url}`" class="w-full h-full object-cover" />
          <User v-else :size="18" class="text-white/30" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ e.first_name }} {{ e.last_name || '' }}</p>
          <p class="text-xs text-white/40 truncate">{{ e.role_name || '' }}{{ e.specialty ? ` · ${e.specialty}` : '' }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="text-white/30 hover:text-white/70" @click="toggleStatus(e)">
            <ToggleRight v-if="e.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" />
          </button>
          <button type="button" class="text-white/30 hover:text-white/70" @click="openEdit(e)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </div>

    <widgets_garage_employee_form_modal v-model="showForm" :employee="editing" @saved="showForm = false; load()" />
  </div>
</template>
