<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">Dashboard Base</h1>
    
    <div class="mt-4">
      <div class="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div class="text-center">
          <p class="text-gray-500">Bienvenido al núcleo de Nexora</p>
          <p class="text-sm text-gray-400 mt-2">Schema activo: {{ authStore.currentCompany?.schema_name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
