<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string | number | null; id: string; describedBy?: string; invalid?: boolean; disabled?: boolean }>(), { describedBy: '', invalid: false, disabled: false });
defineEmits<{ 'update:modelValue': [value: string | number | null] }>();
</script>
<template>
  <select :id="id" :value="modelValue" :disabled="disabled" :aria-describedby="describedBy || undefined" :aria-invalid="invalid || undefined" class="nxr-control" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"><slot /></select>
</template>
<style scoped>
.nxr-control { width:100%; min-height:44px; border-radius:.75rem; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.06); padding:.55rem .75rem; color:white; outline:none; }
.nxr-control:focus-visible { outline:3px solid rgba(212,175,55,.75); outline-offset:2px; border-color:transparent; }
.nxr-control:disabled { opacity:.55; cursor:not-allowed; }
</style>
