<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../utils/axios';
import { Plus, Search, Building2 } from 'lucide-vue-next';
import CreateCompanyModal from '../../components/admin/CreateCompanyModal.vue';
import { useVisualConfigStore } from '../../stores/visualConfig';

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

// Theme-aware styling
const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const cardBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(9, 18, 36, 0.80)');
const cardBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const searchBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 19, 38, 0.80)');
const searchInputBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const searchInputBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.90)' : 'rgba(11, 19, 38, 0.90)');
const searchIconColor = computed(() => isLightMode.value ? '#64748b' : '#94a3b8');
const searchTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const searchPlaceholderColor = computed(() => isLightMode.value ? '#94a3b8' : '#64748b');
const tableHeaderBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)');
const tableHoverBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)');
const smallCardBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)');

// Helper functions for template
const getHoverBorderColor = () => isLightMode.value ? 'rgba(124, 58, 237, 0.20)' : 'rgba(124, 58, 237, 0.30)';
const getSmallCardBorderColor = () => isLightMode.value ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
const getDividerBorderColor = () => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)';

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

</script>

<template>
  <div class="space-y-5">
    <!-- Header - Nexora Style -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
          <Building2 class="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-semibold" :style="{ color: headerTextColor }">Gestión de Empresas</h1>
          <p class="text-sm" :style="{ color: mutedTextColor }">Administración de tenants y suscripciones</p>
        </div>
      </div>
      
      <button
        type="button"
        @click="showCreateModal = true"
        class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
      >
        <Plus class="h-4 w-4" />
        <span>Nueva Empresa</span>
      </button>
    </div>

    <!-- Search Bar - Nexora Input Style -->
    <div class="rounded-3xl border p-4" 
         :style="{ 
           backgroundColor: searchBg, 
           borderColor: cardBorder 
         }">
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search class="h-5 w-5" :style="{ color: searchIconColor }" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          class="block w-full rounded-2xl border pl-11 pr-4 py-3 text-sm transition-all"
          :style="{ 
            backgroundColor: searchInputBg, 
            borderColor: searchInputBorder, 
            color: searchTextColor
          }"
          :placeholder-color="searchPlaceholderColor"
          placeholder="Buscar por nombre, schema o RUT..."
        />
      </div>
    </div>

    <!-- Mobile View (Cards) - Nexora Style -->
    <div class="flex flex-col gap-3 md:hidden">
      <div v-if="isLoading" class="rounded-3xl border p-8 text-center" 
           :style="{ 
             backgroundColor: cardBg, 
             borderColor: cardBorder, 
             color: mutedTextColor 
           }">
        Cargando empresas...
      </div>
      
      <div v-else-if="filteredList.length === 0" class="rounded-3xl border p-8 text-center" 
           :style="{ 
             backgroundColor: cardBg, 
             borderColor: cardBorder 
           }">
        <p :style="{ color: mutedTextColor }">No se encontraron empresas.</p>
      </div>
      
      <div 
        v-else 
        v-for="company in filteredList" 
        :key="company.id" 
        class="rounded-3xl border p-5 transition" 
        :style="{ 
          backgroundColor: cardBg, 
          borderColor: cardBorder 
        }"
        @mouseover="(e) => (e.currentTarget as HTMLElement).style.borderColor = getHoverBorderColor()"
        @mouseleave="(e) => (e.currentTarget as HTMLElement).style.borderColor = cardBorder">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
              <Building2 class="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-semibold" :style="{ color: headerTextColor }">{{ company.name }}</h3>
              <p class="text-xs uppercase tracking-wider" :style="{ color: mutedTextColor }">{{ company.schema_name }}</p>
            </div>
          </div>
          <span 
            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
            :class="company.is_active 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'"
          >
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
        
        <div class="mt-4 grid grid-cols-2 gap-3 text-xs" :style="{ color: mutedTextColor }">
          <div class="rounded-xl border p-2" 
               :style="{ 
                 backgroundColor: smallCardBg, 
                 borderColor: getSmallCardBorderColor() 
               }">
            <span class="block mb-1" :style="{ color: searchPlaceholderColor }">RUT</span>
            {{ company.rut }}
          </div>
          <div class="rounded-xl border p-2" 
               :style="{ 
                 backgroundColor: smallCardBg, 
                 borderColor: getSmallCardBorderColor() 
               }">
            <span class="block mb-1" :style="{ color: searchPlaceholderColor }">Plan</span>
            {{ company.plan_type }}
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t flex justify-end" 
             :style="{ borderColor: getDividerBorderColor() }">
          <router-link 
            :to="`/admin/companies/${company.id}`" 
            class="inline-flex items-center gap-1 text-sm font-medium text-[#d4af37] hover:text-[#f5e3ab] transition-colors"
          >
            Gestionar
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Desktop View (Table) - Nexora Style -->
    <div class="hidden md:block rounded-[28px] border overflow-hidden" 
         :style="{ 
           backgroundColor: cardBg, 
           borderColor: cardBorder 
         }">
      <table class="min-w-full">
        <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <tr>
            <th class="py-4 pl-5 pr-3 text-left text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">Empresa</th>
            <th class="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">Schema</th>
            <th class="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">RUT</th>
            <th class="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">Estado</th>
            <th class="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">Plan</th>
            <th class="py-4 pl-3 pr-5 text-right text-xs font-medium uppercase tracking-wider" :style="{ color: mutedTextColor }">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y" :style="{ borderColor: cardBorder }">
          <tr v-if="isLoading">
            <td colspan="6" class="py-8 text-center text-sm" :style="{ color: mutedTextColor }">Cargando empresas...</td>
          </tr>
          <tr v-else-if="filteredList.length === 0">
            <td colspan="6" class="py-12 text-center text-sm" :style="{ color: mutedTextColor }">No se encontraron empresas.</td>
          </tr>
          <tr 
            v-for="company in filteredList" 
            :key="company.id" 
            class="transition-colors"
            @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
          >
            <td class="py-4 pl-5 pr-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
                  <Building2 class="h-4 w-4 text-white" />
                </div>
                <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.name }}</span>
              </div>
            </td>
            <td class="px-3 py-4 text-sm" :style="{ color: mutedTextColor }">{{ company.schema_name }}</td>
            <td class="px-3 py-4 text-sm" :style="{ color: mutedTextColor }">{{ company.rut }}</td>
            <td class="px-3 py-4">
              <span 
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium border"
                :class="company.is_active 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'"
              >
                {{ company.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-3 py-4 text-sm" :style="{ color: mutedTextColor }">{{ company.plan_type }}</td>
            <td class="py-4 pl-3 pr-5 text-right">
              <router-link 
                :to="`/admin/companies/${company.id}`" 
                class="text-sm font-medium text-[#d4af37] hover:text-[#f5e3ab] transition-colors"
              >
                Gestionar
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Create Company Modal - Outside container for proper overlay -->
  <CreateCompanyModal 
    :is-open="showCreateModal" 
    @close="showCreateModal = false"
    @created="fetchCompanies"
  />
</template>
