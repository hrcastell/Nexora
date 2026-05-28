<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Save, Search, AlertTriangle } from 'lucide-vue-next';
import api from '../utils/axios';
import { useGarageVehiclesStore } from '../stores/garageVehicles';
import widgets_garage_catalog_combobox from './widgets_garage_catalog_combobox.vue';
import NxrSlidePanel from '../components/NxrSlidePanel.vue';
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

// Customer search for Issue 4
const customerQuery    = ref('');
const customerResults  = ref<Array<{ id: number; first_name: string; last_name: string | null; document_number: string | null }>>([]);
const customerSearching = ref(false);
const showCustomerDrop = ref(false);
const selectedCustomerLabel = ref('');
const originalCustomerId = ref<number | null>(null);
const transferReason = ref('');

const isTransfer = computed(() =>
  !!props.vehicle?.id &&
  form.value.customer_id !== null &&
  form.value.customer_id !== originalCustomerId.value
);

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
      originalCustomerId.value = props.vehicle.customer_id ?? null;
      selectedCustomerLabel.value = (props.vehicle as any).customer_name || '';
    } else {
      form.value = { customer_id: props.customerId ?? null, vehicle_type_id: null, body_type_id: null, brand_id: null, model_id: null, version: '', plate: '', year: null, color_id: null, transmission_id: null, fuel_type_id: null, engine_displacement: '', vin: '', engine_number: '', mileage: 0, notes: '' };
      originalCustomerId.value = props.customerId ?? null;
      selectedCustomerLabel.value = '';
    }
    customerQuery.value = '';
    customerResults.value = [];
    transferReason.value = '';
    error.value = '';
  }
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
async function onCustomerInput() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!customerQuery.value.trim()) { customerResults.value = []; showCustomerDrop.value = false; return; }
  searchTimer = setTimeout(async () => {
    customerSearching.value = true;
    try {
      const res = await api.get('/garage/customers', { params: { q: customerQuery.value, status: 'active', limit: 8 } });
      customerResults.value = res.data.data ?? res.data;
      showCustomerDrop.value = true;
    } catch { customerResults.value = []; } finally { customerSearching.value = false; }
  }, 300);
}

function hideCustomerDrop() {
  setTimeout(() => { showCustomerDrop.value = false; }, 200);
}

function selectCustomer(c: { id: number; first_name: string; last_name: string | null }) {
  form.value.customer_id = c.id;
  selectedCustomerLabel.value = `${c.first_name} ${c.last_name || ''}`.trim();
  customerQuery.value = '';
  customerResults.value = [];
  showCustomerDrop.value = false;
}

function close() { emit('update:modelValue', false); }

async function save() {
  if (!form.value.customer_id) { error.value = 'El cliente es requerido'; return; }
  if (isTransfer.value && !transferReason.value.trim()) {
    error.value = 'El motivo del traspaso es requerido';
    return;
  }
  saving.value = true; error.value = '';
  try {
    const payload: Record<string, unknown> = { ...form.value };
    if (isTransfer.value) payload.transfer_reason = transferReason.value.trim();
    let saved: Vehicle;
    if (props.vehicle?.id) {
      saved = await store.update(props.vehicle.id, payload as Partial<Vehicle>);
    } else {
      saved = await store.create(payload as Partial<Vehicle>);
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
  <NxrSlidePanel
    :open="modelValue"
    :title="vehicle ? 'Editar vehículo' : 'Nuevo vehículo'"
    size="lg"
    @close="close"
  >

          <!-- Issue 4: Customer selector -->
          <div class="mb-4 relative">
            <label class="block text-xs text-white/50 mb-1">Cliente *</label>
            <div v-if="form.customer_id && selectedCustomerLabel" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
              <span class="flex-1">{{ selectedCustomerLabel }}</span>
              <button v-if="!props.customerId" type="button" class="text-white/30 hover:text-white/70 text-xs" @click="form.customer_id = null; selectedCustomerLabel = ''">Cambiar</button>
            </div>
            <div v-else class="relative">
              <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Search :size="14" class="text-white/30 shrink-0" />
                <input
                  v-model="customerQuery"
                  type="text"
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  class="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                  @input="onCustomerInput"
                  @blur="hideCustomerDrop"
                />
                <span v-if="customerSearching" class="text-xs text-white/30">...</span>
              </div>
              <div v-if="showCustomerDrop && customerResults.length > 0" class="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-white/10 shadow-xl overflow-hidden" style="background: var(--nexora-glass-bg, #0b1326)">
                <button
                  v-for="c in customerResults" :key="c.id"
                  type="button"
                  class="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                  @mousedown.prevent="selectCustomer(c)"
                >
                  {{ c.first_name }} {{ c.last_name || '' }}
                  <span v-if="c.document_number" class="ml-2 text-xs text-white/40">{{ c.document_number }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Issue 4: Transfer reason (shown when changing owner on edit mode) -->
          <div v-if="isTransfer" class="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <div class="flex items-center gap-2 mb-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle :size="13" />
              Traspaso de propietario — se registrará en el historial del vehículo
            </div>
            <textarea
              v-model="transferReason"
              rows="2"
              placeholder="Motivo del traspaso (requerido)..."
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-white/40 resize-none"
            ></textarea>
          </div>

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

    <template #footer>
      <button type="button" class="nxr-btn nxr-btn-secondary" @click="close">Cancelar</button>
      <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">
        <Save :size="14" />
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </template>
  </NxrSlidePanel>
</template>
