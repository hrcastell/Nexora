<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, Save, UserRound } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { usePermissions } from '../../composables/usePermissions';
import { useHrEmployeesStore } from '../../stores/hrEmployees';
import { useHrDepartmentsStore } from '../../stores/hrDepartments';
import { useHrPositionsStore } from '../../stores/hrPositions';
import { useHrCostCentersStore } from '../../stores/hrCostCenters';
import { useHrWorkShiftsStore } from '../../stores/hrWorkShifts';
import type { HrEmployeeUpdate } from '../../types/hr';

const route = useRoute(); const router = useRouter(); const employees = useHrEmployeesStore();
const departments = useHrDepartmentsStore(); const positions = useHrPositionsStore(); const costCenters = useHrCostCentersStore(); const workShifts = useHrWorkShiftsStore();
const { canDo, isReadOnly } = usePermissions();
const saving = ref(false); const saveError = ref(''); const saved = ref(false);
const form = ref<HrEmployeeUpdate>({});
const employeeId = Number(route.params.id);
const editable = computed(() => !isReadOnly.value && (canDo('hr_employee_profile', 'can_edit') || canDo('hr_employees', 'can_edit')));
const statuses = [['draft', 'Borrador'], ['active', 'Activo'], ['inactive', 'Inactivo'], ['on_leave', 'Con licencia'], ['terminated', 'Finalizado'], ['suspended', 'Suspendido']];
const types = [['full_time', 'Tiempo completo'], ['part_time', 'Tiempo parcial'], ['contractor', 'Contratista'], ['intern', 'Práctica'], ['temporary', 'Temporal']];
function toDate(value: string | null | undefined) { return value ? value.slice(0, 10) : ''; }
function selectValue(value: number | null | undefined) { return value ? String(value) : ''; }
function fillForm() {
  const employee = employees.current; if (!employee) return;
  form.value = { employee_code: employee.employee_code || '', user_id: employee.user_id, work_email: employee.work_email || '', personal_email: employee.personal_email || '', mobile_phone: employee.mobile_phone || '', birth_date: toDate(employee.birth_date), hire_date: toDate(employee.hire_date), termination_date: toDate(employee.termination_date), employment_status: employee.employment_status, employment_type: employee.employment_type, department_id: employee.department_id, position_id: employee.position_id, supervisor_employee_id: employee.supervisor_employee_id, cost_center_id: employee.cost_center_id, work_shift_id: employee.work_shift_id, privacy_level: employee.privacy_level || '' };
}
onMounted(async () => { await Promise.all([employees.loadOne(employeeId), employees.load(), departments.load({ status: 'active' }), positions.load({ status: 'active' }), costCenters.load({ status: 'active' }), workShifts.load({ status: 'active' })]); fillForm(); });
function idOrNull(value: unknown) { return value === '' || value === null ? null : Number(value); }
async function save() {
  saving.value = true; saveError.value = ''; saved.value = false;
  try {
    const payload = { ...form.value, user_id: idOrNull(form.value.user_id), department_id: idOrNull(form.value.department_id), position_id: idOrNull(form.value.position_id), supervisor_employee_id: idOrNull(form.value.supervisor_employee_id), cost_center_id: idOrNull(form.value.cost_center_id), work_shift_id: idOrNull(form.value.work_shift_id) };
    await employees.update(employeeId, payload); saved.value = true;
  } catch (cause: any) { saveError.value = cause?.response?.data?.error || 'Error al guardar el perfil'; }
  finally { saving.value = false; }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-3 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button class="flex items-center gap-2 self-start text-sm nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="router.push({ name: 'hr-employees' })"><ArrowLeft :size="16" /> Volver a empleados</button><button v-if="editable" class="nxr-btn nxr-btn-primary justify-center" :disabled="saving" @click="save"><Save :size="15" /> {{ saving ? 'Guardando...' : 'Guardar cambios' }}</button></div>
    <div v-if="employees.loading" class="h-64 animate-pulse rounded-xl bg-white/5" />
    <p v-else-if="employees.error" class="py-16 text-center text-red-400">{{ employees.error }}</p>
    <template v-else-if="employees.current">
      <section class="flex items-center gap-4 rounded-2xl border border-white/10 p-5" :style="{ background: 'var(--nexora-glass-bg)' }"><div class="flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><UserRound :size="27" class="nxr-text-muted" /></div><div><h1 class="text-xl font-semibold nxr-text">{{ employees.current.first_name }} {{ employees.current.last_name || '' }}</h1><p class="text-sm nxr-text-muted">Perfil integral del empleado</p></div></section>
      <p v-if="saveError" class="text-sm text-red-400">{{ saveError }}</p><p v-if="saved" class="text-sm text-green-400">Cambios guardados correctamente.</p>
      <fieldset :disabled="!editable" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section class="rounded-2xl border border-white/10 p-4 sm:p-5"><h2 class="mb-4 text-sm font-semibold nxr-text">Datos personales</h2><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><label> Código<input v-model="form.employee_code" class="field" /></label><label>Correo laboral<input v-model="form.work_email" type="email" class="field" /></label><label>Correo personal<input v-model="form.personal_email" type="email" class="field" /></label><label>Teléfono móvil<input v-model="form.mobile_phone" class="field" /></label><label>Fecha de nacimiento<input v-model="form.birth_date" type="date" class="field" /></label><label>Nivel de privacidad<input v-model="form.privacy_level" class="field" /></label></div></section>
        <section class="rounded-2xl border border-white/10 p-4 sm:p-5"><h2 class="mb-4 text-sm font-semibold nxr-text">Situación laboral</h2><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><label>Estado<select v-model="form.employment_status" class="field"><option v-for="status in statuses" :key="status[0]" :value="status[0]">{{ status[1] }}</option></select></label><label>Tipo<select v-model="form.employment_type" class="field"><option :value="null">Sin definir</option><option v-for="type in types" :key="type[0]" :value="type[0]">{{ type[1] }}</option></select></label><label>Fecha de ingreso<input v-model="form.hire_date" type="date" class="field" /></label><label>Fecha de término<input v-model="form.termination_date" type="date" class="field" /></label></div></section>
        <section class="rounded-2xl border border-white/10 p-4 sm:p-5 lg:col-span-2"><h2 class="mb-4 text-sm font-semibold nxr-text">Organización y supervisión</h2><div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><label>Departamento<select v-model="form.department_id" class="field"><option value="">Sin asignar</option><option v-for="item in departments.items" :key="item.id" :value="selectValue(item.id)">{{ item.name }}</option></select></label><label>Posición<select v-model="form.position_id" class="field"><option value="">Sin asignar</option><option v-for="item in positions.items" :key="item.id" :value="selectValue(item.id)">{{ item.name }}</option></select></label><label>Centro de costo<select v-model="form.cost_center_id" class="field"><option value="">Sin asignar</option><option v-for="item in costCenters.items" :key="item.id" :value="selectValue(item.id)">{{ item.name }}</option></select></label><label>Turno<select v-model="form.work_shift_id" class="field"><option value="">Sin asignar</option><option v-for="item in workShifts.items" :key="item.id" :value="selectValue(item.id)">{{ item.name }}</option></select></label><label>Supervisor<select v-model="form.supervisor_employee_id" class="field"><option value="">Sin asignar</option><option v-for="item in employees.items.filter((item) => item.id !== employeeId)" :key="item.id" :value="selectValue(item.id)">{{ item.first_name }} {{ item.last_name || '' }}</option></select></label></div></section>
      </fieldset>
    </template>
  </div>
</template>

<style scoped>
label { @apply block text-xs text-[var(--nexora-muted-text)]; }
.field { @apply mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--nexora-text-color)] outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-60; }
</style>
