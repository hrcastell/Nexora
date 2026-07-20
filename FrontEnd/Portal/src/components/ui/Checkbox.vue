<script setup lang="ts">
defineProps<{ id: string; modelValue: boolean; label: string; help?: string; disabled?: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>
<template>
  <label :for="id" class="flex min-h-11 items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/85" :class="disabled ? 'opacity-55' : 'cursor-pointer'">
    <input :id="id" :checked="modelValue" :disabled="disabled" type="checkbox" class="mt-0.5 h-5 w-5 accent-amber-400" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
    <span><span class="font-medium">{{ label }}</span><span v-if="help" class="mt-0.5 block text-xs leading-5 text-white/55">{{ help }}</span></span>
  </label>
</template>
