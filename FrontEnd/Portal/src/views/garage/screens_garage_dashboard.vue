<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ClipboardList, Calendar, Users, Car, Wrench, Clock, CheckCircle, Package } from 'lucide-vue-next';
import api from '../../utils/axios';
import type { GarageDashboard } from '../../types/garage';

const router  = useRouter();
const data    = ref<GarageDashboard | null>(null);
const loading      = ref(true);
const error        = ref('');

onMounted(async () => {
  try {
    const res = await api.get<GarageDashboard>('/garage/dashboard');
    data.value = res.data;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cargar dashboard';
  } finally {
    loading.value = false;
  }
});

const CARDS = [
  { key: 'orders_open',        label: 'Órdenes abiertas',   icon: ClipboardList, color: 'text-blue-400',   route: '/garage/work-orders?status=received' },
  { key: 'orders_diagnosis',   label: 'En diagnóstico',     icon: Wrench,        color: 'text-purple-400', route: '/garage/work-orders?status=diagnosis' },
  { key: 'orders_in_progress', label: 'En proceso',         icon: Clock,         color: 'text-yellow-400', route: '/garage/work-orders?status=in_progress' },
  { key: 'orders_waiting_parts',label: 'Esp. repuestos',    icon: Package,       color: 'text-orange-400', route: '/garage/work-orders?status=waiting_parts' },
  { key: 'orders_completed',   label: 'Completadas',        icon: CheckCircle,   color: 'text-green-400',  route: '/garage/work-orders?status=completed' },
  { key: 'appointments_today', label: 'Citas hoy',          icon: Calendar,      color: 'text-cyan-400',   route: '/garage/appointments' },
  { key: 'active_customers',   label: 'Clientes activos',   icon: Users,         color: 'text-pink-400',   route: '/garage/customers' },
  { key: 'active_vehicles',    label: 'Vehículos activos',  icon: Car,           color: 'text-indigo-400', route: '/garage/vehicles' },
];
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Dashboard — Taller</h1>
    </div>

    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="h-24 rounded-2xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="text-center text-red-400 py-10">{{ error }}</div>

    <div v-else-if="data" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        v-for="card in CARDS"
        :key="card.key"
        class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10 text-left hover:border-white/25 transition-all group cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(card.route)"
      >
        <component :is="card.icon" :size="22" :class="card.color" />
        <p class="text-2xl font-bold text-white">{{ (data as any)[card.key] ?? 0 }}</p>
        <p class="text-xs text-white/50">{{ card.label }}</p>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <button class="flex items-center gap-3 p-5 rounded-2xl border border-white/10 hover:border-white/25 transition-all text-left" :style="{ background: 'var(--nexora-glass-bg)' }" @click="router.push('/garage/work-orders/new')">
        <ClipboardList :size="20" class="text-[var(--nexora-primary)]" />
        <div>
          <p class="text-sm font-semibold text-white">Nueva Orden de Trabajo</p>
          <p class="text-xs text-white/40">Crear orden directa sin cita previa</p>
        </div>
      </button>
      <button class="flex items-center gap-3 p-5 rounded-2xl border border-white/10 hover:border-white/25 transition-all text-left" :style="{ background: 'var(--nexora-glass-bg)' }" @click="router.push('/garage/appointments/new')">
        <Calendar :size="20" class="text-[var(--nexora-primary)]" />
        <div>
          <p class="text-sm font-semibold text-white">Nueva Cita</p>
          <p class="text-xs text-white/40">Agendar cita para un cliente</p>
        </div>
      </button>
    </div>
  </div>
</template>
