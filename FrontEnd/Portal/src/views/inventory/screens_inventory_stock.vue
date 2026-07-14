<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { useInventoryStockStore } from '../../stores/inventoryStock';
import { useInventoryWarehousesStore } from '../../stores/inventoryWarehouses';
import { useGarageProductsStore } from '../../stores/garageProducts';

const stockStore = useInventoryStockStore();
const warehousesStore = useInventoryWarehousesStore();
const productsStore = useGarageProductsStore();

const mode = ref<'product' | 'warehouse'>('product');
const productId = ref<number | undefined>();
const warehouseId = ref<number | undefined>();

async function load() {
  if (mode.value === 'product') await stockStore.loadByProduct(productId.value);
  else await stockStore.loadByWarehouse(warehouseId.value);
}

onMounted(async () => {
  await Promise.all([
    warehousesStore.load({ status: 'active' }),
    productsStore.load({ status: 'active', limit: 200 }),
  ]);
  await load();
});

watch([mode, productId, warehouseId], load);
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div>
      <h1 class="text-xl font-semibold text-white">Stock</h1>
      <p class="text-xs text-white/40">Consulta de existencias por producto o bodega.</p>
    </div>

    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 md:grid-cols-3" :style="{ background: 'var(--nexora-glass-bg)' }">
      <div>
        <label class="mb-1 block text-xs text-white/50">Vista</label>
        <select v-model="mode" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="product">Por producto</option>
          <option value="warehouse">Por bodega</option>
        </select>
      </div>
      <div v-if="mode === 'product'" class="md:col-span-2">
        <label class="mb-1 block text-xs text-white/50">Producto</label>
        <select v-model.number="productId" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option :value="undefined">Todos</option>
          <option v-for="product in productsStore.items" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </div>
      <div v-else class="md:col-span-2">
        <label class="mb-1 block text-xs text-white/50">Bodega</label>
        <select v-model.number="warehouseId" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option :value="undefined">Todas</option>
          <option v-for="warehouse in warehousesStore.items" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="stockStore.loading" class="space-y-2"><div v-for="i in 8" :key="i" class="h-14 animate-pulse rounded-xl bg-white/5"></div></div>
    <div v-else-if="stockStore.rows.length === 0" class="rounded-2xl border border-white/10 py-16 text-center text-sm text-white/30">
      <Search class="mx-auto mb-3 h-8 w-8 text-white/20" />
      Sin movimientos de stock para el filtro seleccionado.
    </div>
    <div v-else class="flex flex-col gap-2">
      <div v-for="row in stockStore.rows" :key="`${row.product_id}-${row.warehouse_id}`" class="grid grid-cols-1 gap-2 rounded-xl border border-white/10 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div><p class="text-sm font-medium text-white">{{ row.product_name }}</p><p class="text-xs text-white/35">Producto #{{ row.product_id }}</p></div>
        <div><p class="text-sm text-white/70">{{ row.warehouse_name }}</p><p class="text-xs text-white/35">Bodega #{{ row.warehouse_id }}</p></div>
        <p class="text-lg font-semibold text-white">{{ Number(row.on_hand || 0).toLocaleString('es-CL') }}</p>
      </div>
    </div>
  </div>
</template>
