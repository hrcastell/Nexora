<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Building2, ChevronDown, Loader2 } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { usePermissions } from '../../composables/usePermissions';

interface CompanyOption {
  id: number;
  name: string;
  schema_name: string;
  commercial_status?: string;
  is_master?: boolean;
}

const props = withDefaults(defineProps<{
  modelValue: number | null;
  placeholder?: string;
  label?: string;
  showAll?: boolean;
  excludeMaster?: boolean;
}>(), {
  placeholder: '-- Seleccionar empresa --',
  label: 'Empresa',
  showAll: true,
  excludeMaster: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
  'change': [company: CompanyOption | null];
}>();

const cfg   = useVisualConfigStore();
const perms = usePermissions();

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');

const companies  = ref<CompanyOption[]>([]);
const isLoading  = ref(false);

async function load() {
  if (!perms.isSuperAdmin.value) return;
  isLoading.value = true;
  try {
    const res = await api.get('/companies');
    companies.value = props.excludeMaster
      ? res.data.filter((c: CompanyOption) => !c.is_master)
      : res.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

onMounted(load);

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  const id = val === '' ? null : Number(val);
  emit('update:modelValue', id);
  const found = id ? (companies.value.find(c => c.id === id) ?? null) : null;
  emit('change', found);
}

const statusDot = (s?: string) => {
  if (s === 'activa')          return '#10b981';
  if (s === 'pendiente_pago')  return '#f59e0b';
  if (s === 'suspendida')      return '#ef4444';
  if (s === 'bloqueada')       return '#7f1d1d';
  return '#94a3b8';
};
</script>

<template>
  <div v-if="perms.isSuperAdmin.value" class="flex items-center gap-2 min-w-0">
    <Building2 class="h-4 w-4 shrink-0" :style="{ color: mutedColor }" />
    <div class="relative min-w-[220px]">
      <Loader2 v-if="isLoading" class="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin"
        :style="{ color: mutedColor }" />
      <ChevronDown v-else class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
        :style="{ color: mutedColor }" />
      <select
        :value="modelValue ?? ''"
        @change="onChange"
        class="w-full appearance-none rounded-2xl border pl-3 pr-8 py-1.5 text-sm focus:outline-none"
        :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: headerColor }">
        <option v-if="showAll" value="">{{ placeholder }}</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">
          {{ c.name }}{{ c.is_master ? ' ★' : '' }} ({{ c.schema_name }})
        </option>
      </select>
    </div>
    <span v-if="modelValue" class="h-2 w-2 rounded-full shrink-0"
      :style="{ backgroundColor: statusDot(companies.find(c => c.id === modelValue)?.commercial_status) }" />
  </div>
</template>
