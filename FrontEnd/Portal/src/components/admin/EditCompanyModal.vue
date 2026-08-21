<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import api from '../../utils/axios';
import { Loader2 } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';
import NxrSlidePanel from '../NxrSlidePanel.vue';

interface Company {
  id: number;
  name: string;
  schema_name: string;
  country: string;
  rut: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  plan_type: string;
  subscription_plan_id?: number | null;
}

interface SubscriptionPlan { id: number; code: string; name: string; is_active: boolean; }
const plans = ref<SubscriptionPlan[]>([]);

onMounted(async () => {
  try {
    const res = await api.get('/subscription-plans');
    plans.value = res.data;
    syncPlanTypeFromSelection(form.subscription_plan_id);
  } catch { /* silent */ }
});

const props = defineProps<{
  isOpen: boolean;
  company: Company | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated'): void;
}>();

const isLoading = ref(false);
const error = ref('');

// Theme-aware styling
const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const labelColor = computed(() => isLightMode.value ? '#374151' : '#9ca3af');
const optionBg = computed(() => isLightMode.value ? '#ffffff' : '#0b1326');

const form = reactive({
  name: '',
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

// Watch for company changes to populate form
watch(() => props.company, (newCompany) => {
  if (newCompany) {
    form.name = newCompany.name;
    form.rut = newCompany.rut;
    form.contact_email = newCompany.contact_email;
    form.contact_phone = newCompany.contact_phone || '';
    form.address = newCompany.address || '';
    form.country = newCompany.country;
    form.plan_type = newCompany.plan_type;
    form.subscription_plan_id = newCompany.subscription_plan_id ?? null;
  }
}, { immediate: true });

watch(() => form.subscription_plan_id, (newPlanId) => {
  syncPlanTypeFromSelection(newPlanId);
});

const handleClose = () => {
  error.value = '';
  emit('close');
};

const handleSubmit = async () => {
  if (!form.name || !form.contact_email || !form.rut || !form.country) {
    error.value = 'Nombre, RUT, Email y País son obligatorios.';
    return;
  }

  if (!props.company) {
    error.value = 'No se encontró la empresa a editar.';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    await api.put(`/companies/${props.company.id}`, form);
    emit('updated');
    handleClose();
  } catch (err: any) {
    if (err.response && err.response.data && err.response.data.error) {
      error.value = err.response.data.error;
    } else {
      error.value = 'Error al actualizar la empresa. Verifique los datos.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <NxrSlidePanel
    :open="isOpen"
    title="Editar Empresa"
    eyebrow="Actualiza los datos de la empresa. El schema de base de datos no puede modificarse."
    size="md"
    @close="handleClose"

    draft-key="components/admin/EditCompanyModal.vue#1"
    :draft-entity="company?.id"
    :draft-state="{ form }">
    <form @submit.prevent="handleSubmit" class="space-y-4">

              <!-- Name -->
              <div>
                <label for="edit-name" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre de la Empresa *</label>
                <input type="text" id="edit-name" v-model="form.name" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: 'var(--nexora-input-bg)',
                         borderColor: 'var(--nexora-input-border)',
                         color: headerTextColor
                       }" />
              </div>

              <!-- Schema Name (Read-only) -->
              <div>
                <label for="edit-schema" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre del Schema (DB)</label>
                <input type="text" id="edit-schema" :value="company?.schema_name" disabled class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm opacity-60 cursor-not-allowed"
                       :style="{
                         backgroundColor: 'var(--nexora-input-bg)',
                         borderColor: 'var(--nexora-input-border)',
                         color: mutedTextColor
                       }" />
                <p class="mt-1 text-xs" :style="{ color: mutedTextColor }">El schema no puede ser modificado una vez creado.</p>
              </div>

              <!-- RUT -->
              <div>
                <label for="edit-rut" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">RUT / ID Tributario *</label>
                <input type="text" id="edit-rut" v-model="form.rut" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: 'var(--nexora-input-bg)',
                         borderColor: 'var(--nexora-input-border)',
                         color: headerTextColor
                       }" />
              </div>

              <!-- Country -->
              <div>
                <label for="edit-country" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">País *</label>
                <select id="edit-country" v-model="form.country" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors"
                        :style="{
                          backgroundColor: 'var(--nexora-input-bg)',
                          borderColor: 'var(--nexora-input-border)',
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
                <label for="edit-email" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Email de Contacto *</label>
                <input type="email" id="edit-email" v-model="form.contact_email" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: 'var(--nexora-input-bg)',
                         borderColor: 'var(--nexora-input-border)',
                         color: headerTextColor
                       }" />
              </div>

              <!-- Phone -->
              <div>
                <label for="edit-phone" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Teléfono</label>
                <input type="text" id="edit-phone" v-model="form.contact_phone" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                       :style="{
                         backgroundColor: 'var(--nexora-input-bg)',
                         borderColor: 'var(--nexora-input-border)',
                         color: headerTextColor
                       }" />
              </div>

              <!-- Address -->
              <div>
                <label for="edit-address" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Dirección</label>
                <textarea id="edit-address" v-model="form.address" rows="2" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors"
                          :style="{
                            backgroundColor: 'var(--nexora-input-bg)',
                            borderColor: 'var(--nexora-input-border)',
                            color: headerTextColor
                          }"></textarea>
              </div>

              <!-- Plan -->
              <div>
                <label for="edit-plan" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Plan de Suscripción</label>
                <select id="edit-plan" v-model="form.subscription_plan_id" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors"
                        :style="{ backgroundColor: 'var(--nexora-input-bg)', borderColor: 'var(--nexora-input-border)', color: headerTextColor }">
                  <option :value="null" :style="{ backgroundColor: optionBg }">Sin plan</option>
                  <option v-for="p in plans" :key="p.id" :value="p.id" :style="{ backgroundColor: optionBg }">{{ p.name }}</option>
                </select>
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
        {{ isLoading ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
