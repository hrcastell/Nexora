<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, ToggleLeft, ToggleRight, ChevronRight, User } from 'lucide-vue-next';
import { useGarageCustomersStore } from '../../stores/garageCustomers';
import widgets_garage_customer_form_modal from '../../widgets/widgets_garage_customer_form_modal.vue';
import type { Customer, CustomerListItem } from '../../types/garage';

const router = useRouter();
const store  = useGarageCustomersStore();

const q        = ref('');
const status   = ref('active');
const page     = ref(1);
const showForm = ref(false);
const editing  = ref<Customer | null>(null);

function apiBase() {
  try { return new URL(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').origin; }
  catch { return 'http://localhost:3000'; }
}
function photoSrc(url: string) { return url.startsWith('http') ? url : `${apiBase()}${url}`; }
function onImgError(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

function openCreate() { editing.value = null; showForm.value = true; }
function openEdit(c: CustomerListItem) { store.loadOne(c.id).then(full => { editing.value = full; showForm.value = true; }); }

async function toggleStatus(c: CustomerListItem) {
  const next = c.status === 'active' ? 'inactive' : 'active';
  await store.toggleStatus(c.id, next);
}

function onSaved() { showForm.value = false; load(); }
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Clientes</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Nuevo cliente
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="Buscar por nombre, email, teléfono..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">
      No se encontraron clientes.
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="c in store.items"
        :key="c.id"
        class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all cursor-pointer"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(`/garage/customers/${c.id}`)"
      >
        <div class="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
          <img v-if="c.photo_url" :src="photoSrc(c.photo_url)" class="w-full h-full object-cover" @error="onImgError" />
          <User v-else :size="18" class="text-white/30" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ c.first_name }} {{ c.last_name || '' }}</p>
          <p class="text-xs text-white/40 truncate">{{ c.email || c.phone || c.mobile || 'Sin contacto' }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span v-if="c.city" class="hidden md:block text-xs text-white/30">{{ c.city }}</span>
          <button type="button" class="text-white/30 hover:text-white/70 transition-colors" @click.stop="toggleStatus(c)">
            <ToggleRight v-if="c.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" class="text-white/30" />
          </button>
          <button type="button" class="text-white/30 hover:text-white transition-colors" @click.stop="openEdit(c)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} clientes en total</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <widgets_garage_customer_form_modal v-model="showForm" :customer="editing" @saved="onSaved" />
  </div>
</template>
