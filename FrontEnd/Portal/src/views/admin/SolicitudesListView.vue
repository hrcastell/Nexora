<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../utils/axios';
import { Mail, Phone, Calendar, Users } from 'lucide-vue-next';

interface Solicitud {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'contacted' | 'approved' | 'rejected' | 'converted';
  admin_notes: string;
  created_at: string;
}

const requests = ref<Solicitud[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  await fetchRequests();
});

const fetchRequests = async () => {
  try {
    isLoading.value = true;
    const response = await api.get('/solicitudes');
    requests.value = response.data;
  } catch (error) {
    console.error('Error fetching solicitudes:', error);
  } finally {
    isLoading.value = false;
  }
};

const updateStatus = async (id: number, newStatus: string) => {
  try {
    await api.put(`/solicitudes/${id}`, { status: newStatus });
    // Refresh local state
    const req = requests.value.find(r => r.id === id);
    if (req) req.status = newStatus as any;
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Error al actualizar el estado');
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'contacted': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'converted': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'new': return 'Nueva';
    case 'contacted': return 'Contactada';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    case 'converted': return 'Cliente';
    default: return status;
  }
};
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">Solicitudes de Contacto</h1>
        <p class="mt-2 text-sm text-gray-700">
          Gestión de prospectos y leads provenientes del sitio web.
        </p>
      </div>
    </div>

    <!-- List -->
    <div class="mt-8 flex flex-col space-y-4">
      <div v-if="isLoading" class="text-center py-10">
        <div class="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status"></div>
        <p class="mt-2 text-gray-500">Cargando solicitudes...</p>
      </div>

      <div v-else-if="requests.length === 0" class="text-center py-10 bg-white rounded-lg shadow">
        <Mail class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay solicitudes</h3>
        <p class="mt-1 text-sm text-gray-500">Aún no se han recibido consultas desde el sitio web.</p>
      </div>

      <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" class="divide-y divide-gray-200">
          <li v-for="request in requests" :key="request.id">
            <div class="px-4 py-4 sm:px-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center truncate">
                   <p class="text-sm font-medium text-blue-600 truncate">{{ request.company_name }}</p>
                   <span class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusColor(request.status)">
                     {{ getStatusLabel(request.status) }}
                   </span>
                </div>
                <div class="ml-2 flex-shrink-0 flex">
                  <p class="px-2 inline-flex text-xs leading-5 font-semibold text-gray-500">
                    <Calendar class="mr-1 h-4 w-4" />
                    {{ formatDate(request.created_at) }}
                  </p>
                </div>
              </div>
              <div class="mt-2 sm:flex sm:justify-between">
                <div class="sm:flex">
                  <p class="flex items-center text-sm text-gray-500">
                    <Users class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    {{ request.contact_name }}
                  </p>
                  <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                    <Mail class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    {{ request.email }}
                  </p>
                  <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                    <Phone class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    {{ request.phone || 'Sin teléfono' }}
                  </p>
                </div>
              </div>
              
              <div class="mt-2">
                 <p class="text-sm text-gray-600 italic">"{{ request.message }}"</p>
              </div>

              <!-- Action Buttons -->
              <div class="mt-4 flex space-x-3 justify-end border-t pt-3">
                 <button 
                   v-if="request.status === 'new'"
                   @click="updateStatus(request.id, 'contacted')"
                   class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none"
                 >
                   Marcar Contactado
                 </button>
                 <button 
                   v-if="['new', 'contacted'].includes(request.status)"
                   @click="updateStatus(request.id, 'approved')"
                   class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none"
                 >
                   Aprobar
                 </button>
                 <button 
                   v-if="['new', 'contacted'].includes(request.status)"
                   @click="updateStatus(request.id, 'rejected')"
                   class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                 >
                   Rechazar
                 </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
