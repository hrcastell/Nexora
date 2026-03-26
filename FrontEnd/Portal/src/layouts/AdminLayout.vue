<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Menu, 
  LogOut
} from 'lucide-vue-next';

const authStore = useAuthStore();
const route = useRoute();
const isMobileMenuOpen = ref(false);

const navigation = computed(() => {
  const baseNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  if (authStore.user?.is_super_admin) {
    baseNav.push({ name: 'Empresas', href: '/admin/companies', icon: Building2 });
    baseNav.push({ name: 'Solicitudes', href: '/admin/requests', icon: Users });
  }

  // Add more modules here based on permissions later
  return baseNav;
});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const logout = () => {
  authStore.logout();
  window.location.href = '/login';
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Mobile sidebar backdrop -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- Sidebar -->
    <div 
      :class="[
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0'
      ]"
    >
      <div class="flex items-center justify-center h-16 bg-blue-600">
        <span class="text-white text-xl font-bold">Nexora</span>
      </div>

      <nav class="mt-5 px-2 space-y-1">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors"
          :class="[
            route.path === item.href
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          ]"
          @click="isMobileMenuOpen = false"
        >
          <component 
            :is="item.icon" 
            class="mr-4 h-6 w-6"
            :class="[
              route.path === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
            ]" 
          />
          {{ item.name }}
        </router-link>
      </nav>

      <div class="absolute bottom-0 w-full p-4 border-t border-gray-200">
         <div class="flex items-center">
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {{ authStore.user?.full_name }}
              </p>
              <p class="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                {{ authStore.currentCompany?.name }}
              </p>
            </div>
          </div>
          <button 
            @click="logout"
            class="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
          >
            <LogOut class="mr-2 h-4 w-4" />
            Salir
          </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col md:pl-64 transition-all duration-300">
      <!-- Header -->
      <header class="flex items-center justify-between h-16 bg-white shadow px-4 sm:px-6 lg:px-8 md:hidden">
        <button 
          @click="toggleMobileMenu"
          class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <Menu class="h-6 w-6" />
        </button>
        <span class="text-lg font-semibold text-gray-900">Nexora</span>
        <div class="w-6"></div> <!-- Spacer for centering if needed -->
      </header>

      <!-- Page Content -->
      <main class="flex-1 py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <router-view></router-view>
        </div>
      </main>
    </div>
  </div>
</template>
