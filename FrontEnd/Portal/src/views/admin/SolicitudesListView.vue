<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../utils/axios';
import { Mail, Phone, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-vue-next';

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
    case 'new': return 'bg-blue-500/10 text-blue-200 border-blue-500/20';
    case 'contacted': return 'bg-[#D4AF37]/10 text-[#f5df9f] border-[#D4AF37]/20';
    case 'approved': return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';
    case 'rejected': return 'bg-rose-500/10 text-rose-200 border-rose-500/20';
    case 'converted': return 'bg-purple-500/10 text-purple-200 border-purple-500/20';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
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

// Icons
const InboxIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>` };
</script>

<template>
  <div class="space-y-4">
    <!-- Header Card - Sidebar menu style -->
    <div class="rounded-2xl border nxr-surface p-4 md:p-5">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <InboxIcon />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-white">Solicitudes de Contacto</h1>
          <p class="text-sm text-slate-400">Gestión de prospectos y leads</p>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-3">
      <div v-if="isLoading" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div class="animate-spin inline-block w-8 h-8 border-4 rounded-full text-[#D4AF37]" role="status"></div>
        <p class="mt-2 text-slate-400 text-sm">Cargando solicitudes...</p>
      </div>

      <div v-else-if="requests.length === 0" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <Mail class="mx-auto h-12 w-12 text-slate-500" />
        <h3 class="mt-2 text-sm font-medium text-white">No hay solicitudes</h3>
        <p class="mt-1 text-xs text-slate-400">Aún no se han recibido consultas desde el sitio web.</p>
      </div>

      <div 
        v-else 
        v-for="request in requests" 
        :key="request.id" 
        class="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/[0.07]"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
              <Users class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-medium text-white">{{ request.company_name }}</p>
              <p class="text-xs text-slate-400">{{ request.contact_name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border" :class="getStatusColor(request.status)">
              {{ getStatusLabel(request.status) }}
            </span>
            <span class="text-xs text-slate-500 flex items-center gap-1">
              <Calendar class="h-3 w-3" />
              {{ formatDate(request.created_at) }}
            </span>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          <span class="flex items-center gap-1">
            <Mail class="h-3 w-3" />
            {{ request.email }}
          </span>
          <span v-if="request.phone" class="flex items-center gap-1">
            <Phone class="h-3 w-3" />
            {{ request.phone }}
          </span>
        </div>

        <!-- Message -->
        <div class="mt-3 rounded-xl bg-black/20 p-3 border border-white/5">
          <p class="text-sm text-slate-300 italic">"{{ request.message }}"</p>
        </div>

        <!-- Actions -->
        <div class="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
          <button 
            v-if="request.status === 'new'"
            @click="updateStatus(request.id, 'contacted')"
            class="flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 px-3 py-1.5 text-xs font-medium text-[#f5df9f] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors"
          >
            <Clock class="h-3.5 w-3.5" />
            Contactado
          </button>
          <button 
            v-if="['new', 'contacted'].includes(request.status)"
            @click="updateStatus(request.id, 'approved')"
            class="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle class="h-3.5 w-3.5" />
            Aprobar
          </button>
          <button 
            v-if="['new', 'contacted'].includes(request.status)"
            @click="updateStatus(request.id, 'rejected')"
            class="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
          >
            <XCircle class="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
