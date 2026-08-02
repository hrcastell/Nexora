<script setup lang="ts">
defineProps<{ title: string; description?: string; eyebrow?: string }>();
</script>
<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p v-if="eyebrow" class="text-xs font-semibold uppercase tracking-[0.16em] nxr-text-soft">{{ eyebrow }}</p>
      <h1 class="mt-1 text-2xl font-semibold nxr-text">{{ title }}</h1>
      <p v-if="description" class="mt-2 max-w-3xl text-sm leading-6 nxr-text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
