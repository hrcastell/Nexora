<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileText, Plus, Loader2, X, Save, Pencil, Trash2, ShieldAlert } from 'lucide-vue-next';
import AppToast, { type ToastItem, type ToastType } from '../../components/AppToast.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { usePermissions } from '../../composables/usePermissions';

interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  payment_frequency: string;
  due_day: number;
  grace_period_days: number;
  discount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const cfg   = useVisualConfigStore();
const perms = usePermissions();

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(9,18,36,0.85)');
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');
const modalBg     = computed(() => isLight.value ? '#ffffff' : '#0d1829');

const plans    = ref<SubscriptionPlan[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const isSaving  = ref(false);
const saveError = ref('');
const editingId = ref<number | null>(null);

const activeToast = ref<ToastItem | null>(null);
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = { id: Date.now(), title, message, type };
};

// Confirm modal state
const showConfirmDelete = ref(false);
const planToDelete = ref<SubscriptionPlan | null>(null);

const defaultForm = () => ({
  code: '',
  name: '',
  description: '',
  amount: 0,
  currency: 'CLP',
  payment_frequency: 'monthly',
  due_day: 1,
  grace_period_days: 5,
  discount: 0,
  is_active: true
});

const form = ref(defaultForm());

async function loadPlans() {
  isLoading.value = true;
  try {
    const res = await api.get('/subscription-plans?all=true');
    plans.value = res.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

onMounted(loadPlans);

function openCreate() {
  editingId.value = null;
  form.value = defaultForm();
  saveError.value = '';
  showModal.value = true;
}

function openEdit(plan: SubscriptionPlan) {
  editingId.value = plan.id;
  form.value = {
    code: plan.code,
    name: plan.name,
    description: plan.description || '',
    amount: plan.amount,
    currency: plan.currency,
    payment_frequency: plan.payment_frequency,
    due_day: plan.due_day,
    grace_period_days: plan.grace_period_days,
    discount: plan.discount,
    is_active: plan.is_active
  };
  saveError.value = '';
  showModal.value = true;
}

async function savePlan() {
  if (!form.value.name || (!editingId.value && !form.value.code)) {
    saveError.value = 'Código y nombre son requeridos'; return;
  }
  const day = form.value.due_day;
  if (day < 1 || day > 28) {
    saveError.value = 'El día límite debe estar entre 1 y 28'; return;
  }
  isSaving.value = true;
  saveError.value = '';
  try {
    if (editingId.value) {
      await api.put(`/subscription-plans/${editingId.value}`, form.value);
    } else {
      await api.post('/subscription-plans', form.value);
    }
    showModal.value = false;
    triggerToast('Guardado', editingId.value ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.', 'success');
    await loadPlans();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveError.value = err?.response?.data?.error ?? 'Error al guardar';
  } finally {
    isSaving.value = false;
  }
}

function openDeletePlan(plan: SubscriptionPlan) {
  planToDelete.value = plan;
  showConfirmDelete.value = true;
}

async function handleConfirmDelete() {
  if (!planToDelete.value) return;
  const plan = planToDelete.value;
  try {
    await api.delete(`/subscription-plans/${plan.id}`);
    triggerToast('Eliminado', `El plan "${plan.name}" fue eliminado.`, 'success');
    showConfirmDelete.value = false;
    planToDelete.value = null;
    await loadPlans();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    triggerToast('Error', err?.response?.data?.error ?? 'Error al eliminar plan', 'error');
    showConfirmDelete.value = false;
  }
}

const freqLabel = (f: string) => ({ monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' }[f] ?? f);
const fmtCurrency = (n: number, c = 'CLP') =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <FileText class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Planes de Suscripción</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Configura los planes de acceso que ofrecerás a tus clientes</p>
        </div>
      </div>
      <button v-if="perms.canManageCommercial.value" @click="openCreate"
        class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary">
        <Plus class="h-4 w-4" /> Nuevo plan
      </button>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <template v-else>
      <!-- Empty state -->
      <div v-if="plans.length === 0" class="rounded-2xl border p-14 text-center"
        :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <FileText class="h-12 w-12 mx-auto mb-4 opacity-25" :style="{ color: mutedColor }" />
        <p class="text-sm font-medium" :style="{ color: headerColor }">No hay planes de suscripción configurados.</p>
        <p class="text-xs mt-2" :style="{ color: mutedColor }">Crea el primer plan para poder asignarlo a las empresas cliente.</p>
      </div>

      <!-- Plans grid -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="plan in plans" :key="plan.id" class="rounded-2xl border p-5 flex flex-col gap-3"
          :style="{ backgroundColor: cardBg, borderColor: cardBorder }">

          <!-- Name + code + active badge -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-base" :style="{ color: headerColor }">{{ plan.name }}</p>
              <span class="text-xs font-mono" :style="{ color: mutedColor }">{{ plan.code }}</span>
            </div>
            <span class="shrink-0 text-xs rounded-full px-2 py-0.5 border"
              :class="plan.is_active
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
              {{ plan.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <!-- Description -->
          <p v-if="plan.description" class="text-xs" :style="{ color: mutedColor }">{{ plan.description }}</p>

          <!-- Amount + frequency -->
          <div class="rounded-xl border p-3" :style="{ borderColor: cardBorder, backgroundColor: rowHoverBg }">
            <p class="text-lg font-bold" :style="{ color: headerColor }">
              {{ fmtCurrency(plan.amount, plan.currency) }}
            </p>
            <p class="text-xs mt-0.5" :style="{ color: mutedColor }">
              {{ freqLabel(plan.payment_frequency) }} · Día {{ plan.due_day }}
            </p>
          </div>

          <!-- Details row -->
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs" :style="{ color: mutedColor }">
            <span>Gracia: <strong :style="{ color: headerColor }">{{ plan.grace_period_days }} días</strong></span>
            <span v-if="plan.discount > 0">Descuento: <strong :style="{ color: headerColor }">{{ plan.discount }}%</strong></span>
          </div>

          <!-- Actions -->
          <div v-if="perms.canManageCommercial.value" class="flex gap-2 pt-1 border-t" :style="{ borderColor: cardBorder }">
            <button @click="openEdit(plan)"
              class="flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition">
              <Pencil class="h-3 w-3" /> Editar
            </button>
            <button @click="openDeletePlan(plan)"
              class="flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">
              <Trash2 class="h-3 w-3" /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-lg rounded-3xl border shadow-2xl" :style="{ backgroundColor: modalBg, borderColor: cardBorder }">
          <div class="flex items-center justify-between border-b p-5" :style="{ borderColor: cardBorder }">
            <h2 class="text-base font-semibold" :style="{ color: headerColor }">
              {{ editingId ? 'Editar plan' : 'Nuevo plan de suscripción' }}
            </h2>
            <button @click="showModal = false" class="rounded-xl p-1.5 hover:bg-white/10 transition">
              <X class="h-5 w-5" :style="{ color: mutedColor }" />
            </button>
          </div>

          <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <ShieldAlert class="h-4 w-4 shrink-0" /> {{ saveError }}
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Código (solo en creación) -->
              <div class="col-span-2" v-if="!editingId">
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Código * <span class="font-normal">(único, ej: basico, pro)</span></label>
                <input v-model="form.code" type="text" placeholder="ej: basico" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Nombre -->
              <div class="col-span-2">
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Nombre *</label>
                <input v-model="form.name" type="text" placeholder="ej: Plan Básico" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Descripción -->
              <div class="col-span-2">
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
                <textarea v-model="form.description" rows="2" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Monto -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Monto</label>
                <input v-model.number="form.amount" type="number" min="0" step="0.01" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Moneda -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Moneda</label>
                <select v-model="form.currency" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                  <option>CLP</option><option>USD</option><option>EUR</option>
                </select>
              </div>

              <!-- Frecuencia -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Frecuencia de pago</label>
                <select v-model="form.payment_frequency" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              <!-- Día de pago -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Día límite de pago (1–28)</label>
                <input v-model.number="form.due_day" type="number" min="1" max="28" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Días de gracia -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Días de gracia</label>
                <input v-model.number="form.grace_period_days" type="number" min="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Descuento -->
              <div>
                <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Descuento (%)</label>
                <input v-model.number="form.discount" type="number" min="0" max="100" step="0.01" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>

              <!-- Activo -->
              <div class="col-span-2 flex items-center gap-3">
                <input id="is_active" v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded" />
                <label for="is_active" class="text-sm" :style="{ color: headerColor }">Plan activo (visible en formularios)</label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 border-t p-5" :style="{ borderColor: cardBorder }">
            <button @click="showModal = false" class="rounded-2xl border px-4 py-2 text-sm hover:bg-white/5 transition"
              :style="{ borderColor: cardBorder, color: mutedColor }">Cancelar</button>
            <button @click="savePlan" :disabled="isSaving"
              class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
          <AppToast :toast="activeToast" @close="activeToast = null" />
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete Modal -->
    <ConfirmActionModal
      :isOpen="showConfirmDelete"
      :title="planToDelete ? 'Eliminar plan' : ''"
      :message="planToDelete ? 'Eliminar el plan ' + planToDelete.name + '? Esta acción no se puede deshacer.' : ''"
      confirmText="Eliminar"
      variant="danger"
      @confirmed="handleConfirmDelete"
      @cancelled="showConfirmDelete = false; planToDelete = null" />
  </div>
</template>
