<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronDown, Plus, Check } from 'lucide-vue-next';
import { garageCustomersService } from '../services/garageCustomersService';
import widgets_garage_customer_form_modal from './widgets_garage_customer_form_modal.vue';
import type { Customer, CustomerListItem } from '../types/garage';

const props = defineProps<{
  modelValue: number | null | undefined;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | null): void;
}>();

const query           = ref('');
const results         = ref<CustomerListItem[]>([]);
const open            = ref(false);
const searching       = ref(false);
const selected        = ref<Customer | CustomerListItem | null>(null);
const showCreateForm  = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function label(c: { first_name: string; last_name: string | null }) {
  return `${c.first_name} ${c.last_name || ''}`.trim();
}

watch(() => props.modelValue, async (id) => {
  if (!id) { selected.value = null; return; }
  if (selected.value?.id === id) return;
  try {
    const res = await garageCustomersService.getById(id);
    selected.value = res.data;
  } catch {
    // Keep showing the placeholder rather than breaking the field over a lookup failure.
  }
}, { immediate: true });

async function search(q: string) {
  searching.value = true;
  try {
    const res = await garageCustomersService.list({ q, status: 'active', limit: 8 });
    results.value = res.data.data;
  } finally {
    searching.value = false;
  }
}

function onQueryInput() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!query.value.trim()) { results.value = []; return; }
  searchTimer = setTimeout(() => search(query.value), 300);
}

function select(c: Customer | CustomerListItem) {
  selected.value = c;
  query.value    = '';
  results.value  = [];
  open.value     = false;
  emit('update:modelValue', c.id);
}

function clear() {
  selected.value = null;
  emit('update:modelValue', null);
}

function openCreateForm() {
  showCreateForm.value = true;
  open.value = false;
}

function onCustomerSaved(customer: Customer) {
  select(customer);
}

const showCreateOption = computed(() => {
  const q = query.value.trim();
  if (!q) return false;
  return !results.value.some(r => label(r).toLowerCase() === q.toLowerCase());
});
</script>

<template>
  <div class="relative w-full">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/40',
        open ? 'border-[var(--nexora-primary)]' : 'border-white/20',
      ]"
      :style="{ background: 'var(--nexora-glass-bg)' }"
      :disabled="disabled"
      @click="open = !open"
    >
      <span :class="selected ? 'nxr-text' : 'nxr-text-muted'">
        {{ selected ? label(selected) : (placeholder || 'Buscar cliente...') }}
      </span>
      <div class="flex items-center gap-1">
        <span v-if="selected" class="nxr-text-muted hover:text-[var(--nexora-text-color)] text-xs" @click.stop="clear">✕</span>
        <ChevronDown :size="14" class="nxr-text-muted transition-transform" :class="open ? 'rotate-180' : ''" />
      </div>
    </button>

    <div
      v-if="open"
      class="absolute z-30 w-full mt-1 rounded-xl border border-white/20 overflow-hidden shadow-xl"
      :style="{ background: 'var(--nexora-glass-bg-strong, #0b1326)' }"
    >
      <div class="p-2 border-b border-white/10">
        <input
          v-model="query"
          type="text"
          class="w-full bg-transparent text-sm nxr-text placeholder-[var(--nexora-soft-text)] outline-none"
          placeholder="Escribí para buscar..."
          autofocus
          @input="onQueryInput"
        />
      </div>

      <ul class="max-h-52 overflow-y-auto">
        <li
          v-for="c in results"
          :key="c.id"
          class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 text-sm nxr-text transition-colors"
          @click="select(c)"
        >
          <span>{{ label(c) }} <span v-if="c.email || c.phone" class="ml-1 nxr-text-soft text-xs">· {{ c.email || c.phone }}</span></span>
          <Check v-if="c.id === modelValue" :size="14" class="text-[var(--nexora-primary)]" />
        </li>

        <li v-if="searching" class="px-3 py-2 text-sm nxr-text-muted">Buscando...</li>
        <li v-else-if="query.trim() && results.length === 0" class="px-3 py-2 text-sm nxr-text-muted">Sin resultados</li>
        <li v-else-if="!query.trim()" class="px-3 py-2 text-sm nxr-text-muted">Escribí para buscar clientes</li>

        <li
          v-if="showCreateOption"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/10 text-sm text-[var(--nexora-primary)] transition-colors border-t border-white/10"
          @click="openCreateForm"
        >
          <Plus :size="14" />
          Crear cliente "{{ query.trim() }}"
        </li>
      </ul>
    </div>

    <widgets_garage_customer_form_modal v-model="showCreateForm" :customer="null" @saved="onCustomerSaved" />
  </div>
</template>
