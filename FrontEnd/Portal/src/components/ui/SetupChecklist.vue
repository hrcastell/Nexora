<script setup lang="ts">
interface ChecklistItem { id: string; title: string; description: string; complete: boolean; actionLabel?: string; to?: string }
defineProps<{ title: string; items: ChecklistItem[] }>();
defineEmits<{ navigate: [item: ChecklistItem] }>();
</script>
<template>
  <section aria-labelledby="setup-checklist-title" class="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
    <h2 id="setup-checklist-title" class="text-base font-semibold nxr-text">{{ title }}</h2>
    <ol class="mt-4 space-y-3">
      <li v-for="(item, index) in items" :key="item.id" class="flex gap-3 rounded-xl border border-white/10 p-3">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="item.complete ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/15 text-amber-200'">{{ item.complete ? '✓' : index + 1 }}</span>
        <div class="min-w-0 flex-1"><p class="font-medium nxr-text">{{ item.title }}</p><p class="mt-1 text-sm leading-5 nxr-text-muted">{{ item.description }}</p></div>
        <button v-if="!item.complete && item.actionLabel" type="button" class="min-h-11 shrink-0 self-center rounded-xl border border-white/15 px-3 text-xs font-medium nxr-text hover:bg-white/10" @click="$emit('navigate', item)">{{ item.actionLabel }}</button>
      </li>
    </ol>
  </section>
</template>
