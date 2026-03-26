<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { Building2, ArrowRight } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
  }
});

const handleSelectCompany = async (companyId: number) => {
  try {
    await authStore.selectCompany(companyId);
    router.push('/dashboard');
  } catch (error) {
    // Error handling is done in the store or via global toast (todo)
    alert('Error al seleccionar la compañía');
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Selecciona una Compañía
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Bienvenido, {{ authStore.user?.full_name }}
        </p>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" class="divide-y divide-gray-200">
          <li v-for="company in authStore.companies" :key="company.id">
            <button 
              @click="handleSelectCompany(company.id)"
              class="block w-full hover:bg-gray-50 transition duration-150 ease-in-out focus:outline-none"
            >
              <div class="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 class="h-6 w-6 text-blue-600" />
                  </div>
                  <div class="ml-4 text-left">
                    <p class="text-sm font-medium text-blue-600 truncate">
                      {{ company.name }}
                    </p>
                    <p class="flex items-center text-sm text-gray-500">
                      Schema: {{ company.schema_name }}
                    </p>
                  </div>
                </div>
                <div class="ml-5 flex-shrink-0">
                  <ArrowRight class="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </button>
          </li>
          
          <li v-if="authStore.companies.length === 0" class="px-4 py-8 text-center text-gray-500">
            No tienes compañías asignadas via API.
          </li>
        </ul>
      </div>
      
      <div class="mt-6 text-center">
        <button 
          @click="authStore.logout(); router.push('/login')"
          class="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
</template>
