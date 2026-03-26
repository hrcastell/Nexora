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

  // 2. Scale: use CSS zoom so the entire UI scales uniformly (including rem-based fonts)
  root.style.zoom = configStore.scale + '%';

  // 3. Base font-size: affects Tailwind rem units (text-sm = 0.875rem, etc.)
  root.style.fontSize = configStore.fontSize + 'px';

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
