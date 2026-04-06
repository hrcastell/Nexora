<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useVisualConfigStore } from '../stores/visualConfig';
import { Activity, Sparkles, Shield, Zap, Layers } from 'lucide-vue-next';

const authStore = useAuthStore();
const configStore = useVisualConfigStore();

// Computed properties for theme-aware styling
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const cardBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(9, 18, 36, 0.80)');
const cardBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const welcomeCardBg = computed(() => isLightMode.value 
  ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98))' 
  : 'linear-gradient(180deg, rgba(15, 23, 42, 0.90), rgba(7, 12, 24, 0.96))');
const badgeBg = computed(() => isLightMode.value ? 'rgba(36, 59, 122, 0.08)' : 'rgba(212, 175, 55, 0.10)');
const badgeBorder = computed(() => isLightMode.value ? 'rgba(36, 59, 122, 0.20)' : 'rgba(212, 175, 55, 0.30)');
const badgeText = computed(() => isLightMode.value ? '#243b7a' : '#f4deb0');
const iconContainerBg = computed(() => isLightMode.value ? 'rgba(36, 59, 122, 0.08)' : 'rgba(124, 58, 237, 0.10)');
const iconColor = computed(() => isLightMode.value ? '#6366f1' : '#a78bfa');
const goldIconContainerBg = computed(() => isLightMode.value ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.10)');
const goldIconColor = computed(() => isLightMode.value ? '#d97706' : '#f0ce6f');
const greenIconContainerBg = computed(() => isLightMode.value ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.10)');
const greenIconColor = computed(() => isLightMode.value ? '#059669' : '#34d399');
const statusDotColor = computed(() => isLightMode.value ? '#10b981' : '#10b981');
const userBadgeBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)');
const userBadgeBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const userBadgeText = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const hoverBorder = computed(() => isLightMode.value ? 'rgba(36, 59, 122, 0.20)' : 'rgba(212, 175, 55, 0.20)');

</script>

<template>
  <div class="space-y-5">
    <!-- Welcome Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
          <Activity class="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-semibold" :style="{ color: headerTextColor }">Dashboard General</h1>
          <p class="text-sm" :style="{ color: mutedTextColor }">Panel principal del sistema Nexora</p>
        </div>
      </div>
      <div class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium" 
           :style="{ 
             backgroundColor: badgeBg, 
             borderColor: badgeBorder, 
             color: badgeText 
           }">
        <Sparkles class="h-3.5 w-3.5" />
        <span>Sistema Operativo</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-3xl border p-5 transition" 
           :style="{ 
             backgroundColor: cardBg, 
             borderColor: cardBorder 
           }"
           @mouseover="(e) => (e.currentTarget as HTMLElement).style.borderColor = hoverBorder"
           @mouseleave="(e) => (e.currentTarget as HTMLElement).style.borderColor = cardBorder">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl" 
               :style="{ 
                 backgroundColor: iconContainerBg, 
                 color: iconColor 
               }">
            <Shield class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs uppercase tracking-wider" :style="{ color: mutedTextColor }">Estado</div>
            <div class="text-sm font-medium" :style="{ color: headerTextColor }">Operativo</div>
          </div>
        </div>
      </div>
      <div class="rounded-3xl border p-5 transition" 
           :style="{ 
             backgroundColor: cardBg, 
             borderColor: cardBorder 
           }"
           @mouseover="(e) => (e.currentTarget as HTMLElement).style.borderColor = hoverBorder"
           @mouseleave="(e) => (e.currentTarget as HTMLElement).style.borderColor = cardBorder">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl" 
               :style="{ 
                 backgroundColor: goldIconContainerBg, 
                 color: goldIconColor 
               }">
            <Layers class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs uppercase tracking-wider" :style="{ color: mutedTextColor }">Schema</div>
            <div class="text-sm font-medium" :style="{ color: headerTextColor }">{{ authStore.currentCompany?.schema_name || 'Ninguno' }}</div>
          </div>
        </div>
      </div>
      <div class="rounded-3xl border p-5 transition" 
           :style="{ 
             backgroundColor: cardBg, 
             borderColor: cardBorder 
           }"
           @mouseover="(e) => (e.currentTarget as HTMLElement).style.borderColor = hoverBorder"
           @mouseleave="(e) => (e.currentTarget as HTMLElement).style.borderColor = cardBorder">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl" 
               :style="{ 
                 backgroundColor: greenIconContainerBg, 
                 color: greenIconColor 
               }">
            <Zap class="h-5 w-5" />
          </div>
          <div>
            <div class="text-xs uppercase tracking-wider" :style="{ color: mutedTextColor }">Versión</div>
            <div class="text-sm font-medium" :style="{ color: headerTextColor }">v1.0.0</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Welcome Card -->
    <div class="rounded-[28px] border p-6 sm:p-8" 
         :style="{ 
           backgroundColor: 'transparent',
           backgroundImage: welcomeCardBg,
           borderColor: cardBorder 
         }">
      <div class="flex flex-col items-center justify-center text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95] shadow-lg shadow-purple-500/20">
          <Activity class="h-7 w-7 text-white" />
        </div>
        <h2 class="mt-5 text-lg font-semibold" :style="{ color: headerTextColor }">Bienvenido al núcleo de Nexora</h2>
        <p class="mt-2 max-w-md text-sm" :style="{ color: mutedTextColor }">
          Este es el panel principal del sistema. Selecciona una opción del menú para comenzar a gestionar tu organización.
        </p>
        <div class="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" 
             :style="{ 
               backgroundColor: userBadgeBg, 
               borderColor: userBadgeBorder, 
               color: userBadgeText 
             }">
          <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: statusDotColor }"></span>
          {{ authStore.user?.email || 'Usuario' }}
        </div>
      </div>
    </div>
  </div>
</template>
