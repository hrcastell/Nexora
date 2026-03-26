<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../utils/axios';
import { Plus, Search, Building2 } from 'lucide-vue-next';
import CreateCompanyModal from '../../components/admin/CreateCompanyModal.vue';

interface Company {
  id: number;
  name: string;
  schema_name: string;
  country?: string;
  rut: string;
  contact_email: string;
  is_active: boolean;
  plan_type: string;
  created_at: string;
}

const companies = ref<Company[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const showCreateModal = ref(false);

onMounted(async () => {
  await fetchCompanies();
});

const fetchCompanies = async () => {
  try {
    isLoading.value = true;
    const response = await api.get('/companies');
    companies.value = response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
  } finally {
    isLoading.value = false;
  }
};

const filteredList = computed(() => {
  if (!searchQuery.value) return companies.value;
  const lowerQuery = searchQuery.value.toLowerCase();
  return companies.value.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) || 
    c.schema_name.toLowerCase().includes(lowerQuery) ||
    c.rut.toLowerCase().includes(lowerQuery)
  );
});

// Icons
const BuildingIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-4h6v4"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/></svg>` };
</script>

<template>
  <div class="space-y-4">
    <!-- Header Card - Sidebar menu style -->
    <div class="rounded-2xl border nxr-surface p-4 md:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
            <BuildingIcon />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-white">Gestión de Empresas</h1>
            <p class="text-sm text-slate-400">Listado de tenants registrados</p>
          </div>
        </div>
        
        <button
          type="button"
          @click="showCreateModal = true"
          class="flex items-center gap-2 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus class="h-4 w-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>
    </div>

    <!-- Search Bar - Menu style -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search class="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          class="block w-full rounded-xl border-0 bg-white/5 pl-10 text-white placeholder-slate-500 focus:ring-1 focus:ring-[#D4AF37]/50 py-2.5 text-sm transition-colors"
          placeholder="Buscar por nombre, schema o RUT..."
        />
      </div>
    </div>

    <!-- Mobile View (Cards) - Menu item style -->
    <div class="flex flex-col gap-3 md:hidden">
      <div v-if="isLoading" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
        Cargando empresas...
      </div>
      
      <div v-else-if="filteredList.length === 0" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p class="text-slate-400">No se encontraron empresas.</p>
      </div>
      
      <div 
        v-else 
        v-for="company in filteredList" 
        :key="company.id" 
        class="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/[0.07]"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
              <Building2 class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-white">{{ company.name }}</h3>
              <p class="text-xs text-slate-400">{{ company.schema_name }}</p>
            </div>
          </div>
          <span 
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
            :class="company.is_active ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20' : 'bg-rose-400/10 text-rose-200 border-rose-400/20'"
          >
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
        
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div>
            <span class="text-slate-500">RUT:</span> {{ company.rut }}
          </div>
          <div>
            <span class="text-slate-500">Plan:</span> {{ company.plan_type }}
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t border-white/10 flex justify-end">
          <router-link 
            :to="`/admin/companies/${company.id}`" 
            class="text-sm font-medium text-[#D4AF37] hover:text-[#f5df9f] transition-colors"
          >
            Gestionar →
          </router-link>
        </div>
      </div>
    </div>

    <!-- Desktop View (Table) - Sidebar style -->
    <div class="hidden md:block rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <table class="min-w-full">
        <thead class="border-b border-white/10 bg-white/[0.03]">
          <tr>
            <th class="py-3 pl-4 pr-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Empresa</th>
            <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Schema</th>
            <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">RUT</th>
            <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
            <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</th>
            <th class="py-3 pl-3 pr-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          <tr v-if="isLoading">
            <td colspan="6" class="py-8 text-center text-sm text-slate-400">Cargando empresas...</td>
          </tr>
          <tr v-else-if="filteredList.length === 0">
            <td colspan="6" class="py-12 text-center text-sm text-slate-400">No se encontraron empresas.</td>
          </tr>
          <tr 
            v-for="company in filteredList" 
            :key="company.id" 
            class="transition-colors hover:bg-white/[0.03]"
          >
            <td class="py-3 pl-4 pr-3">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                  <Building2 class="h-4 w-4" />
                </div>
                <span class="text-sm font-medium text-white">{{ company.name }}</span>
              </div>
            </td>
            <td class="px-3 py-3 text-sm text-slate-400">{{ company.schema_name }}</td>
            <td class="px-3 py-3 text-sm text-slate-400">{{ company.rut }}</td>
            <td class="px-3 py-3">
              <span 
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                :class="company.is_active ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20' : 'bg-rose-400/10 text-rose-200 border-rose-400/20'"
              >
                {{ company.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-3 py-3 text-sm text-slate-400">{{ company.plan_type }}</td>
            <td class="py-3 pl-3 pr-4 text-right">
              <router-link 
                :to="`/admin/companies/${company.id}`" 
                class="text-sm font-medium text-[#D4AF37] hover:text-[#f5df9f] transition-colors"
              >
                Gestionar
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Company Modal -->
    <CreateCompanyModal 
      :is-open="showCreateModal" 
      @close="showCreateModal = false"
      @created="fetchCompanies"
    />
  </div>
</template>
