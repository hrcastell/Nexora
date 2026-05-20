<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-vue-next';
import { garageWorkOrdersService } from '../services/garageWorkOrdersService';
import { garageServiceTemplatesService } from '../services/garageServiceTemplatesService';
import { garageProductsService } from '../services/garageProductsService';
import type { WorkOrderService, ServiceTemplate, Product } from '../types/garage';

const props = defineProps<{
  orderId: number;
  services: WorkOrderService[];
  disabled?: boolean;
  currency?: string;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const expandedService = ref<number | null>(null);
const addingService   = ref(false);
const newServiceName  = ref('');
const templateId      = ref<number | null>(null);
const templates       = ref<ServiceTemplate[]>([]);
const templatesLoaded = ref(false);
const addingProduct   = ref<number | null>(null);
const products        = ref<Product[]>([]);
const productsLoaded  = ref(false);
const newProd         = ref({ product_name: '', quantity: 1, unit: '', unit_price: 0 });
const error           = ref('');

const fmt = (n: number) => (props.currency === 'USD' ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString()}`);

async function loadTemplates() {
  if (templatesLoaded.value) return;
  const res = await garageServiceTemplatesService.list({ status: 'active', limit: 100 });
  templates.value = res.data.data;
  templatesLoaded.value = true;
}

async function loadProducts() {
  if (productsLoaded.value) return;
  const res = await garageProductsService.list({ status: 'active', limit: 200 });
  products.value = res.data.data;
  productsLoaded.value = true;
}

function toggleExpand(id: number) {
  expandedService.value = expandedService.value === id ? null : id;
}

async function addService() {
  if (!newServiceName.value.trim() && !templateId.value) { error.value = 'Ingresa un nombre o selecciona una plantilla'; return; }
  error.value = '';
  try {
    await garageWorkOrdersService.addService(props.orderId, {
      service_name:       newServiceName.value.trim() || undefined,
      service_template_id: templateId.value ?? undefined,
    });
    newServiceName.value = '';
    templateId.value     = null;
    addingService.value  = false;
    emit('updated');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al agregar servicio';
  }
}

async function removeService(serviceId: number) {
  try {
    await garageWorkOrdersService.removeService(props.orderId, serviceId);
    if (expandedService.value === serviceId) expandedService.value = null;
    emit('updated');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar servicio';
  }
}

async function changeServiceStatus(serviceId: number, status: string) {
  try {
    await garageWorkOrdersService.changeServiceStatus(props.orderId, serviceId, status);
    emit('updated');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cambiar estado';
  }
}

async function addProduct(serviceId: number) {
  if (!newProd.value.product_name.trim()) { error.value = 'Ingresa un nombre de producto'; return; }
  error.value = '';
  try {
    await garageWorkOrdersService.addProduct(props.orderId, serviceId, {
      product_name: newProd.value.product_name.trim(),
      quantity:     newProd.value.quantity,
      unit:         newProd.value.unit || undefined,
      unit_price:   newProd.value.unit_price,
    });
    newProd.value     = { product_name: '', quantity: 1, unit: '', unit_price: 0 };
    addingProduct.value = null;
    emit('updated');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al agregar producto';
  }
}

async function removeProduct(serviceId: number, productLineId: number) {
  try {
    await garageWorkOrdersService.removeProduct(props.orderId, serviceId, productLineId);
    emit('updated');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar producto';
  }
}

const totalAll = computed(() => props.services.reduce((s, svc) => s + (svc.service_total || 0), 0));
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-white/70">Servicios</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-white/40">Total: {{ fmt(totalAll) }}</span>
        <button
          v-if="!disabled"
          type="button"
          class="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-[var(--nexora-primary)]/20 text-[var(--nexora-primary)] hover:bg-[var(--nexora-primary)]/30 transition-colors"
          @click="addingService = true; loadTemplates()"
        >
          <Plus :size="12" /> Agregar servicio
        </button>
      </div>
    </div>

    <div v-if="addingService" class="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      <div>
        <label class="block text-xs text-white/50 mb-1">Plantilla de servicio</label>
        <select v-model="templateId" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" @change="if(templateId) { const t = templates.find(t=>t.id===templateId); if(t) newServiceName=t.name; }">
          <option :value="null">Sin plantilla (servicio libre)</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-white/50 mb-1">Nombre del servicio *</label>
        <input v-model="newServiceName" type="text" placeholder="Ej: Cambio de aceite" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
      </div>
      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
      <div class="flex gap-2">
        <button type="button" class="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white" @click="addingService=false; error=''">Cancelar</button>
        <button type="button" class="px-3 py-1.5 rounded-lg text-xs bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="addService">Agregar</button>
      </div>
    </div>

    <div v-for="svc in services" :key="svc.id" class="rounded-xl border border-white/10 overflow-hidden">
      <div
        class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        @click="toggleExpand(svc.id)"
      >
        <div class="flex items-center gap-3">
          <button v-if="!disabled" type="button" class="text-red-400/60 hover:text-red-400 transition-colors" @click.stop="removeService(svc.id)">
            <Trash2 :size="13" />
          </button>
          <div>
            <p class="text-sm text-white font-medium">{{ svc.service_name }}</p>
            <p class="text-xs text-white/40">
              {{ svc.estimated_hours }}h est. · {{ svc.actual_hours }}h real · {{ svc.products?.length || 0 }} repuestos
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm text-white/80 font-medium">{{ fmt(svc.service_total || 0) }}</p>
            <p class="text-xs text-white/40">MO: {{ fmt(svc.labor_total || 0) }} + Rep: {{ fmt(svc.products_total || 0) }}</p>
          </div>
          <select
            v-if="!disabled"
            :value="svc.status"
            class="text-xs px-2 py-1 rounded-lg bg-white/10 border-none text-white/70 outline-none cursor-pointer"
            @click.stop
            @change="changeServiceStatus(svc.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <component :is="expandedService === svc.id ? ChevronUp : ChevronDown" :size="14" class="text-white/40" />
        </div>
      </div>

      <div v-if="expandedService === svc.id" class="border-t border-white/10 px-4 py-3 bg-white/2 flex flex-col gap-3">
        <div v-if="(svc.products?.length ?? 0) > 0" class="flex flex-col gap-1">
          <p class="text-xs text-white/50 mb-1 flex items-center gap-1"><Package :size="12" /> Repuestos / Materiales</p>
          <div v-for="prod in svc.products" :key="prod.id" class="flex items-center justify-between text-xs text-white/70">
            <span>{{ prod.quantity }} {{ prod.unit || 'u.' }} × {{ prod.product_name }}</span>
            <div class="flex items-center gap-2">
              <span>{{ fmt(prod.total_price) }}</span>
              <button v-if="!disabled" type="button" class="text-red-400/50 hover:text-red-400" @click="removeProduct(svc.id, prod.id)"><Trash2 :size="11" /></button>
            </div>
          </div>
        </div>

        <div v-if="!disabled">
          <button
            v-if="addingProduct !== svc.id"
            type="button"
            class="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
            @click="addingProduct = svc.id; loadProducts()"
          >
            <Plus :size="12" /> Agregar repuesto
          </button>
          <div v-else class="grid grid-cols-4 gap-2 mt-2">
            <input v-model="newProd.product_name" type="text" placeholder="Nombre" list="prod-list" class="col-span-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
            <datalist id="prod-list">
              <option v-for="p in products" :key="p.id" :value="p.name"></option>
            </datalist>
            <input v-model.number="newProd.quantity" type="number" min="1" step="0.01" placeholder="Cant." class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
            <input v-model.number="newProd.unit_price" type="number" min="0" placeholder="Precio u." class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
            <div class="col-span-4 flex gap-2">
              <button type="button" class="text-xs text-white/50 hover:text-white" @click="addingProduct=null; error=''">Cancelar</button>
              <button type="button" class="text-xs px-3 py-1 rounded-lg bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="addProduct(svc.id)">Agregar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="services.length === 0" class="text-center text-xs text-white/30 py-6 rounded-xl border border-dashed border-white/10">
      Sin servicios. Agrega el primer servicio para esta orden.
    </div>

    <p v-if="error && !addingService && addingProduct === null" class="text-xs text-red-400">{{ error }}</p>
  </div>
</template>
