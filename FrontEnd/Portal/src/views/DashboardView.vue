<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { Activity, Sparkles, Shield, Zap } from 'lucide-vue-next';

const authStore = useAuthStore();

// Icons
const ActivityIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` };
const LayersIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>` };
</script>

<template>
  <div class="space-y-5">
    <!-- Welcome Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
          <ActivityIcon class="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-white">Dashboard General</h1>
          <p class="text-sm text-slate-400">Panel principal del sistema Nexora</p>
        </div>
      </div>
      <div class="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#f4deb0]">
        <Sparkles class="h-3.5 w-3.5" />
        <span>Sistema Operativo</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-3xl border border-white/10 bg-[#091224]/80 p-5 transition hover:border-[#d4af37]/20">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7c3aed]/10 text-[#a78bfa]">
            <Shield class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Estado</div>
            <div class="text-sm font-medium text-white">Operativo</div>
          </div>
        </div>
      </div>
      <div class="rounded-3xl border border-white/10 bg-[#091224]/80 p-5 transition hover:border-[#d4af37]/20">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d4af37]/10 text-[#f0ce6f]">
            <LayersIcon class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Schema</div>
            <div class="text-sm font-medium text-white">{{ authStore.currentCompany?.schema_name || 'Ninguno' }}</div>
          </div>
        </div>
      </div>
      <div class="rounded-3xl border border-white/10 bg-[#091224]/80 p-5 transition hover:border-[#d4af37]/20">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10b981]/10 text-emerald-400">
            <Zap class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs text-slate-400 uppercase tracking-wider">Versión</div>
            <div class="text-sm font-medium text-white">v1.0.0</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Welcome Card -->
    <div class="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.90),rgba(7,12,24,0.96))] p-6 sm:p-8">
      <div class="flex flex-col items-center justify-center text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95] shadow-lg shadow-purple-500/20">
          <Activity class="h-7 w-7 text-white" />
        </div>
        <h2 class="mt-5 text-lg font-semibold text-white">Bienvenido al núcleo de Nexora</h2>
        <p class="mt-2 max-w-md text-sm text-slate-400">
          Este es el panel principal del sistema. Selecciona una opción del menú para comenzar a gestionar tu organización.
        </p>
        <div class="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          {{ authStore.user?.email || 'Usuario' }}
        </div>
      </div>
    </div>
  </div>
</template>
