<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <section class="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
    <h2 class="text-base font-semibold text-white">{{ title }}</h2>
    <p v-if="description" class="mt-1 text-sm leading-6 text-white/60">{{ description }}</p>
    <div class="mt-4"><slot /></div>
  </section>
</template>
