<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../utils/axios';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-vue-next';

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

    // Set default amount from last subscription or plan default if possible
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
  
  const subId = subscriptions.value[0].id; // Assuming single active subscription logic for now or picking the first one
  
  isSubmittingPayment.value = true;
  try {
    await api.post(`/subscriptions/${subId}/payment`, {
      amount: paymentForm.value.amount,
      payment_date: paymentForm.value.payment_date,
      next_due_date: paymentForm.value.next_due_date,
      notes: paymentForm.value.notes
    });
    
    showPaymentModal.value = false;
    await fetchData(); // Refresh data
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
    case 'active': return 'bg-green-100 text-green-800';
    case 'past_due': return 'bg-red-100 text-red-800';
    case 'canceled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-yellow-100 text-yellow-800';
  }
};
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-blue-600" />
  </div>

  <div v-else-if="company">
    <!-- Header -->
    <div class="md:flex md:items-center md:justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center">
          <button @click="router.back()" class="mr-4 p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft class="h-5 w-5 text-gray-500" />
          </button>
          <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {{ company.name }}
          </h2>
          <span 
            class="ml-4 px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
            :class="company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
          >
            {{ company.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
      </div>
      <div class="mt-4 flex md:mt-0 md:ml-4">
        <button
          type="button"
          class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          Editar Datos
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mt-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          @click="activeTab = 'details'"
          :class="[activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']"
        >
          Detalles
        </button>
        <button
          @click="activeTab = 'payments'"
          :class="[activeTab === 'payments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']"
        >
          Pagos y Suscripción
        </button>
      </nav>
    </div>

    <!-- Details Tab -->
    <div v-if="activeTab === 'details'" class="mt-6">
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Información de la Empresa</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">Datos generales y configuración de tenant.</p>
        </div>
        <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl class="sm:divide-y sm:divide-gray-200">
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Schema Name (DB)</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.schema_name }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">País</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.country }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">RUT</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.rut }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Email de Contacto</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.contact_email }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Teléfono</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.contact_phone || '-' }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Plan Actual</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 uppercase">{{ company.plan_type }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Dirección</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ company.address || '-' }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- Payments Tab -->
    <div v-if="activeTab === 'payments'" class="mt-6">
      <div class="mb-4 flex justify-end">
        <button
          @click="showPaymentModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          <CreditCard class="mr-2 h-4 w-4" />
          Registrar Pago
        </button>
      </div>

      <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Estado de Suscripción</h3>
        </div>
        <div v-if="subscriptions.length === 0" class="p-6 text-center text-gray-500">
          No hay información de suscripción configurada.
        </div>
        <div v-else class="border-t border-gray-200">
           <table class="min-w-full divide-y divide-gray-200">
             <thead class="bg-gray-50">
               <tr>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frecuencia</th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próximo Pago</th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
               </tr>
             </thead>
             <tbody class="bg-white divide-y divide-gray-200">
               <tr v-for="sub in subscriptions" :key="sub.id">
                 <td class="px-6 py-4 whitespace-nowrap">
                   <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusColor(sub.status)">
                     {{ sub.status }}
                   </span>
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                   ${{ sub.amount }}
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {{ sub.payment_frequency }}
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {{ formatDate(sub.next_payment_date) }}
                 </td>
                 <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                   {{ sub.notes }}
                 </td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="text-center py-12">
    <p class="text-gray-500">Empresa no encontrada.</p>
  </div>

  <!-- Payment Modal -->
  <div v-if="showPaymentModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showPaymentModal = false"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div>
          <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Registrar Pago Manual</h3>
          <div class="mt-2">
            <form @submit.prevent="handleRegisterPayment" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Monto Pagado</label>
                <input type="number" v-model="paymentForm.amount" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Fecha de Pago</label>
                <input type="date" v-model="paymentForm.payment_date" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Próximo Vencimiento</label>
                <input type="date" v-model="paymentForm.next_due_date" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2" />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Notas / Comprobante</label>
                <textarea v-model="paymentForm.notes" rows="2" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"></textarea>
              </div>

              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button type="submit" :disabled="isSubmittingPayment" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:col-start-2 sm:text-sm">
                  {{ isSubmittingPayment ? 'Guardando...' : 'Confirmar Pago' }}
                </button>
                <button type="button" @click="showPaymentModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
