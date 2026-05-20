<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, ArrowRight } from 'lucide-vue-next';
import { useGarageWorkOrdersStore } from '../stores/garageWorkOrders';
import type { WorkOrderStatus } from '../types/garage';

const props = defineProps<{
  modelValue: boolean;
  orderId: number;
  currentStatus: WorkOrderStatus;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'changed'): void;
}>();

const store   = useGarageWorkOrdersStore();
const saving  = ref(false);
const error   = ref('');
const notes   = ref('');
const newStatus = ref<WorkOrderStatus>('received');

const TRANSITIONS: Record<string, { value: WorkOrderStatus; label: string }[]> = {
  draft:         [{ value: 'received', label: 'Marcar como Recibida' }, { value: 'cancelled', label: 'Cancelar' }],
  received:      [{ value: 'diagnosis', label: 'Enviar a Diagnóstico' }, { value: 'in_progress', label: 'Iniciar trabajo' }, { value: 'cancelled', label: 'Cancelar' }],
  diagnosis:     [{ value: 'approved', label: 'Marcar como Aprobada' }, { value: 'in_progress', label: 'Iniciar trabajo' }, { value: 'cancelled', label: 'Cancelar' }],
  approved:      [{ value: 'in_progress', label: 'Iniciar trabajo' }, { value: 'waiting_parts', label: 'Esperar repuestos' }, { value: 'cancelled', label: 'Cancelar' }],
  in_progress:   [{ value: 'waiting_parts', label: 'Esperar repuestos' }, { value: 'completed', label: 'Completar' }, { value: 'cancelled', label: 'Cancelar' }],
  waiting_parts: [{ value: 'in_progress', label: 'Reanudar trabajo' }, { value: 'cancelled', label: 'Cancelar' }],
  completed:     [{ value: 'delivered', label: 'Marcar Entregada' }],
  delivered:     [],
  cancelled:     [],
};

const availableTransitions = ref<{ value: WorkOrderStatus; label: string }[]>([]);

watch(() => props.modelValue, (val) => {
  if (val) {
    availableTransitions.value = TRANSITIONS[props.currentStatus] ?? [];
    newStatus.value = availableTransitions.value[0]?.value ?? 'received';
    notes.value = '';
    error.value = '';
  }
});

function close() { emit('update:modelValue', false); }

async function confirm() {
  saving.value = true; error.value = '';
  try {
    await store.changeStatus(props.orderId, newStatus.value, notes.value || undefined);
    emit('changed');
    close();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cambiar estado';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" @click.self="close">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden" :style="{ background: 'var(--nexora-glass-bg, #0b1326)' }">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 class="text-base font-semibold text-white">Cambiar estado</h2>
          <button type="button" class="text-white/40 hover:text-white" @click="close"><X :size="18" /></button>
        </div>

        <div class="p-6 flex flex-col gap-4">
          <div v-if="availableTransitions.length === 0" class="text-sm text-white/50 text-center py-2">
            No hay transiciones disponibles para este estado.
          </div>

          <div v-else>
            <label class="block text-xs text-white/50 mb-2">Nuevo estado</label>
            <div class="flex flex-col gap-2">
              <label
                v-for="t in availableTransitions"
                :key="t.value"
                class="flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all"
                :class="newStatus === t.value ? 'border-[var(--nexora-primary)] bg-[var(--nexora-primary)]/10' : 'border-white/10 hover:border-white/30'"
              >
                <input v-model="newStatus" type="radio" :value="t.value" class="hidden" />
                <div class="w-3 h-3 rounded-full border-2 flex items-center justify-center" :class="newStatus === t.value ? 'border-[var(--nexora-primary)]' : 'border-white/30'">
                  <div v-if="newStatus === t.value" class="w-1.5 h-1.5 rounded-full bg-[var(--nexora-primary)]"></div>
                </div>
                <span class="text-sm text-white">{{ t.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs text-white/50 mb-1">Notas (opcional)</label>
            <textarea v-model="notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40 resize-none"></textarea>
          </div>
          <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white" @click="close">Cancelar</button>
          <button
            v-if="availableTransitions.length > 0"
            type="button"
            class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50"
            :disabled="saving"
            @click="confirm"
          >
            <ArrowRight :size="14" />{{ saving ? 'Cambiando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
