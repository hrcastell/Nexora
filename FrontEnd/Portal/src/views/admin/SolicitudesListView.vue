<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../utils/axios';
import { Mail, Phone, Calendar, Users, CheckCircle, XCircle, Clock, Inbox, Building2, ChevronDown, ChevronUp, FileText, Save } from 'lucide-vue-next';
import CreateCompanyModal from '../../components/admin/CreateCompanyModal.vue';

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
const expandedId = ref<number | null>(null);
const editingNotesId = ref<number | null>(null);
const notesBuffer = ref('');
const isSavingNotes = ref(false);

// Workflow: crear empresa desde solicitud
const showCreateModal = ref(false);
const createModalInitialData = ref<{ name: string; contact_email: string; contact_phone: string } | undefined>(undefined);
const convertingSolicitudId = ref<number | null>(null);

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

const toggleExpand = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const startEditingNotes = (req: Solicitud) => {
  editingNotesId.value = req.id;
  notesBuffer.value = req.admin_notes || '';
};

const cancelEditingNotes = () => {
  editingNotesId.value = null;
  notesBuffer.value = '';
};

const saveNotes = async (req: Solicitud) => {
  isSavingNotes.value = true;
  try {
    await api.put(`/solicitudes/${req.id}`, { admin_notes: notesBuffer.value });
    req.admin_notes = notesBuffer.value;
    editingNotesId.value = null;
  } catch (error) {
    console.error('Error saving notes:', error);
  } finally {
    isSavingNotes.value = false;
  }
};

const updateStatus = async (id: number, newStatus: string) => {
  try {
    await api.put(`/solicitudes/${id}`, { status: newStatus });
    const req = requests.value.find(r => r.id === id);
    if (req) req.status = newStatus as Solicitud['status'];
  } catch (error) {
    console.error('Error updating status:', error);
  }
};

const openCreateFromSolicitud = (req: Solicitud) => {
  convertingSolicitudId.value = req.id;
  createModalInitialData.value = {
    name: req.company_name,
    contact_email: req.email,
    contact_phone: req.phone || ''
  };
  showCreateModal.value = true;
};

const onCompanyCreated = async () => {
  showCreateModal.value = false;
  if (convertingSolicitudId.value) {
    await updateStatus(convertingSolicitudId.value, 'converted');
    convertingSolicitudId.value = null;
    createModalInitialData.value = undefined;
  }
};

const onModalClose = () => {
  showCreateModal.value = false;
  convertingSolicitudId.value = null;
  createModalInitialData.value = undefined;
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
</script>

<template>
  <div class="space-y-4">
    <!-- Header Card -->
    <div class="rounded-2xl border nxr-surface p-4 md:p-5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
            <Inbox class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-lg font-semibold nxr-text">Solicitudes de Contacto</h1>
            <p class="text-sm text-slate-400">Gestión de prospectos y leads</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span class="rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
            {{ requests.length }} solicitudes
          </span>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-3">
      <div v-if="isLoading" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-t-[#D4AF37] border-white/10 rounded-full" role="status"></div>
        <p class="mt-2 text-slate-400 text-sm">Cargando solicitudes...</p>
      </div>

      <div v-else-if="requests.length === 0" class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <Mail class="mx-auto h-12 w-12 text-slate-500" />
        <h3 class="mt-2 text-sm font-medium nxr-text">No hay solicitudes</h3>
        <p class="mt-1 text-xs text-slate-400">Aún no se han recibido consultas desde el sitio web.</p>
      </div>

      <div
        v-else
        v-for="request in requests"
        :key="request.id"
        class="rounded-2xl border border-white/10 bg-white/5 transition"
        :class="request.status === 'converted' ? 'opacity-60' : 'hover:border-white/20'"
      >
        <!-- Card Header (always visible) -->
        <div class="p-4 cursor-pointer" @click="toggleExpand(request.id)">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-400 shrink-0">
                <Users class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-medium nxr-text">{{ request.company_name }}</p>
                <p class="text-xs text-slate-400">{{ request.contact_name }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border" :class="getStatusColor(request.status)">
                {{ getStatusLabel(request.status) }}
              </span>
              <span class="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                <Calendar class="h-3 w-3" />
                {{ formatDate(request.created_at) }}
              </span>
              <component :is="expandedId === request.id ? ChevronUp : ChevronDown" class="h-4 w-4 text-slate-500" />
            </div>
          </div>

          <!-- Contact Info (always visible) -->
          <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <span class="flex items-center gap-1">
              <Mail class="h-3 w-3" />
              {{ request.email }}
            </span>
            <span v-if="request.phone" class="flex items-center gap-1">
              <Phone class="h-3 w-3" />
              {{ request.phone }}
            </span>
          </div>
        </div>

        <!-- Expanded Detail -->
        <div v-if="expandedId === request.id" class="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">

          <!-- Message -->
          <div class="rounded-xl bg-black/20 p-3 border border-white/5">
            <p class="text-xs text-slate-500 mb-1 uppercase tracking-wider">Mensaje</p>
            <p class="text-sm text-slate-300 italic">"{{ request.message }}"</p>
          </div>

          <!-- Admin Notes -->
          <div class="rounded-xl bg-black/20 p-3 border border-white/5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText class="h-3 w-3" />
                Notas del Admin
              </p>
              <button
                v-if="editingNotesId !== request.id && request.status !== 'converted'"
                @click.stop="startEditingNotes(request)"
                class="text-xs text-slate-400 hover:text-[var(--nexora-text-color)] transition-colors"
              >
                Editar
              </button>
            </div>
            <div v-if="editingNotesId === request.id">
              <textarea
                v-model="notesBuffer"
                @click.stop
                rows="3"
                placeholder="Agrega notas internas sobre esta solicitud..."
                class="w-full rounded-xl bg-white/5 border border-white/10 p-2.5 text-sm nxr-text placeholder-slate-500 resize-none focus:outline-none focus:border-white/20"
              ></textarea>
              <div class="flex gap-2 mt-2 justify-end">
                <button @click.stop="cancelEditingNotes" class="text-xs text-slate-400 hover:text-[var(--nexora-text-color)] px-3 py-1.5 rounded-xl border border-white/10 transition-colors">
                  Cancelar
                </button>
                <button
                  @click.stop="saveNotes(request)"
                  :disabled="isSavingNotes"
                  class="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-xl nxr-btn-primary transition-colors disabled:opacity-50"
                >
                  <Save class="h-3.5 w-3.5" />
                  {{ isSavingNotes ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </div>
            <p v-else class="text-sm text-slate-400">
              {{ request.admin_notes || 'Sin notas.' }}
            </p>
          </div>

          <!-- Actions -->
          <div class="pt-1 flex flex-wrap gap-2 justify-end">
            <!-- Workflow: crear empresa desde aprobada -->
            <button
              v-if="request.status === 'approved'"
              @click.stop="openCreateFromSolicitud(request)"
              class="flex items-center gap-1.5 rounded-xl border border-[#243b7a]/50 px-3 py-1.5 text-xs font-medium text-blue-200 bg-[#243b7a]/30 hover:bg-[#243b7a]/50 transition-colors"
            >
              <Building2 class="h-3.5 w-3.5" />
              Crear Empresa
            </button>

            <button
              v-if="request.status === 'new'"
              @click.stop="updateStatus(request.id, 'contacted')"
              class="flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 px-3 py-1.5 text-xs font-medium text-[#f5df9f] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors"
            >
              <Clock class="h-3.5 w-3.5" />
              Marcar Contactado
            </button>
            <button
              v-if="['new', 'contacted'].includes(request.status)"
              @click.stop="updateStatus(request.id, 'approved')"
              class="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle class="h-3.5 w-3.5" />
              Aprobar
            </button>
            <button
              v-if="['new', 'contacted'].includes(request.status)"
              @click.stop="updateStatus(request.id, 'rejected')"
              class="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              <XCircle class="h-3.5 w-3.5" />
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Crear empresa desde solicitud -->
  <CreateCompanyModal
    :is-open="showCreateModal"
    :initial-data="createModalInitialData"
    @close="onModalClose"
    @created="onCompanyCreated"
  />
</template>
