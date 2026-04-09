<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../utils/axios';
import { ArrowLeft, Loader2, FileText, DollarSign, Building2, Receipt, Users, Settings, UserPlus, Trash2, Shield, ShieldCheck, Palette, Check, RotateCcw, Upload } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';
import EditCompanyModal from '../../components/admin/EditCompanyModal.vue';
import AppToast, { type ToastItem, type ToastType } from '../../components/AppToast.vue';
import { useRoute, useRouter } from 'vue-router';

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

interface Invoice {
  id: number;
  company_id: number;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  due_date: string;
  issue_date: string;
  notes: string;
  created_at: string;
}

interface CommercialPayment {
  id: number;
  company_id: number;
  invoice_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
  registered_by_name: string;
  created_at: string;
}

interface CompanyUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_company_admin: boolean;
  company_user_id: number;
  created_at: string;
  role_id?: number;
  role_name?: string;
}

interface TenantRole {
  id: number;
  name: string;
  description: string;
  is_system_role: boolean;
}

interface CompanyConfig {
  id: number;
  company_name: string;
  country: string;
  rut: string;
  address: string;
  email: string;
  phone: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
}

const company = ref<Company | null>(null);
const invoices = ref<Invoice[]>([]);
const commercialPayments = ref<CommercialPayment[]>([]);
const companyUsers = ref<CompanyUser[]>([]);
const companyConfig = ref<CompanyConfig | null>(null);
const isLoading = ref(true);
const activeTab = ref('details'); // 'details' | 'payments' | 'users' | 'config'

// Toast state
const activeToast = ref<ToastItem | null>(null);
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = { id: Date.now(), title, message, type };
};

// Invite user state
const showInviteModal = ref(false);
const isInviting = ref(false);
const inviteForm = ref({ full_name: '', email: '', password: '', is_company_admin: false, role_id: null as number | null });
const inviteError = ref('');

// Tenant roles
const availableRoles = ref<TenantRole[]>([]);

// Config state
const configForm = ref<Partial<CompanyConfig>>({});
const isSavingConfig = ref(false);
const configSaved = ref(false);

// Theme-aware styling
const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const cardBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.05)');
const cardBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const tableHeaderBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)');
const tableHoverBg = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)');
const modalBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 19, 38, 0.98)');
const modalBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const inputBg = computed(() => isLightMode.value ? 'rgba(255, 255, 255, 0.90)' : 'rgba(255, 255, 255, 0.05)');
const inputBorder = computed(() => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');

// Edit Company Modal
const showEditModal = ref(false);

// Logo upload handler
const MAX_LOGO_SIZE = 3 * 1024 * 1024; // 3MB

const handleLogoUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    triggerToast('Formato no válido', 'Solo se permiten imágenes JPG, PNG o WebP.', 'error');
    return;
  }
  if (file.size > MAX_LOGO_SIZE) {
    triggerToast('Archivo muy grande', 'El logo no puede superar 3 MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    configForm.value.logo_url = ev.target?.result as string;
  };
  reader.readAsDataURL(file);
};

// Helper functions for template
const getButtonBg = () => isLightMode.value ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
const getButtonHoverBg = () => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
const getButtonBorder = () => isLightMode.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)';
const getButtonHoverBorder = () => isLightMode.value ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
const getTabsBg = () => isLightMode.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.05)';

onMounted(async () => {
  await fetchData();
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    const [companyRes, invoicesRes, cPaymentsRes, usersRes, configRes, rolesRes] = await Promise.allSettled([
      api.get(`/companies/${companyId}`),
      api.get(`/companies/${companyId}/invoices`),
      api.get(`/companies/${companyId}/payments`),
      api.get(`/companies/${companyId}/users`),
      api.get(`/companies/${companyId}/config`),
      api.get(`/companies/${companyId}/roles`)
    ]);

    if (companyRes.status === 'fulfilled')   company.value            = companyRes.value.data;
    if (invoicesRes.status === 'fulfilled')  invoices.value           = invoicesRes.value.data;
    if (cPaymentsRes.status === 'fulfilled') commercialPayments.value = cPaymentsRes.value.data;
    if (usersRes.status === 'fulfilled')     companyUsers.value       = usersRes.value.data;
    if (configRes.status === 'fulfilled')    companyConfig.value      = configRes.value.data;
    if (rolesRes.status === 'fulfilled')     availableRoles.value     = rolesRes.value.data || [];

    const configData = configRes.status === 'fulfilled' ? configRes.value.data : null;
    if (configData) {
      configForm.value = { ...configData };
    } else if (company.value) {
      configForm.value = {
        company_name: company.value.name,
        country: company.value.country,
        rut: company.value.rut,
        email: company.value.contact_email,
        phone: company.value.contact_phone,
        address: company.value.address,
        primary_color: '#D4AF37',
        secondary_color: '#1a2e5a',
        font_family: 'Inter'
      };
    }

  } catch (error) {
    console.error('Error fetching details:', error);
    triggerToast('Error', 'Error al cargar datos de la empresa', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleInviteUser = async () => {
  inviteError.value = '';
  isInviting.value = true;
  try {
    await api.post(`/companies/${companyId}/users`, inviteForm.value);
    showInviteModal.value = false;
    inviteForm.value = { full_name: '', email: '', password: '', is_company_admin: false, role_id: null };
    const usersRes = await api.get(`/companies/${companyId}/users`);
    companyUsers.value = usersRes.data;
  } catch (error: any) {
    inviteError.value = error.response?.data?.error || 'Error al invitar usuario';
  } finally {
    isInviting.value = false;
  }
};

const changeUserRole = async (user: CompanyUser, roleId: number) => {
  try {
    await api.put(`/companies/${companyId}/users/${user.id}`, { role_id: roleId });
    user.role_id = roleId;
    user.role_name = availableRoles.value.find(r => r.id === roleId)?.name;
  } catch (error) {
    console.error('Error changing role:', error);
  }
};

const getRoleBadgeClass = (roleName?: string) => {
  switch (roleName) {
    case 'super_admin': return 'bg-purple-500/10 text-purple-200 border-purple-500/20';
    case 'admin':       return 'bg-[#D4AF37]/10 text-[#f5df9f] border-[#D4AF37]/20';
    case 'user':        return 'bg-blue-500/10 text-blue-200 border-blue-500/20';
    case 'viewer':      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    default:            return 'bg-white/5 text-slate-400 border-white/10';
  }
};

const toggleUserAdmin = async (user: CompanyUser) => {
  try {
    await api.put(`/companies/${companyId}/users/${user.id}`, {
      is_company_admin: !user.is_company_admin
    });
    user.is_company_admin = !user.is_company_admin;
  } catch (error) {
    console.error('Error updating user:', error);
  }
};

const toggleUserActive = async (user: CompanyUser) => {
  try {
    await api.put(`/companies/${companyId}/users/${user.id}`, {
      is_active: !user.is_active
    });
    user.is_active = !user.is_active;
  } catch (error) {
    console.error('Error updating user active status:', error);
  }
};

const removeUser = async (user: CompanyUser) => {
  if (!confirm(`¿Eliminar a ${user.full_name} de esta empresa?`)) return;
  try {
    await api.delete(`/companies/${companyId}/users/${user.id}`);
    companyUsers.value = companyUsers.value.filter(u => u.id !== user.id);
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

const saveConfig = async () => {
  isSavingConfig.value = true;
  configSaved.value = false;
  try {
    const res = await api.put(`/companies/${companyId}/config`, configForm.value);
    companyConfig.value = res.data;
    configSaved.value = true;
    triggerToast('Configuración guardada', 'Los cambios de branding se aplicaron correctamente.', 'success');
    setTimeout(() => { configSaved.value = false; }, 3000);
  } catch (error) {
    console.error('Error saving config:', error);
    triggerToast('Error', 'No se pudo guardar la configuración.', 'error');
  } finally {
    isSavingConfig.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CL');
};

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'pagado':  return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';
    case 'emitido': return 'bg-blue-500/10 text-blue-200 border-blue-500/20';
    case 'vencido': return 'bg-rose-500/10 text-rose-200 border-rose-500/20';
    case 'anulado': return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    default:        return 'bg-[#D4AF37]/10 text-[#f5df9f] border-[#D4AF37]/20';
  }
};

const handleEditCompany = () => {
  showEditModal.value = true;
};

</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-[#D4AF37]" />
  </div>

  <div v-else-if="company" class="space-y-4 h-full flex flex-col">
    <!-- Header Card - Sidebar menu style -->
    <div class="rounded-2xl border p-4 md:p-5" 
         :style="{ 
           backgroundColor: cardBg, 
           borderColor: cardBorder 
         }">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="flex h-10 w-10 items-center justify-center rounded-2xl transition-colors" 
                  :style="{ 
                    backgroundColor: getButtonBg(), 
                    color: mutedTextColor 
                  }"
                  @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = getButtonHoverBg()"
                  @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = getButtonBg()">
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
            <Building2 class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-lg font-semibold" :style="{ color: headerTextColor }">{{ company.name }}</h1>
            <p class="text-sm" :style="{ color: mutedTextColor }">{{ company.schema_name }}</p>
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
          class="flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition"
          :style="{ 
            backgroundColor: getButtonBg(), 
            borderColor: getButtonBorder(), 
            color: mutedTextColor 
          }"
          @mouseover="(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = getButtonHoverBg(); (e.currentTarget as HTMLElement).style.borderColor = getButtonHoverBorder(); }"
          @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = getButtonBg(); (e.currentTarget as HTMLElement).style.borderColor = getButtonBorder(); }"
          @click="handleEditCompany"
        >
          Editar Datos
        </button>
      </div>
    </div>

    <!-- Tabs - Menu style -->
    <div class="rounded-2xl border p-1.5 sm:p-2 overflow-x-auto" 
         :style="{ 
           backgroundColor: getTabsBg(), 
           borderColor: cardBorder 
         }">
      <div class="flex gap-1 sm:gap-2 whitespace-nowrap min-w-max">
        <button
          @click="activeTab = 'details'"
          class="flex items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition"
          :class="activeTab === 'details' ? 'nxr-nav-active' : 'border-transparent'"
          :style="{ color: activeTab === 'details' ? '' : mutedTextColor }"
        >
          <FileText class="h-4 w-4" />
          Detalles
        </button>
        <button
          @click="activeTab = 'payments'"
          class="flex items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition"
          :class="activeTab === 'payments' ? 'nxr-nav-active' : 'border-transparent'"
          :style="{ color: activeTab === 'payments' ? '' : mutedTextColor }"
        >
          <DollarSign class="h-4 w-4" />
          Pagos
        </button>
        <button
          @click="activeTab = 'users'"
          class="flex items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition"
          :class="activeTab === 'users' ? 'nxr-nav-active' : 'border-transparent'"
          :style="{ color: activeTab === 'users' ? '' : mutedTextColor }"
        >
          <Users class="h-4 w-4" />
          Usuarios
          <span class="rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{{ companyUsers.length }}</span>
        </button>
        <button
          @click="activeTab = 'config'"
          class="flex items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition"
          :class="activeTab === 'config' ? 'nxr-nav-active' : 'border-transparent'"
          :style="{ color: activeTab === 'config' ? '' : mutedTextColor }"
        >
          <Palette class="h-4 w-4" />
          Config
        </button>
      </div>
    </div>

    <!-- Details Tab -->
    <div v-if="activeTab === 'details'" class="rounded-2xl border overflow-hidden" 
         :style="{ 
           backgroundColor: cardBg, 
           borderColor: cardBorder 
         }">
      <div class="border-b p-4" 
           :style="{ 
             backgroundColor: tableHeaderBg, 
             borderColor: cardBorder 
           }">
        <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Información de la Empresa</h3>
        <p class="text-xs mt-1" :style="{ color: mutedTextColor }">Datos generales y configuración de tenant</p>
      </div>
      <div class="divide-y" :style="{ borderColor: cardBorder }">
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">Schema Name (DB)</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.schema_name }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">País</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.country }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">RUT</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.rut }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">Email de Contacto</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.contact_email }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">Teléfono</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.contact_phone || '-' }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">Plan Actual</span>
          <span class="text-sm font-medium uppercase tracking-wider" :style="{ color: headerTextColor }">{{ company.plan_type }}</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="text-sm" :style="{ color: mutedTextColor }">Dirección</span>
          <span class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.address || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Payments Tab (read-only — invoices from commercial window) -->
    <div v-if="activeTab === 'payments'" class="space-y-4">
      <!-- Invoices Table -->
      <div class="rounded-2xl border overflow-hidden"
           :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="border-b p-4"
             :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <div class="flex items-center gap-2">
            <Receipt class="h-4 w-4" :style="{ color: mutedTextColor }" />
            <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Recibos emitidos</h3>
          </div>
          <p class="text-xs mt-0.5" :style="{ color: mutedTextColor }">Generados desde la ventana comercial</p>
        </div>
        <div v-if="invoices.length === 0" class="p-6 text-center text-sm" :style="{ color: mutedTextColor }">
          No hay recibos emitidos para esta empresa.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
              <tr>
                <th class="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Período</th>
                <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Emisión</th>
                <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Vencimiento</th>
                <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Monto</th>
                <th class="py-3 pl-3 pr-4 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y" :style="{ borderColor: cardBorder }">
              <tr v-for="inv in invoices" :key="inv.id" class="transition-colors"
                  @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
                  @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                <td class="py-3 pl-4 pr-3 text-sm" :style="{ color: headerTextColor }">
                  {{ formatDate(inv.period_start) }} — {{ formatDate(inv.period_end) }}
                </td>
                <td class="px-3 py-3 text-sm" :style="{ color: mutedTextColor }">{{ formatDate(inv.issue_date || inv.created_at) }}</td>
                <td class="px-3 py-3 text-sm" :style="{ color: mutedTextColor }">{{ formatDate(inv.due_date) }}</td>
                <td class="px-3 py-3 text-sm font-medium" :style="{ color: headerTextColor }">
                  ${{ Number(inv.amount).toLocaleString('es-CL') }} {{ inv.currency || 'CLP' }}
                </td>
                <td class="py-3 pl-3 pr-4">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border capitalize" :class="getInvoiceStatusColor(inv.status)">
                    {{ inv.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payments History -->
      <div class="rounded-2xl border overflow-hidden"
           :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="border-b p-4"
             :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Historial de pagos registrados</h3>
        </div>
        <div v-if="commercialPayments.length === 0" class="p-6 text-center text-sm" :style="{ color: mutedTextColor }">
          No hay pagos registrados aún.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
              <tr>
                <th class="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Fecha</th>
                <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Monto</th>
                <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Registrado por</th>
                <th class="py-3 pl-3 pr-4 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Notas</th>
              </tr>
            </thead>
            <tbody class="divide-y" :style="{ borderColor: cardBorder }">
              <tr v-for="pay in commercialPayments" :key="pay.id" class="transition-colors"
                  @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
                  @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                <td class="py-3 pl-4 pr-3 text-sm" :style="{ color: headerTextColor }">{{ formatDate(pay.payment_date) }}</td>
                <td class="px-3 py-3 text-sm font-medium" :style="{ color: headerTextColor }">${{ Number(pay.amount).toLocaleString('es-CL') }}</td>
                <td class="px-3 py-3 text-sm" :style="{ color: mutedTextColor }">{{ pay.registered_by_name || '-' }}</td>
                <td class="py-3 pl-3 pr-4 text-sm truncate max-w-xs" :style="{ color: mutedTextColor }">{{ pay.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'" class="space-y-4">
      <div class="flex justify-end">
        <button
          @click="showInviteModal = true"
          class="flex items-center gap-2 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <UserPlus class="h-4 w-4" />
          Invitar Usuario
        </button>
      </div>

      <div class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="border-b p-4" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Usuarios con acceso</h3>
        </div>
        <div v-if="companyUsers.length === 0" class="p-6 text-center text-sm" :style="{ color: mutedTextColor }">
          No hay usuarios configurados para esta empresa.
        </div>
        <table v-else class="min-w-full">
          <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
            <tr>
              <th class="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Usuario</th>
              <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Rol</th>
              <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Estado</th>
              <th class="py-3 pl-3 pr-4 text-right text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y" :style="{ borderColor: cardBorder }">
            <tr v-for="user in companyUsers" :key="user.id" class="transition-colors"
                @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
                @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
              <td class="py-3 pl-4 pr-3">
                <p class="text-sm font-medium" :style="{ color: headerTextColor }">{{ user.full_name }}</p>
                <p class="text-xs" :style="{ color: mutedTextColor }">{{ user.email }}</p>
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
                        :class="getRoleBadgeClass(user.role_name)">
                    <ShieldCheck v-if="user.is_company_admin" class="h-3 w-3" />
                    <Shield v-else class="h-3 w-3" />
                    {{ user.role_name || (user.is_company_admin ? 'Admin' : 'Usuario') }}
                  </span>
                  <select
                    v-if="availableRoles.length > 0"
                    :value="user.role_id"
                    @change="(e) => changeUserRole(user, Number((e.target as HTMLSelectElement).value))"
                    class="text-xs rounded-lg border px-1.5 py-0.5 focus:outline-none cursor-pointer"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: mutedTextColor }"
                    title="Cambiar rol"
                  >
                    <option v-for="role in availableRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
                  </select>
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                      :class="user.is_active ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                  {{ user.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="py-3 pl-3 pr-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="toggleUserAdmin(user)" title="Cambiar rol" class="p-1.5 rounded-lg transition-colors hover:bg-white/10" :style="{ color: mutedTextColor }">
                    <ShieldCheck class="h-4 w-4" />
                  </button>
                  <button @click="toggleUserActive(user)" title="Activar/Desactivar" class="p-1.5 rounded-lg transition-colors hover:bg-white/10" :style="{ color: mutedTextColor }">
                    <Check class="h-4 w-4" />
                  </button>
                  <button @click="removeUser(user)" title="Eliminar de empresa" class="p-1.5 rounded-lg transition-colors hover:bg-rose-500/20 text-rose-400">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="space-y-4">
      <div class="rounded-2xl border p-5" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Configuración del Tenant</h3>
            <p class="text-xs mt-0.5" :style="{ color: mutedTextColor }">Branding y datos locales del schema</p>
          </div>
          <span v-if="configSaved" class="flex items-center gap-1.5 text-xs text-emerald-300">
            <Check class="h-4 w-4" /> Guardado
          </span>
        </div>

        <form @submit.prevent="saveConfig" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Nombre Empresa (tenant)</label>
              <input v-model="configForm.company_name" type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Email</label>
              <input v-model="configForm.email" type="email" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Teléfono</label>
              <input v-model="configForm.phone" type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">País</label>
              <input v-model="configForm.country" type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">RUT</label>
              <input v-model="configForm.rut" type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Dirección</label>
              <input v-model="configForm.address" type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
          </div>

          <!-- Branding -->
          <div class="rounded-xl border p-4 space-y-4" :style="{ borderColor: cardBorder }">
            <p class="text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Branding / Personalización</p>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label class="block text-xs font-medium mb-1.5" :style="{ color: mutedTextColor }">Color Principal</label>
                <div class="flex items-center gap-2">
                  <input v-model="configForm.primary_color" type="color" class="h-9 w-14 rounded-lg border cursor-pointer"
                         :style="{ borderColor: inputBorder, backgroundColor: inputBg }" />
                  <input v-model="configForm.primary_color" type="text" maxlength="7" class="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1.5" :style="{ color: mutedTextColor }">Color Secundario</label>
                <div class="flex items-center gap-2">
                  <input v-model="configForm.secondary_color" type="color" class="h-9 w-14 rounded-lg border cursor-pointer"
                         :style="{ borderColor: inputBorder, backgroundColor: inputBg }" />
                  <input v-model="configForm.secondary_color" type="text" maxlength="7" class="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1.5" :style="{ color: mutedTextColor }">Tipografía</label>
                <select v-model="configForm.font_family" class="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5" :style="{ color: mutedTextColor }">Logo de la empresa</label>
              <div class="flex items-center gap-4">
                <div v-if="configForm.logo_url" class="shrink-0">
                  <img :src="configForm.logo_url" alt="Logo preview" class="h-16 w-16 object-contain rounded-xl border" :style="{ borderColor: inputBorder }" />
                </div>
                <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border"
                     :style="{ borderColor: inputBorder, backgroundColor: inputBg }">
                  <Upload class="h-5 w-5" :style="{ color: mutedTextColor }" />
                </div>
                <div class="flex-1">
                  <label class="flex items-center gap-2 cursor-pointer rounded-2xl border px-3 py-2 text-xs transition hover:bg-white/5"
                         :style="{ borderColor: inputBorder, color: mutedTextColor }">
                    <Upload class="h-3.5 w-3.5" />
                    Subir logo
                    <input ref="logoFileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleLogoUpload" />
                  </label>
                  <p class="text-xs mt-1 opacity-60" :style="{ color: mutedTextColor }">JPG, PNG o WebP · máx 3 MB</p>
                  <button v-if="configForm.logo_url" type="button" @click="configForm.logo_url = ''" class="text-xs text-red-400 mt-1 hover:underline">
                    Quitar logo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-end gap-3 pt-1">
            <button type="button" @click="configForm = companyConfig ? { ...companyConfig } : {}" class="flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: mutedTextColor }">
              <RotateCcw class="h-4 w-4" />
              Restablecer
            </button>
            <button type="submit" :disabled="isSavingConfig" class="flex items-center gap-1.5 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60">
              <Settings class="h-4 w-4" />
              {{ isSavingConfig ? 'Guardando...' : 'Guardar Configuración' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div v-else class="rounded-2xl border p-8 text-center" 
       :style="{ 
         backgroundColor: cardBg, 
         borderColor: cardBorder 
       }">
    <p :style="{ color: mutedTextColor }">Empresa no encontrada.</p>
  </div>

  <!-- Invite User Modal -->
  <Teleport to="body">
    <div v-if="showInviteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="showInviteModal = false"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div class="inline-block align-bottom rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6"
             :style="{ backgroundColor: modalBg, borderColor: modalBorder }">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
              <UserPlus class="h-5 w-5" />
            </div>
            <h3 class="text-base font-medium" :style="{ color: headerTextColor }">Invitar Usuario</h3>
          </div>
          <form @submit.prevent="handleInviteUser" class="space-y-3">
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Nombre Completo</label>
              <input v-model="inviteForm.full_name" required type="text" class="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Email</label>
              <input v-model="inviteForm.email" required type="email" class="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Contraseña Inicial</label>
              <input v-model="inviteForm.password" required type="password" class="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                     :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase mb-1.5" :style="{ color: mutedTextColor }">Rol en el sistema</label>
              <select v-model="inviteForm.role_id" class="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                      :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerTextColor }">
                <option :value="null">-- Sin rol (se asignará 'user' por defecto) --</option>
                <option v-for="role in availableRoles" :key="role.id" :value="role.id">
                  {{ role.name }}{{ role.is_system_role ? ' (sistema)' : '' }}
                </option>
              </select>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="inviteForm.is_company_admin" type="checkbox" class="rounded" />
              <span class="text-sm" :style="{ color: mutedTextColor }">Admin de empresa</span>
            </label>
            <p v-if="inviteError" class="text-xs text-rose-400">{{ inviteError }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" @click="showInviteModal = false" class="flex-1 rounded-2xl border px-4 py-2.5 text-sm font-medium"
                      :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: mutedTextColor }">
                Cancelar
              </button>
              <button type="submit" :disabled="isInviting" class="flex-1 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {{ isInviting ? 'Invitando...' : 'Invitar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Toast Notification -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
        <AppToast :toast="activeToast" @close="activeToast = null" />
      </div>
    </Transition>
  </Teleport>

  <!-- Edit Company Modal -->
  <EditCompanyModal 
    :is-open="showEditModal"
    :company="company"
    @close="showEditModal = false"
    @updated="fetchData"
  />
</template>
