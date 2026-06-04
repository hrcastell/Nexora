<script setup lang="ts">
import { ref, watch } from 'vue';
import { Save } from 'lucide-vue-next';
import { useGarageEmployeesStore } from '../stores/garageEmployees';
import widgets_garage_photo_uploader from './widgets_garage_photo_uploader.vue';
import NxrSlidePanel from '../components/NxrSlidePanel.vue';
import type { Employee } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  employee?: Employee | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', employee: Employee): void;
}>();

const store   = useGarageEmployeesStore();
const saving  = ref(false);
const error   = ref('');
const photoRef = ref<InstanceType<typeof widgets_garage_photo_uploader> | null>(null);
const pendingPhoto = ref<File | null>(null);

const form = ref({
  first_name: '', last_name: '', document_type: '', document_number: '',
  phone: '', email: '', role_name: '', specialty: '', notes: '',
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.employee) {
      form.value = {
        first_name:      props.employee.first_name || '',
        last_name:       props.employee.last_name || '',
        document_type:   props.employee.document_type || '',
        document_number: props.employee.document_number || '',
        phone:           props.employee.phone || '',
        email:           props.employee.email || '',
        role_name:       props.employee.role_name || '',
        specialty:       props.employee.specialty || '',
        notes:           props.employee.notes || '',
      };
    } else {
      form.value = { first_name: '', last_name: '', document_type: '', document_number: '', phone: '', email: '', role_name: '', specialty: '', notes: '' };
    }
    error.value = '';
    pendingPhoto.value = null;
  }
});

function close() { emit('update:modelValue', false); }

async function save() {
  if (!form.value.first_name?.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    let saved: Employee;
    if (props.employee?.id) {
      saved = await store.update(props.employee.id, form.value);
    } else {
      saved = await store.create(form.value);
    }
    if (pendingPhoto.value) {
      await store.uploadPhoto(saved.id, pendingPhoto.value);
      pendingPhoto.value = null;
    }
    emit('saved', saved);
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar empleado';
  } finally {
    saving.value = false;
  }
}

async function onPhotoDelete() {
  if (props.employee?.id) {
    await store.deletePhoto(props.employee.id);
    photoRef.value?.setPreview(null);
  }
  pendingPhoto.value = null;
}
</script>

<template>
  <NxrSlidePanel
    :open="modelValue"
    :title="employee ? 'Editar empleado' : 'Nuevo empleado'"
    size="md"
    @close="close"
  >
          <div class="flex flex-col items-center mb-6">
            <widgets_garage_photo_uploader
              ref="photoRef"
              :photo-url="employee?.photo_url ?? null"
              alt-text="Foto del empleado"
              @upload="(f) => pendingPhoto = f"
              @delete="onPhotoDelete"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-white/50 mb-1">Nombre *</label>
              <input v-model="form.first_name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Apellido</label>
              <input v-model="form.last_name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Tipo documento</label>
              <select v-model="form.document_type" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40">
                <option value="">Seleccionar</option>
                <option value="RUT">RUT</option>
                <option value="DNI">DNI</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Número documento</label>
              <input v-model="form.document_number" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Teléfono</label>
              <input v-model="form.phone" type="tel" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Correo electrónico</label>
              <input v-model="form.email" type="email" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Rol / Cargo</label>
              <input v-model="form.role_name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" placeholder="Ej: Mecánico, Electricista" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Especialidad</label>
              <input v-model="form.specialty" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" placeholder="Ej: Motor, Frenos" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
          </div>
    <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>

    <template #footer>
      <button type="button" class="nxr-btn nxr-btn-secondary" @click="close">Cancelar</button>
      <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">
        <Save :size="14" />{{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
