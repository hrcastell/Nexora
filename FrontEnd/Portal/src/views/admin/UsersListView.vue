<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Users, Shield, ShieldCheck, Search, Loader2 } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';

interface SystemUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  company_count: number;
}

const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor  = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const cardBg          = computed(() => isLightMode.value ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.05)');
const cardBorder      = computed(() => isLightMode.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const tableHeaderBg   = computed(() => isLightMode.value ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)');
const tableHoverBg    = computed(() => isLightMode.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');
const inputBg         = computed(() => isLightMode.value ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.05)');
const inputBorder     = computed(() => isLightMode.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');

const users     = ref<SystemUser[]>([]);
const isLoading = ref(true);
const search    = ref('');

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u =>
    u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
});

onMounted(async () => {
  try {
    const res = await api.get('/users');
    users.value = res.data;
  } catch (e) {
    console.error('Error fetching users:', e);
  } finally {
    isLoading.value = false;
  }
});

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL') : '-';
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <Users class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerTextColor }">Usuarios del Sistema</h1>
          <p class="text-xs" :style="{ color: mutedTextColor }">Todos los usuarios registrados en la plataforma</p>
        </div>
      </div>
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" :style="{ color: mutedTextColor }" />
        <input
          v-model="search"
          type="text"
          placeholder="Buscar usuario..."
          class="rounded-2xl border pl-9 pr-4 py-2 text-sm focus:outline-none w-60"
          :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <!-- Table -->
    <div v-else class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
      <div class="border-b p-4" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
        <span class="text-sm font-medium" :style="{ color: headerTextColor }">
          {{ filteredUsers.length }} usuario{{ filteredUsers.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div v-if="filteredUsers.length === 0" class="p-8 text-center text-sm" :style="{ color: mutedTextColor }">
        No se encontraron usuarios.
      </div>

      <table v-else class="min-w-full">
        <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <tr>
            <th class="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Usuario</th>
            <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Tipo</th>
            <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Empresas</th>
            <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Estado</th>
            <th class="py-3 pl-3 pr-4 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Creado</th>
          </tr>
        </thead>
        <tbody class="divide-y" :style="{ borderColor: cardBorder }">
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="transition-colors"
            @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
          >
            <td class="py-3 pl-4 pr-3">
              <p class="text-sm font-medium" :style="{ color: headerTextColor }">{{ user.full_name }}</p>
              <p class="text-xs" :style="{ color: mutedTextColor }">{{ user.email }}</p>
            </td>
            <td class="px-3 py-3">
              <span v-if="user.is_super_admin"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-200 border border-purple-500/20">
                <ShieldCheck class="h-3 w-3" /> Super Admin
              </span>
              <span v-else
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 border border-white/10"
                    :style="{ color: mutedTextColor }">
                <Shield class="h-3 w-3" /> Usuario
              </span>
            </td>
            <td class="px-3 py-3">
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-200 border border-blue-500/20">
                {{ user.company_count }}
              </span>
            </td>
            <td class="px-3 py-3">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                    :class="user.is_active ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                {{ user.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="py-3 pl-3 pr-4 text-sm" :style="{ color: mutedTextColor }">{{ formatDate(user.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
