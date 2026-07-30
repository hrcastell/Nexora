<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Search, UserRound, ChevronRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useHrEmployeesStore } from '../../stores/hrEmployees';
import { useHrDepartmentsStore } from '../../stores/hrDepartments';
import { useHrPositionsStore } from '../../stores/hrPositions';
import type { HrEmployee } from '../../types/hr';

const router = useRouter();
const employees = useHrEmployeesStore();
const departments = useHrDepartmentsStore();
const positions = useHrPositionsStore();
const q = ref('');
const departmentId = ref('');
const positionId = ref('');
const employmentStatus = ref('active');

async function load() {
  await employees.load({
    q: q.value || undefined,
    department_id: departmentId.value ? Number(departmentId.value) : undefined,
    position_id: positionId.value ? Number(positionId.value) : undefined,
    employment_status: employmentStatus.value || undefined,
  });
}
onMounted(async () => { await Promise.all([departments.load({ status: 'active' }), positions.load({ status: 'active' })]); await load(); });
watch([q, departmentId, positionId, employmentStatus], load);
function openProfile(employee: HrEmployee) { router.push({ name: 'hr-employee-profile', params: { id: employee.id } }); }
function statusLabel(status: string) { return ({ draft: 'Borrador', active: 'Activo', inactive: 'Inactivo', on_leave: 'Con licencia', terminated: 'Finalizado', suspended: 'Suspendido' } as Record<string, string>)[status] || status; }
</script>

<template>
  <div class="flex flex-col gap-5 p-3 sm:p-6">
    <div><h1 class="text-xl font-semibold nxr-text">Empleados</h1><p class="text-xs nxr-text-muted">Directorio y estructura de Recursos Humanos.</p></div>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="relative sm:col-span-2 lg:col-span-1"><Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 nxr-text-soft" /><input v-model="q" placeholder="Buscar empleado..." class="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm nxr-text outline-none focus:border-white/30" /></div>
      <select v-model="departmentId" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text outline-none"><option value="">Todos los departamentos</option><option v-for="department in departments.items" :key="department.id" :value="department.id">{{ department.name }}</option></select>
      <select v-model="positionId" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text outline-none"><option value="">Todas las posiciones</option><option v-for="position in positions.items" :key="position.id" :value="position.id">{{ position.name }}</option></select>
      <select v-model="employmentStatus" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text outline-none"><option value="">Todos los estados</option><option value="draft">Borrador</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="on_leave">Con licencia</option><option value="terminated">Finalizados</option><option value="suspended">Suspendidos</option></select>
    </div>
    <div v-if="employees.loading" class="space-y-2"><div v-for="index in 6" :key="index" class="h-20 animate-pulse rounded-xl bg-white/5" /></div>
    <p v-else-if="employees.error" class="py-8 text-center text-sm text-red-400">{{ employees.error }}</p>
    <p v-else-if="employees.items.length === 0" class="py-16 text-center text-sm nxr-text-soft">No se encontraron empleados.</p>
    <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <button v-for="employee in employees.items" :key="employee.id" class="flex min-w-0 items-center gap-4 rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25" :style="{ background: 'var(--nexora-glass-bg)' }" @click="openProfile(employee)">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10"><UserRound :size="19" class="nxr-text-muted" /></div>
        <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold nxr-text">{{ employee.first_name }} {{ employee.last_name || '' }}</p><p class="truncate text-xs nxr-text-muted">{{ employee.position_name || 'Sin posición' }} · {{ employee.department_name || 'Sin departamento' }}</p><p class="mt-1 text-xs nxr-text-soft">{{ employee.employee_code || 'Sin código' }}</p></div>
        <div class="flex shrink-0 items-center gap-2"><span :class="employee.employment_status === 'active' ? 'text-green-400' : 'nxr-text-muted'" class="hidden text-xs sm:block">{{ statusLabel(employee.employment_status) }}</span><ChevronRight :size="17" class="nxr-text-soft" /></div>
      </button>
    </div>
  </div>
</template>
