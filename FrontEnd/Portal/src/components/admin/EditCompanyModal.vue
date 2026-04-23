<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import api from '../../utils/axios';
import { X, Loader2 } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';

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
const modalBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 19, 38, 0.98)');
const modalBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const inputBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.90)' : 'rgba(255, 255, 255, 0.05)');
const inputBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const labelColor = computed(() => isLightMode.value ? '#374151' : '#9ca3af');
const optionBg = computed(() => isLightMode.value ? '#ffffff' : '#0b1326');

// Helper functions for template
const getButtonBg = () => isLightMode.value ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
const getButtonHoverBg = () => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
const getButtonBorder = () => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)';
const getButtonHoverBorder = () => isLightMode.value ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';

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
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" aria-hidden="true" @click="handleClose"></div>

      <!-- Modal panel -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div class="inline-block align-bottom rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" 
           :style="{ 
             backgroundColor: modalBg, 
             borderColor: modalBorder 
           }">
        
        <div class="absolute top-0 right-0 pt-4 pr-4">
          <button @click="handleClose" type="button" class="rounded-md transition-colors" 
                  :style="{ color: mutedTextColor }"
                  @mouseover="(e) => (e.currentTarget as HTMLElement).style.color = headerTextColor"
                  @mouseleave="(e) => (e.currentTarget as HTMLElement).style.color = mutedTextColor">
            <span class="sr-only">Cerrar</span>
            <X class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium" :style="{ color: headerTextColor }" id="modal-title">
              Editar Empresa
            </h3>
            <div class="mt-2">
              <p class="text-sm" :style="{ color: mutedTextColor }">
                Actualiza los datos de la empresa. El schema de base de datos no puede modificarse.
              </p>
            </div>

            <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
              
              <!-- Name -->
              <div>
                <label for="edit-name" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre de la Empresa *</label>
                <input type="text" id="edit-name" v-model="form.name" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors" 
                       :style="{ 
                         backgroundColor: inputBg, 
                         borderColor: inputBorder, 
                         color: headerTextColor 
                       }" />
              </div>

              <!-- Schema Name (Read-only) -->
              <div>
                <label for="edit-schema" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Nombre del Schema (DB)</label>
                <input type="text" id="edit-schema" :value="company?.schema_name" disabled class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm opacity-60 cursor-not-allowed" 
                       :style="{ 
                         backgroundColor: inputBg, 
                         borderColor: inputBorder, 
                         color: mutedTextColor 
                       }" />
                <p class="mt-1 text-xs" :style="{ color: mutedTextColor }">El schema no puede ser modificado una vez creado.</p>
              </div>

              <!-- RUT -->
              <div>
                <label for="edit-rut" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">RUT / ID Tributario *</label>
                <input type="text" id="edit-rut" v-model="form.rut" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors" 
                       :style="{ 
                         backgroundColor: inputBg, 
                         borderColor: inputBorder, 
                         color: headerTextColor 
                       }" />
              </div>

              <!-- Country -->
              <div>
                <label for="edit-country" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">País *</label>
                <select id="edit-country" v-model="form.country" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors" 
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
                <label for="edit-email" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Email de Contacto *</label>
                <input type="email" id="edit-email" v-model="form.contact_email" required class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors" 
                       :style="{ 
                         backgroundColor: inputBg, 
                         borderColor: inputBorder, 
                         color: headerTextColor 
                       }" />
              </div>

              <!-- Phone -->
              <div>
                <label for="edit-phone" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Teléfono</label>
                <input type="text" id="edit-phone" v-model="form.contact_phone" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors" 
                       :style="{ 
                         backgroundColor: inputBg, 
                         borderColor: inputBorder, 
                         color: headerTextColor 
                       }" />
              </div>

              <!-- Address -->
              <div>
                <label for="edit-address" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Dirección</label>
                <textarea id="edit-address" v-model="form.address" rows="2" class="mt-1 block w-full rounded-xl shadow-sm border p-2.5 text-sm transition-colors" 
                          :style="{ 
                            backgroundColor: inputBg, 
                            borderColor: inputBorder, 
                            color: headerTextColor 
                          }"></textarea>
              </div>

              <!-- Plan -->
              <div>
                <label for="edit-plan" class="block text-sm font-medium mb-2" :style="{ color: labelColor }">Plan de Suscripción</label>
                <select id="edit-plan" v-model="form.subscription_plan_id" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-xl border text-sm transition-colors"
                        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }">
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

              <!-- Actions -->
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 nxr-btn-primary text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b1326] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all"
                >
                  <Loader2 v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {{ isLoading ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
                <button 
                  type="button" 
                  class="mt-3 w-full inline-flex justify-center rounded-xl border shadow-sm px-4 py-2 text-base font-medium transition sm:mt-0 sm:w-auto sm:text-sm" 
                  :style="{ 
                    backgroundColor: getButtonBg(), 
                    borderColor: getButtonBorder(), 
                    color: mutedTextColor 
                  }"
                  @mouseover="(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = getButtonHoverBg(); (e.currentTarget as HTMLElement).style.borderColor = getButtonHoverBorder(); }"
                  @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = getButtonBg(); (e.currentTarget as HTMLElement).style.borderColor = getButtonBorder(); }"
                  @click="handleClose"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  </Teleport>
</template>
