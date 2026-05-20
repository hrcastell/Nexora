<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Save } from 'lucide-vue-next';
import { useGarageVehiclesStore } from '../stores/garageVehicles';
import widgets_garage_catalog_combobox from './widgets_garage_catalog_combobox.vue';
import type { Vehicle } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  vehicle?: Vehicle | null;
  customerId?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', vehicle: Vehicle): void;
}>();

const store  = useGarageVehiclesStore();
const saving = ref(false);
const error  = ref('');

const form = ref({
  customer_id: props.customerId ?? null as number | null,
  vehicle_type_id: null as number | null,
  body_type_id: null as number | null,
  brand_id: null as number | null,
  model_id: null as number | null,
  version: '',
  plate: '',
  year: null as number | null,
  color_id: null as number | null,
  transmission_id: null as number | null,
  fuel_type_id: null as number | null,
  engine_displacement: '',
  vin: '',
  engine_number: '',
  mileage: 0,
  notes: '',
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.vehicle) {
      Object.assign(form.value, {
        customer_id: props.vehicle.customer_id,
        vehicle_type_id: props.vehicle.vehicle_type_id,
        body_type_id: props.vehicle.body_type_id,
        brand_id: props.vehicle.brand_id,
        model_id: props.vehicle.model_id,
        version: props.vehicle.version || '',
        plate: props.vehicle.plate || '',
        year: props.vehicle.year,
        color_id: props.vehicle.color_id,
        transmission_id: props.vehicle.transmission_id,
        fuel_type_id: props.vehicle.fuel_type_id,
        engine_displacement: props.vehicle.engine_displacement || '',
        vin: props.vehicle.vin || '',
        engine_number: props.vehicle.engine_number || '',
        mileage: props.vehicle.mileage || 0,
        notes: props.vehicle.notes || '',
      });
    } else {
      form.value = { customer_id: props.customerId ?? null, vehicle_type_id: null, body_type_id: null, brand_id: null, model_id: null, version: '', plate: '', year: null, color_id: null, transmission_id: null, fuel_type_id: null, engine_displacement: '', vin: '', engine_number: '', mileage: 0, notes: '' };
    }
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function save() {
  if (!form.value.customer_id) { error.value = 'El cliente es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    let saved: Vehicle;
    if (props.vehicle?.id) {
      saved = await store.update(props.vehicle.id, form.value as Partial<Vehicle>);
    } else {
      saved = await store.create(form.value as Partial<Vehicle>);
    }
    emit('saved', saved);
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar vehículo';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" @click.self="close">
      <div class="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" :style="{ background: 'var(--nexora-glass-bg, #0b1326)' }">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 class="text-base font-semibold text-white">{{ vehicle ? 'Editar vehículo' : 'Nuevo vehículo' }}</h2>
          <button type="button" class="text-white/40 hover:text-white" @click="close"><X :size="18" /></button>
        </div>

        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-white/50 mb-1">Tipo de vehículo</label>
              <widgets_garage_catalog_combobox v-model="form.vehicle_type_id" type="vehicle_types" placeholder="Tipo..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Carrocería</label>
              <widgets_garage_catalog_combobox v-model="form.body_type_id" type="vehicle_body_types" placeholder="Carrocería..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Marca</label>
              <widgets_garage_catalog_combobox v-model="form.brand_id" type="vehicle_brands" placeholder="Marca..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Modelo</label>
              <widgets_garage_catalog_combobox v-model="form.model_id" type="vehicle_models" placeholder="Modelo..." :brand-id="form.brand_id ?? undefined" :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Versión</label>
              <input v-model="form.version" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" placeholder="Ej: 1.6 TDI Comfortline" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Año</label>
              <input v-model.number="form.year" type="number" min="1900" :max="new Date().getFullYear() + 1" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Placa / Patente</label>
              <input v-model="form.plate" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 uppercase" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Color</label>
              <widgets_garage_catalog_combobox v-model="form.color_id" type="vehicle_colors" placeholder="Color..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Transmisión</label>
              <widgets_garage_catalog_combobox v-model="form.transmission_id" type="vehicle_transmissions" placeholder="Transmisión..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Combustible</label>
              <widgets_garage_catalog_combobox v-model="form.fuel_type_id" type="vehicle_fuel_types" placeholder="Combustible..." :allow-create="true" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Cilindrada</label>
              <input v-model="form.engine_displacement" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" placeholder="Ej: 1600cc" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Kilometraje actual</label>
              <input v-model.number="form.mileage" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">VIN / Chasis</label>
              <input v-model="form.vin" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 uppercase" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Número de motor</label>
              <input v-model="form.engine_number" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 uppercase" />
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
          <button type="button" class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50" :disabled="saving" @click="save">
            <Save :size="14" />
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
