<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Save, ClipboardList } from 'lucide-vue-next';
import { useGarageWorkOrdersStore } from '../stores/garageWorkOrders';
import widgets_garage_customer_vehicle_selector from './widgets_garage_customer_vehicle_selector.vue';
import type { WorkOrder } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  workOrder?: WorkOrder | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', wo: WorkOrder): void;
}>();

const store  = useGarageWorkOrdersStore();
const saving = ref(false);
const error  = ref('');

const form = ref({
  customer_id: null as number | null,
  vehicle_id:  null as number | null,
  priority:    'normal',
  reported_issue: '',
  reception_notes: '',
  fuel_level: '',
  vehicle_condition_notes: '',
  mileage_in: null as number | null,
  estimated_delivery_date: '',
  internal_notes: '',
  customer_notes: '',
  currency: 'CLP',
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.workOrder) {
      Object.assign(form.value, {
        customer_id:             props.workOrder.customer_id,
        vehicle_id:              props.workOrder.vehicle_id,
        priority:                props.workOrder.priority || 'normal',
        reported_issue:          props.workOrder.reported_issue || '',
        reception_notes:         props.workOrder.reception_notes || '',
        fuel_level:              props.workOrder.fuel_level || '',
        vehicle_condition_notes: props.workOrder.vehicle_condition_notes || '',
        mileage_in:              props.workOrder.mileage_in,
        estimated_delivery_date: props.workOrder.estimated_delivery_date?.slice(0, 16) || '',
        internal_notes:          props.workOrder.internal_notes || '',
        customer_notes:          props.workOrder.customer_notes || '',
        currency:                props.workOrder.currency || 'CLP',
      });
    } else {
      form.value = { customer_id: null, vehicle_id: null, priority: 'normal', reported_issue: '', reception_notes: '', fuel_level: '', vehicle_condition_notes: '', mileage_in: null, estimated_delivery_date: '', internal_notes: '', customer_notes: '', currency: 'CLP' };
    }
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function save() {
  if (!form.value.customer_id) { error.value = 'El cliente es requerido'; return; }
  if (!form.value.vehicle_id)  { error.value = 'El vehículo es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    let saved: WorkOrder;
    if (props.workOrder?.id) {
      saved = await store.update(props.workOrder.id, form.value as Partial<WorkOrder>);
    } else {
      saved = await store.create(form.value as Partial<WorkOrder>);
    }
    emit('saved', saved);
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar orden';
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
          <div class="flex items-center gap-2">
            <ClipboardList :size="18" class="text-white/60" />
            <h2 class="text-base font-semibold text-white">{{ workOrder ? 'Editar orden' : 'Nueva Orden de Trabajo' }}</h2>
          </div>
          <button type="button" class="text-white/40 hover:text-white" @click="close"><X :size="18" /></button>
        </div>

        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <div class="flex flex-col gap-5">
            <widgets_garage_customer_vehicle_selector
              v-model:customer-id="form.customer_id"
              v-model:vehicle-id="form.vehicle_id"
            />

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-white/50 mb-1">Prioridad</label>
                <select v-model="form.priority" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40">
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Nivel de combustible</label>
                <select v-model="form.fuel_level" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40">
                  <option value="">Seleccionar</option>
                  <option value="empty">Vacío</option>
                  <option value="quarter">1/4</option>
                  <option value="half">1/2</option>
                  <option value="three_quarters">3/4</option>
                  <option value="full">Lleno</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Kilometraje de ingreso</label>
                <input v-model.number="form.mileage_in" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Entrega estimada</label>
                <input v-model="form.estimated_delivery_date" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-white/50 mb-1">Problema reportado</label>
                <textarea v-model="form.reported_issue" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-white/50 mb-1">Estado del vehículo al ingreso</label>
                <textarea v-model="form.vehicle_condition_notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none" placeholder="Rayones, golpes, accesorios..."></textarea>
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-white/50 mb-1">Notas de recepción</label>
                <textarea v-model="form.reception_notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
              </div>
            </div>
          </div>
          <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white" @click="close">Cancelar</button>
          <button type="button" class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
            <Save :size="14" />{{ saving ? 'Guardando...' : 'Crear Orden' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
