<script setup lang="ts">
defineProps<{ id: string; label: string; help?: string; required?: boolean; error?: string }>();
</script>
<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium nxr-text-muted">
      {{ label }} <span v-if="required" aria-hidden="true" class="text-amber-300">*</span>
      <span v-if="required" class="sr-only"> (required)</span>
    </label>
    <p v-if="help" :id="`${id}-help`" class="text-xs leading-5 nxr-text-soft">{{ help }}</p>
    <slot :described-by="[help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')" />
    <p v-if="error" :id="`${id}-error`" role="alert" class="text-xs text-red-300">{{ error }}</p>
  </div>
</template>
