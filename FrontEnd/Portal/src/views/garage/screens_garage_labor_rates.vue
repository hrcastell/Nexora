<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Edit2, ToggleLeft, ToggleRight, Users } from 'lucide-vue-next';
import { useGarageEmployeesStore } from '../../stores/garageEmployees';
import { useGarageLaborRatesStore } from '../../stores/garageLaborRates';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { LaborRate } from '../../types/garage';

const empStore  = useGarageEmployeesStore();
const rateStore = useGarageLaborRatesStore();

const filterEmployee = ref<number | null>(null);
const showForm  = ref(false);
const editing   = ref<LaborRate | null>(null);
const saving    = ref(false);
const error     = ref('');

const form = ref({
  employee_id: null as number | null,
  rate_name: '',
  hourly_rate: 0,
  currency: 'CLP',
  valid_from: new Date().toISOString().split('T')[0],
  valid_to: '',
});

onMounted(async () => {
  await empStore.load({ status: 'active', limit: 100 });
  await rateStore.load();
});

watch(filterEmployee, async (id) => {
  if (id) await rateStore.loadByEmployee(id);
  else await rateStore.load();
});

function openCreate() {
  editing.value = null;
  form.value = { employee_id: filterEmployee.value, rate_name: '', hourly_rate: 0, currency: 'CLP', valid_from: new Date().toISOString().split('T')[0], valid_to: '' };
  error.value = '';
  showForm.value = true;
}

function openEdit(r: LaborRate) {
  editing.value = r;
  form.value = { employee_id: r.employee_id, rate_name: r.rate_name, hourly_rate: r.hourly_rate, currency: r.currency, valid_from: r.valid_from?.split('T')[0] || '', valid_to: r.valid_to?.split('T')[0] || '' };
  error.value = '';
  showForm.value = true;
}

async function save() {
  if (!form.value.employee_id) { error.value = 'Selecciona un empleado'; return; }
  if (!form.value.rate_name.trim()) { error.value = 'El nombre de la tarifa es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    if (editing.value) {
      await rateStore.update(editing.value.id, {
        rate_name:  form.value.rate_name,
        hourly_rate: form.value.hourly_rate,
        currency:   form.value.currency,
        valid_from: form.value.valid_from || undefined,
        valid_to:   form.value.valid_to || undefined,
      });
    } else {
      await rateStore.create({
        employee_id: form.value.employee_id,
        rate_name:   form.value.rate_name,
        hourly_rate: form.value.hourly_rate,
        currency:    form.value.currency,
        valid_from:  form.value.valid_from || undefined,
        valid_to:    form.value.valid_to || undefined,
      });
    }
    showForm.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(r: LaborRate) {
  await rateStore.toggleStatus(r.id, r.status === 'active' ? 'inactive' : 'active');
}

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Tarifas de Mano de Obra</h1>
      <button class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate">
        <Plus :size="15" /> Nueva tarifa
      </button>
    </div>

    <div class="flex items-center gap-3">
      <Users :size="14" class="text-white/30 shrink-0" />
      <select v-model="filterEmployee" class="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option :value="null">Todos los empleados</option>
        <option v-for="e in empStore.items" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name || '' }}</option>
      </select>
    </div>

    <div v-if="rateStore.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="rateStore.items.length === 0" class="text-center text-white/30 py-16 text-sm">Sin tarifas registradas.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="r in rateStore.items" :key="r.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white">{{ r.rate_name }}</p>
          <p class="text-xs text-white/40">
            {{ r.employee_name || '' }} · ${{ r.hourly_rate.toLocaleString() }}/hr {{ r.currency }}
            · Desde: {{ fmtDate(r.valid_from) }}
            <span v-if="r.valid_to"> · Hasta: {{ fmtDate(r.valid_to) }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="text-white/30 hover:text-white/70" @click="openEdit(r)"><Edit2 :size="14" /></button>
          <button type="button" @click="toggleStatus(r)">
            <ToggleRight v-if="r.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" class="text-white/30" />
          </button>
        </div>
      </div>
    </div>

    <NxrSlidePanel
      :open="showForm"
      :title="editing ? 'Editar tarifa' : 'Nueva tarifa'"
      size="sm"
      @close="showForm = false"
    >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Empleado *</label>
              <select v-model="form.employee_id" :disabled="!!editing" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none disabled:opacity-50">
                <option :value="null">Seleccionar</option>
                <option v-for="e in empStore.items" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name || '' }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Nombre de la tarifa *</label>
              <input v-model="form.rate_name" type="text" placeholder="Ej: Tarifa estándar 2024" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Tarifa / hora *</label>
              <input v-model.number="form.hourly_rate" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Moneda</label>
              <select v-model="form.currency" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Válida desde</label>
              <input v-model="form.valid_from" type="date" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Válida hasta</label>
              <input v-model="form.valid_to" type="date" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
          </div>
      <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>

      <template #footer>
        <button type="button" class="nxr-btn nxr-btn-secondary" @click="showForm = false">Cancelar</button>
        <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
