<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CheckCircle2, Plus, ReceiptText } from 'lucide-vue-next';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import { usePermissions } from '../../composables/usePermissions';
import { useHrEmployeesStore } from '../../stores/hrEmployees';
import { useTreasurySettingsStore } from '../../stores/treasurySettings';
import { useTreasuryCashSessionsStore } from '../../stores/treasuryCashSessions';
import type { TreasuryCashMovementData, TreasuryCashSession, TreasuryMovementType } from '../../types/treasury';

const incomeTypes: TreasuryMovementType[] = ['sale_in', 'adjustment_in'];
const { canDo, isReadOnly } = usePermissions();
const employees = useHrEmployeesStore();
const settings = useTreasurySettingsStore();
const store = useTreasuryCashSessionsStore();
const panel = ref<'open' | 'movement' | 'close' | null>(null);
const error = ref('');
const countedAmount = ref(0);
const openForm = ref({ cash_register_id: 0, employee_id: 0, opening_amount: 0 });
const movement = ref<TreasuryCashMovementData>({ cash_register_id: 0, movement_type: 'sale_in', amount: 0, signed_amount: 0, currency: 'CLP', notes: '' });
const canEdit = computed(() => !isReadOnly.value && (canDo('treasury_cash_sessions', 'can_create') || canDo('treasury_cash_sessions', 'can_edit')));
const active = computed(() => store.selected?.status === 'open' ? store.selected : store.sessions.find((session) => session.status === 'open') || null);

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function label(type: TreasuryMovementType) {
  return ({ sale_in: 'Ingreso por venta', payment_out: 'Pago emitido', deposit_out: 'Dep\u00f3sito', withdrawal_out: 'Retiro', adjustment_in: 'Ajuste de ingreso', adjustment_out: 'Ajuste de salida' } as Record<TreasuryMovementType, string>)[type];
}

function employeeName(employee: { first_name: string; last_name: string | null }) {
  return `${employee.first_name} ${employee.last_name || ''}`.trim();
}

async function load() {
  await Promise.all([store.load(), settings.cashRegisters.load({ status: 'active' }), employees.load({ employment_status: 'active' })]);
  const current = store.sessions.find((session) => session.status === 'open');
  if (current) await store.select(current.id);
}

onMounted(load);

async function select(session: TreasuryCashSession) {
  await store.select(session.id);
}

function openPanel() {
  error.value = '';
  openForm.value = { cash_register_id: settings.cashRegisters.items[0]?.id || 0, employee_id: employees.items[0]?.id || 0, opening_amount: 0 };
  panel.value = 'open';
}

function movementPanel() {
  if (!active.value) return;
  error.value = '';
  movement.value = { cash_register_id: active.value.cash_register_id, movement_type: 'sale_in', amount: 0, signed_amount: 0, currency: 'CLP', notes: '' };
  panel.value = 'movement';
}

function closePanel() {
  if (!active.value) return;
  error.value = '';
  countedAmount.value = Number(active.value.opening_amount);
  panel.value = 'close';
}

async function saveOpen() {
  try {
    if (!openForm.value.cash_register_id || !openForm.value.employee_id) throw new Error('Seleccion\u00e1 una caja y un cajero');
    await store.open(openForm.value);
    panel.value = null;
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || cause.message;
  }
}

async function saveMovement() {
  const amount = Number(movement.value.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'El monto debe ser mayor que cero';
    return;
  }
  const signedAmount = incomeTypes.includes(movement.value.movement_type) ? amount : -amount;
  try {
    await store.recordMovement({ ...movement.value, amount, signed_amount: signedAmount });
    panel.value = null;
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || cause.message;
  }
}

async function saveClose() {
  if (!active.value) return;
  try {
    await store.close(active.value.id, countedAmount.value);
    panel.value = null;
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || cause.message;
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-3 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 class="text-xl font-semibold text-white">Sesiones de Caja</h1><p class="text-xs text-white/40">Apertura, movimientos y cierre.</p></div><button v-if="canEdit" class="nxr-btn nxr-btn-primary" @click="openPanel"><Plus :size="15" /> Abrir sesi\u00f3n</button></div>
    <section v-if="active" class="flex flex-col gap-3 rounded-2xl border border-green-400/20 bg-green-400/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs uppercase text-green-300">Sesi\u00f3n activa</p><h2 class="mt-1 text-lg font-semibold text-white">{{ active.cash_register_name || 'Caja #' + active.cash_register_id }}</h2><p class="text-xs text-white/40">Apertura: {{ money(active.opening_amount) }}</p></div><div v-if="canEdit" class="flex gap-2"><button class="nxr-btn nxr-btn-secondary" @click="movementPanel"><ReceiptText :size="15" /> Movimiento</button><button class="nxr-btn nxr-btn-primary" @click="closePanel"><CheckCircle2 :size="15" /> Cerrar</button></div></section>
    <p v-if="store.error" class="text-sm text-red-400">{{ store.error }}</p>
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2"><section class="rounded-xl border border-white/10 p-4"><h2 class="mb-3 text-sm font-semibold text-white">Sesiones</h2><p v-if="!store.sessions.length" class="py-10 text-center text-sm text-white/35">Sin sesiones.</p><button v-else v-for="session in store.sessions" :key="session.id" class="mb-2 w-full rounded-xl border border-white/10 p-3 text-left hover:bg-white/5" @click="select(session)"><span class="text-sm text-white">{{ session.cash_register_name || 'Caja #' + session.cash_register_id }}</span><span class="float-right text-xs text-white/40">{{ session.status === 'open' ? 'Abierta' : 'Cerrada' }}</span></button></section><section class="rounded-xl border border-white/10 p-4"><div v-if="store.selected"><h2 class="text-sm font-semibold text-white">Detalle</h2><div v-if="store.selected.status === 'closed'" class="mt-3 grid grid-cols-3 gap-2 text-xs"><div>Esperado<br><strong>{{ money(store.selected.expected_amount) }}</strong></div><div>Contado<br><strong>{{ money(store.selected.counted_amount) }}</strong></div><div>Diferencia<br><strong>{{ money(store.selected.difference_amount) }}</strong></div></div><h3 class="mt-5 text-sm font-semibold text-white">Movimientos</h3><p v-if="!store.selected.movements?.length" class="py-8 text-center text-sm text-white/35">Sin movimientos.</p><article v-else v-for="item in store.selected.movements" :key="item.id" class="mt-2 flex justify-between rounded-xl border border-white/10 p-3"><span class="text-sm text-white">{{ label(item.movement_type) }}</span><span :class="Number(item.signed_amount) >= 0 ? 'text-green-400' : 'text-red-300'">{{ money(item.signed_amount) }}</span></article></div><p v-else class="py-16 text-center text-sm text-white/35">Seleccion\u00e1 una sesi\u00f3n.</p></section></div>
    <NxrSlidePanel :open="panel === 'open'" title="Abrir sesi\u00f3n" size="sm" @close="panel = null"><div class="space-y-3"><select v-model.number="openForm.cash_register_id" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white"><option :value="0">Seleccion\u00e1 una caja</option><option v-for="item in settings.cashRegisters.items" :key="item.id" :value="item.id">{{ item.code }} - {{ item.name }}</option></select><select v-model.number="openForm.employee_id" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white"><option :value="0">Seleccion\u00e1 un cajero</option><option v-for="employee in employees.items" :key="employee.id" :value="employee.id">{{ employeeName(employee) }}</option></select><input v-model.number="openForm.opening_amount" type="number" min="0" placeholder="Monto de apertura" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white" /><p v-if="error" class="text-xs text-red-400">{{ error }}</p></div><template #footer><button class="nxr-btn nxr-btn-primary" :disabled="store.saving" @click="saveOpen">Abrir</button></template></NxrSlidePanel>
    <NxrSlidePanel :open="panel === 'movement'" title="Registrar movimiento" size="sm" @close="panel = null"><div class="space-y-3"><select v-model="movement.movement_type" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white"><option value="sale_in">Ingreso por venta</option><option value="payment_out">Pago emitido</option><option value="deposit_out">Dep\u00f3sito</option><option value="withdrawal_out">Retiro</option><option value="adjustment_in">Ajuste de ingreso</option><option value="adjustment_out">Ajuste de salida</option></select><input v-model.number="movement.amount" type="number" min="0" placeholder="Monto" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white" /><p class="text-xs text-white/40">El signo se determina autom\u00e1ticamente seg\u00fan el tipo de movimiento.</p><textarea v-model="movement.notes" placeholder="Notas" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white" /><p v-if="error" class="text-xs text-red-400">{{ error }}</p></div><template #footer><button class="nxr-btn nxr-btn-primary" :disabled="store.saving" @click="saveMovement">Registrar</button></template></NxrSlidePanel>
    <NxrSlidePanel :open="panel === 'close'" title="Cerrar sesi\u00f3n" size="sm" @close="panel = null"><div class="space-y-3"><p class="text-sm text-white/60">El servidor calcula el esperado con todos los movimientos.</p><input v-model.number="countedAmount" type="number" min="0" placeholder="Monto contado" class="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white" /><p v-if="error" class="text-xs text-red-400">{{ error }}</p></div><template #footer><button class="nxr-btn nxr-btn-primary" :disabled="store.saving" @click="saveClose">Confirmar cierre</button></template></NxrSlidePanel>
  </div>
</template>
