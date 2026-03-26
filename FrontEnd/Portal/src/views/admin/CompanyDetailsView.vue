<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../utils/axios';
import { ArrowLeft, CreditCard, Loader2, FileText, DollarSign } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const companyId = route.params.id;

interface Company {
  id: number;
  name: string;
  schema_name: string;
  country: string;
  rut: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  is_active: boolean;
  plan_type: string;
  created_at: string;
}

interface Subscription {
  id: number;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  payment_frequency: string;
  next_payment_date: string;
  last_payment_date: string;
  notes: string;
}

const company = ref<Company | null>(null);
const subscriptions = ref<Subscription[]>([]);
const isLoading = ref(true);
const activeTab = ref('details'); // 'details' | 'payments'

// Payment Form
const showPaymentModal = ref(false);
const paymentForm = ref({
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  next_due_date: '',
  notes: ''
});
const isSubmittingPayment = ref(false);

onMounted(async () => {
  await fetchData();
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    const [companyRes, subsRes] = await Promise.all([
      api.get(`/companies/${companyId}`),
      api.get(`/subscriptions/company/${companyId}`)
    ]);
    
    company.value = companyRes.data;
    subscriptions.value = subsRes.data;

    if (subscriptions.value.length > 0) {
      paymentForm.value.amount = Number(subscriptions.value[0].amount);
    }
  } catch (error) {
    console.error('Error fetching details:', error);
    alert('Error al cargar datos de la empresa');
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CL');
};

const handleRegisterPayment = async () => {
  if (!subscriptions.value.length) {
    alert('No hay suscripción activa para registrar pagos. Cree una primero.');
    return;
  }
  
  const subId = subscriptions.value[0].id;
  
  isSubmittingPayment.value = true;
  try {
    await api.post(`/subscriptions/${subId}/payment`, {
      amount: paymentForm.value.amount,
      payment_date: paymentForm.value.payment_date,
      next_due_date: paymentForm.value.next_due_date,
      notes: paymentForm.value.notes
    });
    
    showPaymentModal.value = false;
    await fetchData();
    alert('Pago registrado correctamente');
  } catch (error) {
    console.error('Error registering payment:', error);
    alert('Error al registrar el pago');
  } finally {
    isSubmittingPayment.value = false;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';
    case 'past_due': return 'bg-rose-500/10 text-rose-200 border-rose-500/20';
    case 'canceled': return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    default: return 'bg-[#D4AF37]/10 text-[#f5df9f] border-[#D4AF37]/20';
  }
};

// Icons
const BuildingIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-4h6v4"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/></svg>` };
const ReceiptIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M9 14l2 2 4-4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5z"/></svg>` };
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-[#D4AF37]" />
  </div>

  <div v-else-if="company" class="space-y-4">
    <!-- Header Card - Sidebar menu style -->
    <div class="rounded-2xl border nxr-surface p-4 md:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
            <BuildingIcon />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-white">{{ company.name }}</h1>
            <p class="text-sm text-slate-400">{{ company.schema_name }}</p>
          </div>
          <span 
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
            :class="company.is_active ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-rose-500/10 text-rose-200 border-rose-500/20'"
          >
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
        
        <button
          type="button"
          class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10"
        >
          Editar Datos
        </button>
      </div>
    </div>

    <!-- Tabs - Menu style -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-2">
      <div class="flex gap-2">
        <button
          @click="activeTab = 'details'"
          class="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
          :class="activeTab === 'details' ? 'nxr-nav-active' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'"
        >
          <FileText class="h-4 w-4" />
          Detalles
        </button>
        <button
          @click="activeTab = 'payments'"
          class="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
          :class="activeTab === 'payments' ? 'nxr-nav-active' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'"
        >
          <DollarSign class="h-4 w-4" />
          Pagos y Suscripción
        </button>
      </div>
    </div>

    <!-- Details Tab -->
    <div v-if="activeTab === 'details'" class="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div class="border-b border-white/10 bg-white/[0.03] p-4">
        <h3 class="text-sm font-medium text-white">Información de la Empresa</h3>
        <p class="text-xs text-slate-400 mt-1">Datos generales y configuración de tenant</p>
      </div>
      <div class="divide-y divide-white/10">
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">Schema Name (DB)</span>
          <span class="text-sm font-medium text-white">{{ company.schema_name }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">País</span>
          <span class="text-sm font-medium text-white">{{ company.country }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">RUT</span>
          <span class="text-sm font-medium text-white">{{ company.rut }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">Email de Contacto</span>
          <span class="text-sm font-medium text-white">{{ company.contact_email }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">Teléfono</span>
          <span class="text-sm font-medium text-white">{{ company.contact_phone || '-' }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">Plan Actual</span>
          <span class="text-sm font-medium text-white uppercase tracking-wider">{{ company.plan_type }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-slate-400">Dirección</span>
          <span class="text-sm font-medium text-white">{{ company.address || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Payments Tab -->
    <div v-if="activeTab === 'payments'" class="space-y-4">
      <!-- Action Button -->
      <div class="flex justify-end">
        <button
          @click="showPaymentModal = true"
          class="flex items-center gap-2 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <CreditCard class="h-4 w-4" />
          Registrar Pago
        </button>
      </div>

      <!-- Subscription Table -->
      <div class="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div class="border-b border-white/10 bg-white/[0.03] p-4">
          <h3 class="text-sm font-medium text-white">Estado de Suscripción</h3>
        </div>
        <div v-if="subscriptions.length === 0" class="p-6 text-center text-slate-400 text-sm">
          No hay información de suscripción configurada.
        </div>
        <table v-else class="min-w-full">
          <thead class="border-b border-white/10 bg-white/[0.03]">
            <tr>
              <th class="py-3 pl-4 pr-3 text-left text-xs font-medium text-slate-400 uppercase">Estado</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Monto</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Frecuencia</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Próximo Pago</th>
              <th class="py-3 pl-3 pr-4 text-left text-xs font-medium text-slate-400 uppercase">Notas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="sub in subscriptions" :key="sub.id" class="hover:bg-white/[0.03] transition-colors">
              <td class="py-3 pl-4 pr-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border" :class="getStatusColor(sub.status)">
                  {{ sub.status }}
                </span>
              </td>
              <td class="px-3 py-3 text-sm text-white">${{ sub.amount }}</td>
              <td class="px-3 py-3 text-sm text-slate-400">{{ sub.payment_frequency }}</td>
              <td class="px-3 py-3 text-sm text-slate-400">{{ formatDate(sub.next_payment_date) }}</td>
              <td class="py-3 pl-3 pr-4 text-sm text-slate-400 truncate max-w-xs">{{ sub.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div v-else class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
    <p class="text-slate-400">Empresa no encontrada.</p>
  </div>

  <!-- Payment Modal -->
  <div v-if="showPaymentModal" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" @click="showPaymentModal = false"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
      
      <div class="inline-block align-bottom bg-[#0b1326] border border-white/10 rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl shadow-black/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
            <ReceiptIcon />
          </div>
          <h3 class="text-lg font-medium text-white">Registrar Pago Manual</h3>
        </div>
        
        <form @submit.prevent="handleRegisterPayment" class="space-y-4">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label class="block text-xs font-medium text-slate-400 uppercase mb-2">Monto Pagado</label>
            <input type="number" v-model="paymentForm.amount" required class="block w-full rounded-xl border-0 bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-[#D4AF37]/50 py-2.5 text-sm" />
          </div>
          
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label class="block text-xs font-medium text-slate-400 uppercase mb-2">Fecha de Pago</label>
            <input type="date" v-model="paymentForm.payment_date" required class="block w-full rounded-xl border-0 bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-[#D4AF37]/50 py-2.5 text-sm" />
          </div>
          
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label class="block text-xs font-medium text-slate-400 uppercase mb-2">Próximo Vencimiento</label>
            <input type="date" v-model="paymentForm.next_due_date" required class="block w-full rounded-xl border-0 bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-[#D4AF37]/50 py-2.5 text-sm" />
          </div>
          
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label class="block text-xs font-medium text-slate-400 uppercase mb-2">Notas / Comprobante</label>
            <textarea v-model="paymentForm.notes" rows="2" class="block w-full rounded-xl border-0 bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-[#D4AF37]/50 py-2.5 text-sm"></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" @click="showPaymentModal = false" class="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10">
              Cancelar
            </button>
            <button type="submit" :disabled="isSubmittingPayment" class="flex-1 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition">
              {{ isSubmittingPayment ? 'Guardando...' : 'Confirmar Pago' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
