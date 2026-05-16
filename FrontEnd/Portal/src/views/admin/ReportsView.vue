<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { BarChart2, Building2, CreditCard, FileText, Users, Loader2, TrendingUp, AlertCircle } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';

interface Stats {
  companies:      { total: string; active: string; inactive: string };
  subscriptions:  { total: string; active: string; past_due: string; canceled: string };
  payments_month: { count: string; total_amount: string; currency: string };
  solicitudes:    { total: string; pending: string; approved: string; rejected: string };
  users:          { total: string };
}

interface Company {
  id: number;
  name: string;
  schema_name: string;
  plan_type: string;
  is_active: boolean;
  country: string;
  created_at: string;
}

const configStore = useVisualConfigStore();
const isLightMode = computed(() => configStore.mode === 'light');
const headerTextColor = computed(() => isLightMode.value ? '#0f172a' : '#ffffff');
const mutedTextColor  = computed(() => isLightMode.value ? '#475569' : '#94a3b8');
const cardBg          = computed(() => configStore.cardBg);
const cardBorder      = computed(() => isLightMode.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const tableHeaderBg   = computed(() => isLightMode.value ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)');
const tableHoverBg    = computed(() => isLightMode.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');

const stats     = ref<Stats | null>(null);
const companies = ref<Company[]>([]);
const isLoading = ref(true);
const error     = ref('');

onMounted(async () => {
  try {
    const [statsRes, companiesRes] = await Promise.all([
      api.get('/stats'),
      api.get('/companies')
    ]);
    stats.value     = statsRes.data;
    companies.value = companiesRes.data;
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Error al cargar reportes';
  } finally {
    isLoading.value = false;
  }
});

const formatCLP = (n: string | number) =>
  Number(n).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL') : '-';
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
        <BarChart2 class="h-5 w-5" />
      </div>
      <div>
        <h1 class="text-lg font-semibold" :style="{ color: headerTextColor }">Reportes</h1>
        <p class="text-xs" :style="{ color: mutedTextColor }">Métricas y resumen operacional del sistema</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <div v-else-if="error" class="rounded-2xl border p-6 text-center"
         :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
      <p class="text-sm text-rose-400">{{ error }}</p>
    </div>

    <template v-else-if="stats">
      <!-- KPI Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Empresas -->
        <div class="rounded-2xl border p-4" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
              <Building2 class="h-5 w-5" />
            </div>
            <span class="text-xs uppercase tracking-wider font-medium" :style="{ color: mutedTextColor }">Empresas</span>
          </div>
          <p class="text-2xl font-semibold" :style="{ color: headerTextColor }">{{ stats.companies.total }}</p>
          <div class="mt-2 flex gap-3 text-xs" :style="{ color: mutedTextColor }">
            <span class="text-emerald-400">{{ stats.companies.active }} activas</span>
            <span>{{ stats.companies.inactive }} inactivas</span>
          </div>
        </div>

        <!-- Suscripciones -->
        <div class="rounded-2xl border p-4" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#f5df9f]">
              <TrendingUp class="h-5 w-5" />
            </div>
            <span class="text-xs uppercase tracking-wider font-medium" :style="{ color: mutedTextColor }">Suscripciones</span>
          </div>
          <p class="text-2xl font-semibold" :style="{ color: headerTextColor }">{{ stats.subscriptions.total }}</p>
          <div class="mt-2 flex gap-3 text-xs" :style="{ color: mutedTextColor }">
            <span class="text-emerald-400">{{ stats.subscriptions.active }} activas</span>
            <span class="text-rose-400">{{ stats.subscriptions.past_due }} vencidas</span>
          </div>
        </div>

        <!-- Pagos del mes -->
        <div class="rounded-2xl border p-4" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <CreditCard class="h-5 w-5" />
            </div>
            <span class="text-xs uppercase tracking-wider font-medium" :style="{ color: mutedTextColor }">Pagos este mes</span>
          </div>
          <p class="text-2xl font-semibold" :style="{ color: headerTextColor }">{{ stats.payments_month.count }}</p>
          <p class="mt-2 text-xs text-emerald-400">{{ formatCLP(stats.payments_month.total_amount) }}</p>
        </div>

        <!-- Solicitudes pendientes -->
        <div class="rounded-2xl border p-4" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
              <AlertCircle class="h-5 w-5" />
            </div>
            <span class="text-xs uppercase tracking-wider font-medium" :style="{ color: mutedTextColor }">Solicitudes</span>
          </div>
          <p class="text-2xl font-semibold" :style="{ color: headerTextColor }">{{ stats.solicitudes.pending }}</p>
          <div class="mt-2 flex gap-3 text-xs" :style="{ color: mutedTextColor }">
            <span class="text-[#f5df9f]">{{ stats.solicitudes.pending }} pendientes</span>
            <span class="text-emerald-400">{{ stats.solicitudes.approved }} aprobadas</span>
          </div>
        </div>
      </div>

      <!-- Companies Table -->
      <div class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="border-b p-4 flex items-center gap-2" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
          <FileText class="h-4 w-4" :style="{ color: mutedTextColor }" />
          <h3 class="text-sm font-medium" :style="{ color: headerTextColor }">Estado de Empresas</h3>
        </div>
        <div v-if="companies.length === 0" class="p-8 text-center text-sm" :style="{ color: mutedTextColor }">
          No hay empresas registradas.
        </div>
        <table v-else class="min-w-full">
          <thead class="border-b" :style="{ backgroundColor: tableHeaderBg, borderColor: cardBorder }">
            <tr>
              <th class="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Empresa</th>
              <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Schema</th>
              <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Plan</th>
              <th class="px-3 py-3 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Estado</th>
              <th class="py-3 pl-3 pr-4 text-left text-xs font-medium uppercase" :style="{ color: mutedTextColor }">Creada</th>
            </tr>
          </thead>
          <tbody class="divide-y" :style="{ borderColor: cardBorder }">
            <tr
              v-for="company in companies"
              :key="company.id"
              class="transition-colors"
              @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = tableHoverBg"
              @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
            >
              <td class="py-3 pl-4 pr-3">
                <p class="text-sm font-medium" :style="{ color: headerTextColor }">{{ company.name }}</p>
                <p class="text-xs" :style="{ color: mutedTextColor }">{{ company.country }}</p>
              </td>
              <td class="px-3 py-3 text-sm font-mono" :style="{ color: mutedTextColor }">{{ company.schema_name }}</td>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider bg-[#D4AF37]/10 text-[#f5df9f] border border-[#D4AF37]/20">
                  {{ company.plan_type }}
                </span>
              </td>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                      :class="company.is_active ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                  {{ company.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="py-3 pl-3 pr-4 text-sm" :style="{ color: mutedTextColor }">{{ formatDate(company.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Users summary -->
      <div class="rounded-2xl border p-4 flex items-center gap-4" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-300">
          <Users class="h-5 w-5" />
        </div>
        <div>
          <p class="text-sm font-medium" :style="{ color: headerTextColor }">{{ stats.users.total }} usuarios activos</p>
          <p class="text-xs" :style="{ color: mutedTextColor }">Total de usuarios activos en la plataforma</p>
        </div>
      </div>
    </template>
  </div>
</template>
