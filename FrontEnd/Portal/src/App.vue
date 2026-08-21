<script setup lang="ts">
import { onMounted, watchEffect } from 'vue';
import { useVisualConfigStore } from './stores/visualConfig';
import { useIdleLogout } from './composables/useIdleLogout';

const configStore = useVisualConfigStore();
const { showWarning: showIdleWarning, stayConnected } = useIdleLogout();

const applyGlobalConfig = () => {
  const root = document.documentElement;

  // 1. Inject all CSS custom properties onto :root so they cascade everywhere
  Object.entries(configStore.cssVariables).forEach(([key, val]) => {
    root.style.setProperty(key, String(val));
  });

  // 2. Base font-size: affects rem units globally
  root.style.fontSize = configStore.fontSize + 'px';

  // 2b. Apply shellBg to body as base background fallback so the wallpaper
  //     can show through transparent panels. AdminLayout root must be transparent.
  document.body.style.backgroundColor = configStore.shellBg;

  // 3. Keep browser zoom and layout geometry intact. `scale` remains a visual
  // preference token for individual components, not a transform on <body>.
  root.style.setProperty('--nexora-scale', String(configStore.scale / 100));
  document.body.style.transform = '';
  document.body.style.transformOrigin = '';
  document.body.style.width = '';
  document.body.style.height = '';

  // 4. Theme mode attribute – CSS overrides target [data-nexora-mode="light"]
  document.body.setAttribute('data-nexora-mode', configStore.mode);
};

onMounted(() => {
  // watchEffect auto-tracks all reactive deps accessed inside applyGlobalConfig
  watchEffect(applyGlobalConfig);
});
</script>

<template>
  <router-view />

  <div v-if="showIdleWarning" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm rounded-[24px] border border-amber-500/30 bg-white p-4 shadow-xl">
    <p class="text-sm font-semibold text-slate-800">Tu sesión está por cerrarse</p>
    <p class="mt-1 text-sm leading-6 text-slate-600">Por inactividad, se va a cerrar en menos de un minuto.</p>
    <button
      type="button"
      class="mt-3 w-full rounded-2xl bg-[#243b7a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1c2f61]"
      @click="stayConnected"
    >
      Seguir conectado
    </button>
  </div>
</template>
