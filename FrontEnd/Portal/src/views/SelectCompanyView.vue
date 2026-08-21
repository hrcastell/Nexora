<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { Building2, ArrowRight, Layers, LogOut, Search } from 'lucide-vue-next';
import InfoModal from '../components/admin/InfoModal.vue';
import api from '../utils/axios';
import type { Company } from '../types/auth';

const authStore = useAuthStore();
const router = useRouter();

// Info modal state
const showInfoModal = ref(false);
const infoModalConfig = ref({ title: '', message: '', type: 'error' as 'success' | 'warning' | 'error' | 'info' });

// Super-admin "find any company" search
const isSuperAdmin = computed(() => !!authStore.user?.is_super_admin);
const searchQuery = ref('');
const allCompanies = ref<Company[]>([]);
const isLoadingAllCompanies = ref(false);

const otherCompanyResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return [];
  const ownIds = new Set(authStore.companies.map((c) => c.id));
  return allCompanies.value.filter((c) => {
    if (ownIds.has(c.id)) return false;
    return c.name.toLowerCase().includes(query) || c.schema_name.toLowerCase().includes(query);
  });
});

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  if (isSuperAdmin.value) {
    isLoadingAllCompanies.value = true;
    try {
      const { data } = await api.get('/companies');
      allCompanies.value = data;
    } catch {
      // Search box simply stays empty-handed if this fails; own companies still work.
    } finally {
      isLoadingAllCompanies.value = false;
    }
  }
});

const handleSelectCompany = async (companyId: number) => {
  try {
    await authStore.selectCompany(companyId);
    router.push('/dashboard');
  } catch (error) {
    infoModalConfig.value = {
      title: 'Error',
      message: 'Error al seleccionar la compañía. Por favor intenta nuevamente.',
      type: 'error'
    };
    showInfoModal.value = true;
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
    <!-- Background Effects -->
    <div class="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.08),transparent_20%)]" />
    <div class="fixed left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/10 blur-3xl orb-one pointer-events-none" />
    <div class="fixed right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl orb-two pointer-events-none" />
    <div class="fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

    <!-- Main Content -->
    <div class="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
      <!-- Left Panel -->
      <section class="hidden lg:flex flex-col justify-between rounded-[32px] border border-slate-900/8 bg-white/80 p-7 shadow-xl shadow-slate-900/5 backdrop-blur-xl lg:p-9">
        <div class="space-y-8">
          <!-- Logo -->
          <div class="flex items-center gap-4">
            <img src="../assets/logo_icon.png" alt="Nexora" class="h-16 w-16 rounded-2xl object-contain" />
            <div>
              <p class="text-xl font-semibold text-slate-900">Nexora</p>
              <p class="text-xs uppercase tracking-[0.18em] text-slate-500">SaaS Platform</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#8a6d1f] uppercase">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
                <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
              </svg>
              Access Core
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600">
              Selección de Empresa
            </span>
          </div>

          <div class="space-y-4">
            <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Bienvenido de nuevo
            </p>
            <h1 class="max-w-2xl text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              {{ authStore.user?.full_name || 'Usuario' }}
            </h1>
            <p class="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Selecciona la empresa con la que deseas operar en esta sesión.
              Cada empresa tiene su propio esquema de base de datos y configuración independiente.
            </p>
          </div>

          <div class="rounded-[28px] border border-slate-900/8 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">Multi-tenant Architecture</p>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Cada empresa opera en su propio schema aislado, garantizando seguridad
                  y separación completa de datos entre tenants.
                </p>
              </div>
              <div class="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-sm font-medium text-[#8a6d1f]">
                Schema per Tenant
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 rounded-[28px] border border-slate-900/8 bg-slate-900/[0.02] p-5">
          <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Layers class="h-4 w-4" />
            Resumen de Acceso
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-900/8 bg-white p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Usuario</p>
              <p class="mt-2 text-sm font-medium text-slate-900">{{ authStore.user?.email || 'N/A' }}</p>
            </div>
            <div class="rounded-2xl border border-slate-900/8 bg-white p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Empresas</p>
              <p class="mt-2 text-sm font-medium text-slate-900">{{ authStore.companies.length }} disponibles</p>
            </div>
            <div class="rounded-2xl border border-slate-900/8 bg-white p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Perfil</p>
              <p class="mt-2 text-sm font-medium text-slate-900">{{ authStore.user?.is_super_admin ? 'super_admin' : 'user' }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Panel - Company Selection -->
      <section class="flex items-center justify-center">
        <div class="w-full max-w-xl rounded-[34px] border border-slate-900/8 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
          <div class="mb-8 flex items-start justify-between gap-4">
            <div class="flex items-center gap-4">
              <img src="../assets/logo_icon3.png" alt="Nexora" class="h-14 w-14 rounded-2xl object-contain" />
              <div>
                <p class="text-sm font-medium text-slate-500">Acceso Corporativo</p>
                <h2 class="mt-1 text-2xl font-semibold text-slate-900">Seleccionar Empresa</h2>
              </div>
            </div>
            <div class="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-3">
              <Building2 class="h-6 w-6 text-[#a8790a]" />
            </div>
          </div>

          <!-- Super-admin search: find any other company -->
          <div v-if="isSuperAdmin" class="mb-5">
            <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
              <Search class="h-4 w-4 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar otra empresa por nombre o schema..."
                class="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <p v-if="isLoadingAllCompanies" class="mt-2 text-xs text-slate-400">Cargando listado completo...</p>
          </div>

          <p v-if="isSuperAdmin" class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Tu empresa
          </p>

          <!-- Companies List -->
          <div class="space-y-3">
            <button
              v-for="company in authStore.companies"
              :key="company.id"
              @click="handleSelectCompany(company.id)"
              class="w-full rounded-3xl border p-4 text-left transition border-slate-900/8 bg-slate-50 hover:border-[#7c3aed]/30 hover:bg-white"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] to-[#4c1d95]">
                    <Building2 class="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-semibold text-slate-900">{{ company.name }}</p>
                      <span v-if="company.is_company_admin" class="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6d1f]">
                        admin
                      </span>
                    </div>
                    <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      schema {{ company.schema_name }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span>Seleccionar</span>
                  <ArrowRight class="h-4 w-4" />
                </div>
              </div>
            </button>

            <!-- Empty State -->
            <div v-if="authStore.companies.length === 0" class="rounded-3xl border border-slate-900/8 bg-slate-50 p-8 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/5">
                <Building2 class="h-8 w-8 text-slate-400" />
              </div>
              <p class="text-sm font-medium text-slate-900">No tienes empresas asignadas</p>
              <p class="mt-2 text-sm text-slate-500">
                Contacta al administrador para solicitar acceso a una empresa.
              </p>
            </div>
          </div>

          <!-- Other companies (super-admin search results) -->
          <div v-if="isSuperAdmin && searchQuery.trim()" class="mt-6">
            <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Otras empresas
            </p>
            <div class="space-y-3">
              <button
                v-for="company in otherCompanyResults"
                :key="company.id"
                @click="handleSelectCompany(company.id)"
                class="w-full rounded-3xl border p-4 text-left transition border-slate-900/8 bg-slate-50 hover:border-[#7c3aed]/30 hover:bg-white"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-4">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600">
                      <Building2 class="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ company.name }}</p>
                      <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        schema {{ company.schema_name }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <span>Seleccionar</span>
                    <ArrowRight class="h-4 w-4" />
                  </div>
                </div>
              </button>

              <p v-if="!otherCompanyResults.length && !isLoadingAllCompanies" class="rounded-2xl border border-slate-900/8 bg-slate-50 p-4 text-center text-sm text-slate-500">
                Ninguna otra empresa coincide con "{{ searchQuery }}".
              </p>
            </div>
          </div>

          <!-- Logout Button -->
          <div class="mt-7 border-t border-slate-900/8 pt-6">
            <button
              @click="handleLogout"
              class="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-900/8 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut class="h-4 w-4" />
              Cerrar sesión y volver al login
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Info Modal -->
    <InfoModal
      :isOpen="showInfoModal"
      :title="infoModalConfig.title"
      :message="infoModalConfig.message"
      :type="infoModalConfig.type"
      :force-light="true"
      @close="showInfoModal = false" />
  </div>
</template>

<style scoped>
@keyframes driftOne {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(16px, -18px, 0) scale(1.04); }
}
@keyframes driftTwo {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-22px, 16px, 0) scale(1.06); }
}
.orb-one { animation: driftOne 8s ease-in-out infinite; }
.orb-two { animation: driftTwo 10s ease-in-out infinite; }
</style>
