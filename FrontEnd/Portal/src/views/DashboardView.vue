<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { Activity, LayoutDashboard } from 'lucide-vue-next';

const authStore = useAuthStore();

// Icons
const DashboardIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` };
</script>

<template>
  <div class="space-y-4">
    <!-- Header Card - Sidebar menu style -->
    <div class="rounded-2xl border nxr-surface p-4 md:p-5">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <DashboardIcon />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-white">Dashboard General</h1>
          <p class="text-sm text-slate-400">Panel principal del sistema</p>
        </div>
      </div>
    </div>

    <!-- Welcome Card - Menu item style -->
    <div class="rounded-2xl border nxr-surface p-6 md:p-8">
      <div class="flex flex-col items-center justify-center text-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active mb-4">
          <Activity class="h-5 w-5" />
        </div>
        <h2 class="text-lg font-medium text-white">Bienvenido al núcleo de Nexora</h2>
        <p class="mt-2 text-sm text-slate-400 max-w-md">
          Este es el panel principal. Selecciona una opción del menú para comenzar a gestionar tu organización.
        </p>
        <div class="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          Schema activo: <span class="text-white ml-1">{{ authStore.currentCompany?.schema_name || 'Ninguno' }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats Row -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <LayoutDashboard class="h-4 w-4" />
          </div>
          <div>
            <div class="text-xs text-slate-400">Estado</div>
            <div class="text-sm font-medium text-white">Operativo</div>
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <Activity class="h-4 w-4" />
          </div>
          <div>
            <div class="text-xs text-slate-400">Versión</div>
            <div class="text-sm font-medium text-white">v1.0.0</div>
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <div class="text-xs text-slate-400">Uptime</div>
            <div class="text-sm font-medium text-white">99.9%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
