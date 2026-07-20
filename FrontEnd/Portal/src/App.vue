<script setup lang="ts">
import { onMounted, watchEffect } from 'vue';
import { useVisualConfigStore } from './stores/visualConfig';

const configStore = useVisualConfigStore();

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
</template>
