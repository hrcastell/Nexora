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

  // 3. Scale: apply transform on <body> so the entire UI scales uniformly.
  //    Compensate width/height so the browser scrollbar doesn't appear prematurely.
  const s = configStore.scale / 100;
  document.body.style.transform = s !== 1 ? `scale(${s})` : '';
  document.body.style.transformOrigin = 'top left';
  document.body.style.width  = s !== 1 ? `${(1 / s) * 100}%` : '';
  document.body.style.height = s !== 1 ? `${(1 / s) * 100}vh` : '';

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
