<script setup lang="ts">
import { ref, reactive } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import api from '../../utils/axios';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const isLoading = ref(false);
const error = ref('');

const form = reactive({
  name: '',
  schema_name: '',
  rut: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  country: 'Chile',
  plan_type: 'basic'
});

const resetForm = () => {
  form.name = '';
  form.schema_name = '';
  form.rut = '';
  form.contact_email = '';
  form.contact_phone = '';
  form.address = '';
  form.country = 'Chile';
  form.plan_type = 'basic';
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

  isLoading.value = true;
  error.value = '';

  try {
    await api.post('/companies', form);
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
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" aria-hidden="true" @click="handleClose"></div>

      <!-- Modal panel -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div class="inline-block align-bottom bg-[#0b1326] border border-white/10 rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl shadow-black/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        
        <div class="absolute top-0 right-0 pt-4 pr-4">
          <button @click="handleClose" type="button" class="rounded-md text-slate-400 hover:text-white focus:outline-none">
            <span class="sr-only">Cerrar</span>
            <X class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-white" id="modal-title">
              Registrar Nueva Empresa
            </h3>
            <div class="mt-2">
              <p class="text-sm text-slate-400">
                Esto creará un nuevo registro y aprovisionará un schema dedicado en la base de datos.
              </p>
            </div>

            <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
              
              <!-- Name -->
              <div>
                <label for="name" class="block text-sm font-medium text-slate-300">Nombre de la Empresa *</label>
                <input type="text" id="name" v-model="form.name" required class="mt-1 block w-full bg-white/5 border-white/10 rounded-xl shadow-sm text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border p-2.5" />
              </div>

              <!-- Schema Name -->
              <div>
                <label for="schema" class="block text-sm font-medium text-slate-300">Nombre del Schema (DB) *</label>
                <div class="mt-1 flex rounded-md shadow-sm">
                  <input type="text" id="schema" v-model="form.schema_name" required placeholder="ej: empresa_x" class="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-xl bg-white/5 border-white/10 text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border" />
                </div>
                <p class="mt-1 text-xs text-slate-500">Solo minúsculas, números y guiones bajos (_).</p>
              </div>

              <!-- RUT -->
              <div>
                <label for="rut" class="block text-sm font-medium text-slate-300">RUT / ID Tributario *</label>
                <input type="text" id="rut" v-model="form.rut" required class="mt-1 block w-full bg-white/5 border-white/10 rounded-xl shadow-sm text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border p-2.5" />
              </div>

              <!-- Country -->
              <div>
                <label for="country" class="block text-sm font-medium text-slate-300">País *</label>
                <select id="country" v-model="form.country" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base bg-white/5 border-white/10 text-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm rounded-xl border">
                  <option value="Chile" class="bg-[#0b1326]">Chile</option>
                  <option value="Argentina" class="bg-[#0b1326]">Argentina</option>
                  <option value="Peru" class="bg-[#0b1326]">Perú</option>
                  <option value="Colombia" class="bg-[#0b1326]">Colombia</option>
                  <option value="Mexico" class="bg-[#0b1326]">México</option>
                  <option value="Bolivia" class="bg-[#0b1326]">Bolivia</option>
                  <option value="Ecuador" class="bg-[#0b1326]">Ecuador</option>
                  <option value="Uruguay" class="bg-[#0b1326]">Uruguay</option>
                  <option value="Paraguay" class="bg-[#0b1326]">Paraguay</option>
                  <option value="Otros" class="bg-[#0b1326]">Otros</option>
                </select>
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium text-slate-300">Email de Contacto *</label>
                <input type="email" id="email" v-model="form.contact_email" required class="mt-1 block w-full bg-white/5 border-white/10 rounded-xl shadow-sm text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border p-2.5" />
              </div>

              <!-- Phone -->
              <div>
                <label for="phone" class="block text-sm font-medium text-slate-300">Teléfono</label>
                <input type="text" id="phone" v-model="form.contact_phone" class="mt-1 block w-full bg-white/5 border-white/10 rounded-xl shadow-sm text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border p-2.5" />
              </div>

              <!-- Address -->
              <div>
                <label for="address" class="block text-sm font-medium text-slate-300">Dirección</label>
                <textarea id="address" v-model="form.address" rows="2" class="mt-1 block w-full bg-white/5 border-white/10 rounded-xl shadow-sm text-white placeholder-slate-500 focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm border p-2.5"></textarea>
              </div>

              <!-- Plan -->
              <div>
                <label for="plan" class="block text-sm font-medium text-slate-300">Plan Inicial</label>
                <select id="plan" v-model="form.plan_type" class="mt-1 block w-full pl-3 pr-10 py-2.5 text-base bg-white/5 border-white/10 text-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm rounded-xl border">
                  <option value="basic" class="bg-[#0b1326]">Básico</option>
                  <option value="pro" class="bg-[#0b1326]">Pro</option>
                  <option value="enterprise" class="bg-[#0b1326]">Enterprise</option>
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
                  {{ isLoading ? 'Creando...' : 'Crear Empresa' }}
                </button>
                <button 
                  type="button" 
                  class="mt-3 w-full inline-flex justify-center rounded-xl border border-white/10 shadow-sm px-4 py-2 bg-white/5 text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-[#0b1326] sm:mt-0 sm:w-auto sm:text-sm transition-all"
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
</template>
