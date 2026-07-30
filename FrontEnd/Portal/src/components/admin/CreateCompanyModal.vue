<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import api from '../../utils/axios';
import { Loader2, Eye, EyeOff, ChevronDown, ChevronUp, UserPlus } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';
import NxrSlidePanel from '../NxrSlidePanel.vue';

interface InitialData {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
}

const props = defineProps<{
  isOpen: boolean;
  initialData?: InitialData;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const isLoading = ref(false);
const error = ref('');

// Theme-aware styling
const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const inputBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.90)' : 'rgba(255, 255, 255, 0.05)');
const inputBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const labelColor = computed(() => isLightMode.value ? '#374151' : '#9ca3af');
const optionBg = computed(() => isLightMode.value ? '#ffffff' : '#0b1326');

interface SubscriptionPlan { id: number; code: string; name: string; is_active: boolean; }
const plans = ref<SubscriptionPlan[]>([]);
const plansLoading = ref(false);

const form = reactive({
  name: '',
  schema_name: '',
  rut: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  country: 'Chile',
  plan_type: 'basic',
  subscription_plan_id: null as number | null
});

function syncPlanTypeFromSelection(planId: number | null) {
  if (planId == null) {
    form.plan_type = 'none';
    return;
  }
  const selected = plans.value.find(p => p.id === planId);
  if (selected) form.plan_type = selected.code;
}

onMounted(async () => {
  plansLoading.value = true;
  try {
    const res = await api.get('/subscription-plans');
    plans.value = res.data;
    const basic = plans.value.find(p => p.code === 'basic');
    if (basic) {
      form.subscription_plan_id = basic.id;
      form.plan_type = basic.code;
    }
    if (!basic) {
      syncPlanTypeFromSelection(form.subscription_plan_id);
    }
  } catch { /* silent */ } finally {
    plansLoading.value = false;
  }
});

watch(() => form.subscription_plan_id, (newPlanId) => {
  syncPlanTypeFromSelection(newPlanId);
});

const showAdminSection = ref(false);
const showPwd = ref(false);
const showConfirmPwd = ref(false);
const adminForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  confirm_password: ''
});

const passwordStrength = computed(() => {
  const p = adminForm.password;
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
});
const strengthLabel = computed(() => ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][passwordStrength.value]);
const strengthColor = computed(() => ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][passwordStrength.value]);

watch(() => props.isOpen, (open) => {
  if (open && props.initialData) {
    form.name = props.initialData.name || '';
    form.contact_email = props.initialData.contact_email || '';
    form.contact_phone = props.initialData.contact_phone || '';
  }
});

const resetForm = () => {
  form.name = '';
  form.schema_name = '';
  form.rut = '';
  form.contact_email = '';
  form.contact_phone = '';
  form.address = '';
  form.country = 'Chile';
  const basicPlan = plans.value.find(p => p.code === 'basic') ?? null;
  form.subscription_plan_id = basicPlan?.id ?? null;
  form.plan_type = basicPlan?.code ?? 'none';
  adminForm.first_name = '';
  adminForm.last_name = '';
  adminForm.email = '';
  adminForm.password = '';
  adminForm.confirm_password = '';
  showAdminSection.value = false;
  showPwd.value = false;
  showConfirmPwd.value = false;
  error.value = '';
};

const handleClose = () => {
  resetForm();
  emit('close');
};

const handleSubmit = async () => {
  if (!form.name || !form.schema_name || !form.contact_email || !form.rut || !form.country) {
    error.value = 'Nombre, Schema, RUT, Email y País son obligatorios.';
    return;
  }

  // Validate schema format (lowercase, alphanumeric, underscores)
  const schemaRegex = /^[a-z0-9_]+$/;
  if (!schemaRegex.test(form.schema_name)) {
    error.value = 'El nombre del schema solo puede contener letras minúsculas, números y guiones bajos.';
    return;
  }

  // Validate admin user fields if section is open
  if (showAdminSection.value && adminForm.email) {
    if (!adminForm.password) {
      error.value = 'La contraseña del administrador es requerida.';
      return;
    }
    if (adminForm.password !== adminForm.confirm_password) {
      error.value = 'Las contraseñas del administrador no coinciden.';
      return;
    }
    if (passwordStrength.value < 3) {
      error.value = 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.';
      return;
    }
  }

  isLoading.value = true;
  error.value = '';

  try {
    const payload: any = { ...form };
    if (showAdminSection.value && adminForm.email && adminForm.password) {
      payload.admin_user = {
        first_name: adminForm.first_name,
        last_name: adminForm.last_name,
        email: adminForm.email,
        password: adminForm.password
      };
    }
    await api.post('/companies', payload);
    emit('created');
    handleClose();
  } catch (err: any) {
    if (err.response && err.response.data && err.response.data.error) {
      error.value = err.response.data.error;
    } else {
      error.value = 'Error al crear la empresa. Verifique los datos.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <NxrSlidePanel
    :open="isOpen"
    title="Registrar Nueva Empresa"
    eyebrow="Esto creará un nuevo registro y aprovisionará un schema dedicado en la base de datos."
    size="lg"
    @close="handleClose"

    draft-key="components/admin/CreateCompanyModal.vue#1"
    :draft-entity="'create'"
    :draft-state="{ form, adminForm }">
    <form @submit.prevent="handleSubmit" class="space-y-4">

              <!-- Name -->
              <div>
                <label for="name" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre de la Empresa *</label>
                <input type="text" id="name" v-model="form.name" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: inputBg,
                         borderColor: inputBorder,
                         color: headerTextColor
                       }" />
              </div>

              <!-- Schema Name -->
              <div>
                <label for="schema" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre del Schema (DB) *</label>
                <div class="mt-1 flex rounded-md shadow-sm">
                  <input type="text" id="schema" v-model="form.schema_name" required placeholder="ej: empresa_x" class="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-xl text-sm border transition-colors"
                         :style="{
                           backgroundColor: inputBg,
                           borderColor: inputBorder,
                           color: headerTextColor
                         }" />
                </div>
                <p class="mt-1 text-xs" :style="{ color: mutedTextColor }">Solo minúsculas, números y guiones bajos (_).</p>
              </div>

              <!-- RUT -->
              <div>
                <label for="rut" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">RUT / ID Tributario *</label>
                <input type="text" id="rut" v-model="form.rut" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: inputBg,
                         borderColor: inputBorder,
                         color: headerTextColor
                       }" />
              </div>

              <!-- Country -->
              <div>
                <label for="country" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">País *</label>
                <select id="country" v-model="form.country" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors"
                        :style="{
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: headerTextColor
                        }">
                  <option value="Chile" :style="{ backgroundColor: optionBg }">Chile</option>
                  <option value="Argentina" :style="{ backgroundColor: optionBg }">Argentina</option>
                  <option value="Peru" :style="{ backgroundColor: optionBg }">Perú</option>
                  <option value="Colombia" :style="{ backgroundColor: optionBg }">Colombia</option>
                  <option value="Mexico" :style="{ backgroundColor: optionBg }">México</option>
                  <option value="Bolivia" :style="{ backgroundColor: optionBg }">Bolivia</option>
                  <option value="Ecuador" :style="{ backgroundColor: optionBg }">Ecuador</option>
                  <option value="Uruguay" :style="{ backgroundColor: optionBg }">Uruguay</option>
                  <option value="Paraguay" :style="{ backgroundColor: optionBg }">Paraguay</option>
                  <option value="Otros" :style="{ backgroundColor: optionBg }">Otros</option>
                </select>
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Email de Contacto *</label>
                <input type="email" id="email" v-model="form.contact_email" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: inputBg,
                         borderColor: inputBorder,
                         color: headerTextColor
                       }" />
              </div>

              <!-- Phone -->
              <div>
                <label for="phone" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Teléfono</label>
                <input type="text" id="phone" v-model="form.contact_phone" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: inputBg,
                         borderColor: inputBorder,
                         color: headerTextColor
                       }" />
              </div>

              <!-- Address -->
              <div>
                <label for="address" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Dirección</label>
                <textarea id="address" v-model="form.address" rows="2" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                          :style="{
                            backgroundColor: inputBg,
                            borderColor: inputBorder,
                            color: headerTextColor
                          }"></textarea>
              </div>

              <!-- Plan -->
              <div>
                <label for="plan" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Plan de Suscripción</label>
                <select id="plan" v-model="form.subscription_plan_id" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors"
                        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }">
                  <option :value="null" :style="{ backgroundColor: optionBg }">Sin plan</option>
                  <option v-for="p in plans" :key="p.id" :value="p.id" :style="{ backgroundColor: optionBg }">{{ p.name }}</option>
                </select>
              </div>

              <!-- Admin User Section (collapsible) -->
              <div class="rounded-xl border p-4 transition-colors"
                   :style="{ borderColor: inputBorder, backgroundColor: isLightMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }">
                <button type="button" @click="showAdminSection = !showAdminSection"
                        class="flex items-center justify-between w-full text-left">
                  <div class="flex items-center gap-2">
                    <UserPlus class="h-4 w-4" :style="{ color: mutedTextColor }" />
                    <span class="text-sm font-medium" :style="{ color: headerTextColor }">Administrador de la empresa</span>
                  </div>
                  <ChevronUp v-if="showAdminSection" class="h-4 w-4" :style="{ color: mutedTextColor }" />
                  <ChevronDown v-else class="h-4 w-4" :style="{ color: mutedTextColor }" />
                </button>
                <p v-if="!showAdminSection" class="mt-1 text-xs" :style="{ color: mutedTextColor }">
                  Opcional — Crea un usuario que administrará esta empresa.
                </p>
                <div v-if="showAdminSection" class="mt-4 space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium mb-1" :style="{ color: labelColor }">Nombre</label>
                      <input type="text" v-model="adminForm.first_name" class="block w-full rounded-xl border p-2.5 text-sm transition-colors"
                             :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1" :style="{ color: labelColor }">Apellido</label>
                      <input type="text" v-model="adminForm.last_name" class="block w-full rounded-xl border p-2.5 text-sm transition-colors"
                             :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium mb-1" :style="{ color: labelColor }">Email del administrador *</label>
                    <input type="email" v-model="adminForm.email" class="block w-full rounded-xl border p-2.5 text-sm transition-colors"
                           :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium mb-1" :style="{ color: labelColor }">Contraseña *</label>
                      <div class="relative">
                        <input :type="showPwd ? 'text' : 'password'" v-model="adminForm.password"
                               class="block w-full rounded-xl border p-2.5 pr-9 text-sm transition-colors"
                               :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                        <button type="button" @click="showPwd = !showPwd" class="absolute right-3 top-1/2 -translate-y-1/2">
                          <Eye v-if="!showPwd" class="h-4 w-4" :style="{ color: mutedTextColor }" />
                          <EyeOff v-else class="h-4 w-4" :style="{ color: mutedTextColor }" />
                        </button>
                      </div>
                      <div v-if="adminForm.password" class="mt-1.5 flex items-center gap-2">
                        <div class="flex-1 h-1 rounded-full" :style="{ backgroundColor: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)' }">
                          <div class="h-full rounded-full transition-all" :class="strengthColor" :style="{ width: `${passwordStrength * 25}%` }" />
                        </div>
                        <span class="text-xs" :style="{ color: mutedTextColor }">{{ strengthLabel }}</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1" :style="{ color: labelColor }">Confirmar *</label>
                      <div class="relative">
                        <input :type="showConfirmPwd ? 'text' : 'password'" v-model="adminForm.confirm_password"
                               class="block w-full rounded-xl border p-2.5 pr-9 text-sm transition-colors"
                               :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                        <button type="button" @click="showConfirmPwd = !showConfirmPwd" class="absolute right-3 top-1/2 -translate-y-1/2">
                          <Eye v-if="!showConfirmPwd" class="h-4 w-4" :style="{ color: mutedTextColor }" />
                          <EyeOff v-else class="h-4 w-4" :style="{ color: mutedTextColor }" />
                        </button>
                      </div>
                      <p v-if="adminForm.confirm_password && adminForm.password !== adminForm.confirm_password" class="mt-1 text-xs text-red-400">No coinciden</p>
                    </div>
                  </div>
                </div>
              </div>

      <!-- Error Message -->
      <div v-if="error" class="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-rose-200">{{ error }}</h3>
          </div>
        </div>
      </div>
    </form>

    <template #footer>

      <button type="submit" :disabled="isLoading" class="nxr-btn nxr-btn-primary" @click="handleSubmit">
        <Loader2 v-if="isLoading" class="animate-spin h-4 w-4" />
        {{ isLoading ? 'Creando...' : 'Crear Empresa' }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
