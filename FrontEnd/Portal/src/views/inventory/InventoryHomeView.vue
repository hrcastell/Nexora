<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '../../components/ui/PageHeader.vue';
import SetupChecklist from '../../components/ui/SetupChecklist.vue';
import PrerequisiteGate from '../../components/ui/PrerequisiteGate.vue';
import { useGarageProductsStore } from '../../stores/garageProducts';
import { useInventorySuppliersStore } from '../../stores/inventorySuppliers';
import { useInventoryWarehousesStore } from '../../stores/inventoryWarehouses';
import { useMenuStore } from '../../stores/menu';

const router = useRouter();
const menuStore = useMenuStore();
const productsStore = useGarageProductsStore();
const suppliersStore = useInventorySuppliersStore();
const warehousesStore = useInventoryWarehousesStore();

interface ChecklistItem { id: string; title: string; description: string; complete: boolean; actionLabel?: string; to?: string }

onMounted(async () => {
  await Promise.all([
    productsStore.load({ status: 'active', limit: 1 }),
    suppliersStore.load({ status: 'active' }),
    warehousesStore.load({ status: 'active' }),
  ]);
});

const canOpenProducts = computed(() => menuStore.hasTransaction('/garage/products'));
const checklist = computed<ChecklistItem[]>(() => [
  { id: 'products', title: 'Productos', description: productsStore.total ? `${productsStore.total} producto(s) disponible(s) para inventario.` : 'Definí qué productos o repuestos vas a comprar y controlar.', complete: productsStore.total > 0, actionLabel: canOpenProducts.value ? 'Gestionar' : undefined, to: '/garage/products' },
  { id: 'suppliers', title: 'Proveedores', description: suppliersStore.items.length ? `${suppliersStore.items.length} proveedor(es) activo(s).` : 'Registrá a quién le comprás para poder emitir una orden.', complete: suppliersStore.items.length > 0, actionLabel: 'Crear proveedor', to: '/inventory/suppliers' },
  { id: 'warehouses', title: 'Bodegas', description: warehousesStore.items.length ? `${warehousesStore.items.length} bodega(s) activa(s).` : 'Creá una ubicación para recibir y consultar stock.', complete: warehousesStore.items.length > 0, actionLabel: 'Crear bodega', to: '/inventory/warehouses' },
  { id: 'purchase', title: 'Compra', description: 'Emití una orden o documento de compra cuando los maestros estén listos.', complete: false, actionLabel: 'Nueva compra', to: '/inventory/purchase-documents/new' },
  { id: 'receipt', title: 'Recepción y stock', description: 'Recibí los productos para actualizar el stock por bodega.', complete: false, actionLabel: 'Ver recepciones', to: '/inventory/receptions' },
]);

function go(item: ChecklistItem) { if (item.to) router.push(item.to); }
</script>
<template>
  <div class="flex flex-col gap-6 p-3 sm:p-5">
    <PageHeader eyebrow="Core de negocio" title="Inventario" description="Organizá el abastecimiento y el stock. Seguí esta secuencia para evitar documentos sin productos, proveedor o bodega.">
      <template #actions><button type="button" class="nxr-btn nxr-btn-primary min-h-11" @click="router.push('/inventory/purchase-documents/new')">Nueva compra</button></template>
    </PageHeader>

    <PrerequisiteGate v-if="!canOpenProducts" title="Falta acceso al catálogo de productos" message="El catálogo que Inventario utiliza hoy está en Garage. Pedile a un administrador que habilite el acceso antes de registrar una compra." action-label="Ver proveedores" @action="router.push('/inventory/suppliers')" />

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
      <SetupChecklist title="Prepará Inventario" :items="checklist" @navigate="go" />
      <section class="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
        <h2 class="text-base font-semibold nxr-text">Flujo recomendado</h2>
        <ol class="mt-4 space-y-3 text-sm leading-6 nxr-text-muted"><li><strong class="nxr-text">1. Maestros:</strong> productos, proveedores y bodegas.</li><li><strong class="nxr-text">2. Compra:</strong> creá el documento y confirmá sus líneas.</li><li><strong class="nxr-text">3. Recepción:</strong> ingresá lo recibido a una bodega.</li><li><strong class="nxr-text">4. Control:</strong> revisá existencias y alertas de reposición.</li></ol>
      </section>
    </div>
  </div>
</template>
