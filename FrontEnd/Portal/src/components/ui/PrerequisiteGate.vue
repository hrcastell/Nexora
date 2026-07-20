<script setup lang="ts">
defineProps<{ title: string; message: string; actionLabel: string }>();
defineEmits<{ action: [] }>();
</script>
<template>
  <aside role="status" class="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
    <h2 class="font-semibold text-amber-100">{{ title }}</h2><p class="mt-1 text-sm leading-6 text-amber-50/80">{{ message }}</p>
    <button type="button" class="mt-3 min-h-11 rounded-xl bg-amber-300 px-3 text-sm font-semibold text-slate-950" @click="$emit('action')">{{ actionLabel }}</button>
  </aside>
</template>
