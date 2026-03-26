<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../utils/axios';
import { Plus, Search } from 'lucide-vue-next';
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
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">Gestión de Empresas</h1>
        <p class="mt-2 text-sm text-gray-700">
          Listado de todas las empresas registradas en el sistema (Tenants).
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button
          type="button"
          @click="showCreateModal = true"
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
          <Plus class="mr-2 h-4 w-4" />
          Nueva Empresa
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mt-6 max-w-lg">
      <div class="relative rounded-md shadow-sm">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          class="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border"
          placeholder="Buscar por nombre, schema o RUT"
        />
      </div>
    </div>

    <!-- Mobile View (Cards) -->
    <div class="mt-6 flex flex-col md:hidden space-y-4">
      <div v-if="isLoading" class="text-center py-4">Cargando...</div>
      
      <div v-else-if="filteredList.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
        <p class="text-gray-500">No se encontraron empresas.</p>
      </div>
      
      <div v-else v-for="company in filteredList" :key="company.id" class="bg-white shadow rounded-lg p-4">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ company.name }}</h3>
            <p class="text-sm text-gray-500">{{ company.schema_name }}</p>
          </div>
          <span 
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
          >
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
        <div class="mt-4 space-y-2 text-sm text-gray-600">
          <p><strong>RUT:</strong> {{ company.rut }}</p>
          <p><strong>Plan:</strong> {{ company.plan_type }}</p>
          <p><strong>Email:</strong> {{ company.contact_email }}</p>
        </div>
        <div class="mt-4 flex justify-end">
             <router-link :to="`/admin/companies/${company.id}`" class="text-blue-600 hover:text-blue-900 text-sm font-medium">
               Gestionar
             </router-link>
        </div>
      </div>
    </div>

    <!-- Desktop View (Table) -->
    <div class="mt-8 hidden md:flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Empresa</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Schema</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">RUT</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Plan</th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-if="isLoading">
                   <td colspan="6" class="text-center py-4 text-sm text-gray-500">Cargando empresas...</td>
                </tr>
                <tr v-else-if="filteredList.length === 0">
                   <td colspan="6" class="text-center py-8 text-sm text-gray-500">No se encontraron empresas.</td>
                </tr>
                <tr v-for="company in filteredList" :key="company.id" v-else class="hover:bg-gray-50">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{{ company.name }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ company.schema_name }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ company.rut }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span 
                      class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ company.is_active ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ company.plan_type }}</td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <router-link :to="`/admin/companies/${company.id}`" class="text-blue-600 hover:text-blue-900">
                      Gestionar
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Company Modal -->
    <CreateCompanyModal 
      :is-open="showCreateModal" 
      @close="showCreateModal = false"
      @created="fetchCompanies"
    />
  </div>
</template>
