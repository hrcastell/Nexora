<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Save } from 'lucide-vue-next';
import { useGarageCustomersStore } from '../stores/garageCustomers';
import widgets_garage_photo_uploader from './widgets_garage_photo_uploader.vue';
import type { Customer, CustomerFormData } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  customer?: Customer | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', customer: Customer): void;
}>();

const store   = useGarageCustomersStore();
const saving  = ref(false);
const error   = ref('');
const photoRef = ref<InstanceType<typeof widgets_garage_photo_uploader> | null>(null);
const pendingPhoto = ref<File | null>(null);

const form = ref<CustomerFormData>({
  first_name: '', last_name: '', document_type: '', document_number: '',
  phone: '', mobile: '', email: '', birth_date: '',
  country: '', region_state: '', city: '', commune_district: '', address: '',
  notes: '', source: '',
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.customer) {
      form.value = {
        first_name:       props.customer.first_name || '',
        last_name:        props.customer.last_name || '',
        document_type:    props.customer.document_type || '',
        document_number:  props.customer.document_number || '',
        phone:            props.customer.phone || '',
        mobile:           props.customer.mobile || '',
        email:            props.customer.email || '',
        birth_date:       props.customer.birth_date || '',
        country:          props.customer.country || '',
        region_state:     props.customer.region_state || '',
        city:             props.customer.city || '',
        commune_district: props.customer.commune_district || '',
        address:          props.customer.address || '',
        notes:            props.customer.notes || '',
        source:           props.customer.source || '',
      };
    } else {
      resetForm();
    }
    error.value = '';
    pendingPhoto.value = null;
  }
});

function resetForm() {
  form.value = { first_name: '', last_name: '', document_type: '', document_number: '', phone: '', mobile: '', email: '', birth_date: '', country: '', region_state: '', city: '', commune_district: '', address: '', notes: '', source: '' };
}

function close() {
  emit('update:modelValue', false);
}

async function save() {
  if (!form.value.first_name?.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true;
  error.value = '';
  try {
    let saved: Customer;
    if (props.customer?.id) {
      saved = await store.update(props.customer.id, form.value);
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
    error.value = e?.response?.data?.error || 'Error al guardar cliente';
  } finally {
    saving.value = false;
  }
}

function onPhotoSelected(file: File) {
  pendingPhoto.value = file;
}

async function onPhotoDelete() {
  if (props.customer?.id) {
    await store.deletePhoto(props.customer.id);
    photoRef.value?.setPreview(null);
  }
  pendingPhoto.value = null;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" @click.self="close">
      <div class="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" :style="{ background: 'var(--nexora-glass-bg, #0b1326)' }">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 class="text-base font-semibold text-white">{{ customer ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
          <button type="button" class="text-white/40 hover:text-white" @click="close"><X :size="18" /></button>
        </div>

        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <div class="flex flex-col items-center mb-6">
            <widgets_garage_photo_uploader
              ref="photoRef"
              :photo-url="customer?.photo_url ?? null"
              alt-text="Foto del cliente"
              @upload="onPhotoSelected"
              @delete="onPhotoDelete"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
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
              <label class="block text-xs text-white/50 mb-1">Móvil</label>
              <input v-model="form.mobile" type="tel" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Correo electrónico</label>
              <input v-model="form.email" type="email" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Fecha de nacimiento</label>
              <input v-model="form.birth_date" type="date" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>

            <div class="col-span-2"><div class="border-t border-white/10 my-1"></div></div>
            <p class="col-span-2 text-xs text-white/40 -mt-3">Dirección</p>

            <div>
              <label class="block text-xs text-white/50 mb-1">País</label>
              <input v-model="form.country" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Región / Estado</label>
              <input v-model="form.region_state" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Ciudad</label>
              <input v-model="form.city" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Comuna / Municipio</label>
              <input v-model="form.commune_district" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Dirección</label>
              <input v-model="form.address" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
            </div>
          </div>

          <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors" @click="close">Cancelar</button>
          <button
            type="button"
            class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            <Save :size="14" />
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
