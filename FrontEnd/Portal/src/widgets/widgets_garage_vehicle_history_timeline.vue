<script setup lang="ts">
import { Wrench, Package, ExternalLink } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import widgets_garage_work_order_status_badge from './widgets_garage_work_order_status_badge.vue';
import type { WorkOrder } from '../types/garage';

defineProps<{
  orders: WorkOrder[];
  currency?: string;
}>();

const router = useRouter();

const fmt = (n: number) => `$${Math.round(n ?? 0).toLocaleString()}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function goToOrder(id: number) {
  router.push(`/garage/work-orders/${id}`);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="orders.length === 0" class="text-center text-xs nxr-text-soft py-8">
      Sin historial de órdenes de trabajo
    </div>

    <div
      v-for="order in orders"
      :key="order.id"
      class="rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-white/25 transition-all"
      :style="{ background: 'var(--nexora-glass-bg)' }"
      @click="goToOrder(order.id)"
    >
      <div class="flex items-start justify-between px-4 py-3 border-b border-white/5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-semibold nxr-text">{{ order.order_number }}</span>
            <widgets_garage_work_order_status_badge :status="order.status" :small="true" />
            <ExternalLink :size="12" class="nxr-text-soft" />
          </div>
          <p class="text-xs nxr-text-muted">
            Ingreso: {{ fmtDate(order.entry_date) }}
            <span v-if="order.delivery_date"> · Entrega: {{ fmtDate(order.delivery_date) }}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold nxr-text">{{ fmt(order.total_amount) }}</p>
          <p class="text-xs nxr-text-muted">
            <span v-if="order.mileage_in">{{ order.mileage_in.toLocaleString() }} km ingreso</span>
            <span v-if="order.mileage_out"> · {{ order.mileage_out.toLocaleString() }} km salida</span>
          </p>
        </div>
      </div>

      <div v-if="order.reported_issue" class="px-4 py-2 text-xs nxr-text-muted border-b border-white/5">
        <span class="nxr-text-soft">Problema: </span>{{ order.reported_issue }}
      </div>

      <div v-if="order.services && order.services.length > 0" class="px-4 py-2 flex flex-col gap-1">
        <div v-for="svc in order.services" :key="svc.id" class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 nxr-text-muted">
            <Wrench :size="11" />
            <span>{{ svc.service_name }}</span>
            <span v-if="svc.actual_hours" class="nxr-text-soft">{{ svc.actual_hours }}h</span>
          </div>
          <div class="flex items-center gap-3 nxr-text-muted">
            <span v-if="svc.products && svc.products.length > 0" class="flex items-center gap-1">
              <Package :size="10" />{{ svc.products.length }}
            </span>
            <span>{{ fmt(svc.service_total) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
