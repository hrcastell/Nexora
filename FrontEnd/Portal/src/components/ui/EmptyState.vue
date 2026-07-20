<script setup lang="ts">
defineProps<{ title: string; description: string; actionLabel?: string }>();
defineEmits<{ action: [] }>();
</script>
<template>
  <section class="rounded-2xl border border-dashed border-white/20 bg-white/[.03] p-6 text-center sm:p-9">
    <h2 class="text-lg font-semibold text-white">{{ title }}</h2><p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/60">{{ description }}</p>
    <button v-if="actionLabel" type="button" class="mt-5 min-h-11 rounded-xl px-4 text-sm font-medium text-white nxr-btn-primary" @click="$emit('action')">{{ actionLabel }}</button>
  </section>
</template>
