<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-vue-next';
import api from '../utils/axios';
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

const expandedService   = ref<number | null>(null);
const addingService     = ref(false);
const newServiceName    = ref('');
const templateId        = ref<number | null>(null);
const templates         = ref<ServiceTemplate[]>([]);
const templatesLoaded   = ref(false);
const addingProduct     = ref<number | null>(null);
const products          = ref<Product[]>([]);
const productsLoaded    = ref(false);
const newProd           = ref({ product_name: '', quantity: 1, unit: '', unit_price: 0 });
const error             = ref('');

// Issue 8: employee + rate selector
const employees         = ref<Array<{ id: number; first_name: string; last_name: string | null }>>([]);
const employeesLoaded   = ref(false);
const selectedEmployeeId = ref<number | null>(null);
const estimatedHours    = ref<number>(0);

async function loadEmployees() {
  if (employeesLoaded.value) return;
  try {
    const res = await api.get('/garage/employees', { params: { status: 'active', limit: 100 } });
    employees.value = res.data.data ?? res.data;
    employeesLoaded.value = true;
  } catch { employees.value = []; }
}

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
      service_name:         newServiceName.value.trim() || undefined,
      service_template_id:  templateId.value ?? undefined,
      assigned_employee_id: selectedEmployeeId.value ?? undefined,
      estimated_hours:      estimatedHours.value || undefined,
    });
    newServiceName.value   = '';
    templateId.value       = null;
    selectedEmployeeId.value = null;
    estimatedHours.value   = 0;
    addingService.value    = false;
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
      <h3 class="text-sm font-semibold nxr-text">Servicios</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs nxr-text-muted">Total: {{ fmt(totalAll) }}</span>
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
        <label class="block text-xs nxr-text-muted mb-1">Plantilla de servicio</label>
        <select v-model="templateId" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none"
          @change="() => { if(templateId) { const t = templates.find(t=>t.id===templateId); if(t) { newServiceName = t.name; if((t as any).estimated_hours) estimatedHours = (t as any).estimated_hours; } } }">
          <option :value="null">Sin plantilla (servicio libre)</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs nxr-text-muted mb-1">Nombre del servicio *</label>
        <input v-model="newServiceName" type="text" placeholder="Ej: Cambio de aceite" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs nxr-text-muted mb-1">Horas estimadas</label>
          <input v-model.number="estimatedHours" type="number" min="0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none focus:border-white/40" />
        </div>
        <div>
          <label class="block text-xs nxr-text-muted mb-1">Asignar empleado</label>
          <select v-model="selectedEmployeeId" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 nxr-text text-sm outline-none"
            @focus="loadEmployees()">
            <option :value="null">Sin asignar</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name || '' }}</option>
          </select>
        </div>
      </div>
      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
      <div class="flex gap-2">
        <button type="button" class="px-3 py-1.5 rounded-lg text-xs nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="addingService=false; error=''">Cancelar</button>
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
            <p class="text-sm nxr-text font-medium">{{ svc.service_name }}</p>
            <p class="text-xs nxr-text-muted">
              {{ svc.estimated_hours }}h est. · {{ svc.actual_hours }}h real · {{ svc.products?.length || 0 }} repuestos
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm nxr-text font-medium">{{ fmt(svc.service_total || 0) }}</p>
            <p class="text-xs nxr-text-muted">MO: {{ fmt(svc.labor_total || 0) }} + Rep: {{ fmt(svc.products_total || 0) }}</p>
          </div>
          <select
            v-if="!disabled"
            :value="svc.status"
            class="text-xs px-2 py-1 rounded-lg bg-white/10 border-none nxr-text-muted outline-none cursor-pointer"
            @click.stop
            @change="changeServiceStatus(svc.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <component :is="expandedService === svc.id ? ChevronUp : ChevronDown" :size="14" class="nxr-text-muted" />
        </div>
      </div>

      <div v-if="expandedService === svc.id" class="border-t border-white/10 px-4 py-3 bg-white/2 flex flex-col gap-3">
        <div v-if="(svc.products?.length ?? 0) > 0" class="flex flex-col gap-1">
          <p class="text-xs nxr-text-muted mb-1 flex items-center gap-1"><Package :size="12" /> Repuestos / Materiales</p>
          <div v-for="prod in svc.products" :key="prod.id" class="flex items-center justify-between text-xs nxr-text-muted">
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
            class="flex items-center gap-1 text-xs nxr-text-muted hover:text-[var(--nexora-text-color)]"
            @click="addingProduct = svc.id; loadProducts()"
          >
            <Plus :size="12" /> Agregar repuesto
          </button>
          <div v-else class="flex flex-col gap-2 mt-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div class="col-span-2">
                <select
                  class="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 nxr-text text-xs outline-none"
                  @change="(e) => { const p = products.find(x => x.id === parseInt((e.target as HTMLSelectElement).value)); if(p) { newProd.product_name = p.name; newProd.unit = p.unit || ''; newProd.unit_price = p.reference_price ?? 0; } }"
                >
                  <option value="">— Seleccionar del catálogo (opcional) —</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} · {{ fmt(p.reference_price ?? 0) }}/{{ p.unit || 'u.' }}</option>
                </select>
              </div>
              <input v-model="newProd.product_name" type="text" placeholder="Nombre del producto *" class="col-span-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 nxr-text text-xs outline-none" />
              <input v-model.number="newProd.quantity" type="number" min="1" step="0.01" placeholder="Cantidad" class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 nxr-text text-xs outline-none" />
              <div class="relative">
                <input v-model.number="newProd.unit_price" type="number" min="0" placeholder="Precio unit." class="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 nxr-text text-xs outline-none" />
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs nxr-text-soft">Subtotal: {{ fmt((newProd.quantity || 0) * (newProd.unit_price || 0)) }}</span>
              <div class="flex gap-2">
                <button type="button" class="text-xs nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="addingProduct=null; error=''">Cancelar</button>
                <button type="button" class="text-xs px-3 py-1 rounded-lg bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="addProduct(svc.id)">Agregar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="services.length === 0" class="text-center text-xs nxr-text-soft py-6 rounded-xl border border-dashed border-white/10">
      Sin servicios. Agrega el primer servicio para esta orden.
    </div>

    <p v-if="error && !addingService && addingProduct === null" class="text-xs text-red-400">{{ error }}</p>
  </div>
</template>
