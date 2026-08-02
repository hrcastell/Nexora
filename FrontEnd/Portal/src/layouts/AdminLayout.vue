<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useVisualConfigStore, wallpaperBackground } from '../stores/visualConfig';
import { useMenuStore } from '../stores/menu';
import { useNotificationsStore } from '../stores/notifications';
import { useRoute, useRouter } from 'vue-router';
import WidgetsNotificationBell from '../widgets/widgets_notification_bell.vue';
import WidgetsNotificationToast from '../widgets/widgets_notification_toast.vue';
import { resolveMenuIcon } from '../utils/iconRegistry';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-vue-next';

const authStore = useAuthStore();
const configStore = useVisualConfigStore();
const menuStore = useMenuStore();
const notifStore = useNotificationsStore();
const route = useRoute();
const router = useRouter();
const isMobileMenuOpen = ref(false);
const isSidebarCollapsed = ref(false);

onMounted(async () => {
  await notifStore.fetchPreferences();
  notifStore.startPolling(60_000);
});
onBeforeUnmount(() => {
  notifStore.stopPolling();
});

// Track expanded state per module code
const expandedModules = ref<Record<string, boolean>>({});

const resolveIcon = resolveMenuIcon;

/**
 * Dynamic nav modules from menuStore.
 * - Excludes 'dashboard' module (rendered separately as main nav item).
 * - Each module with its visible transactions becomes a sidebar section.
 */
const navModules = computed(() => {
  return menuStore.modules
    .filter(m => m.code !== 'dashboard' && m.is_visible !== false)
    .map(m => ({
      ...m,
      visibleTransactions: m.transactions.filter(
        t => t.menu_visible && t.status === 'activo' && t.route && t.can_view === true
      )
    }))
    .filter(m => m.visibleTransactions.length > 0);
});

const isActive = (href: string) => route.path === href;

function isModuleActive(m: typeof navModules.value[0]): boolean {
  return m.visibleTransactions.some(t => route.path.startsWith(t.route));
}

function toggleModule(code: string) {
  expandedModules.value[code] = !expandedModules.value[code];
}

function isModuleExpanded(code: string): boolean {
  return !!expandedModules.value[code];
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const logout = () => {
  notifStore.reset();
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div 
    class="h-screen overflow-hidden transition-colors duration-300 flex"
    :style="{ 
      color: configStore.textColor,
      fontFamily: configStore.currentFont.family
    }"
  >
    <!-- Background Effects -->
    <div 
      class="fixed inset-0 transition-all duration-700 pointer-events-none z-0"
      :style="{ background: wallpaperBackground(configStore.currentWallpaper) }"
    />
    <div class="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.10),transparent_20%)] pointer-events-none z-0" />
    <div class="fixed left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/15 blur-3xl orb-one pointer-events-none z-0" />
    <div class="fixed right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/12 blur-3xl orb-two pointer-events-none z-0" />
    <div class="fixed inset-0 bg-[linear-gradient(rgba(192,199,209,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(192,199,209,0.04)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

    <!-- Mobile Menu Backdrop -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
      @click="isMobileMenuOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'fixed inset-y-0 left-0 z-50 w-[280px] shrink-0 border-r border-white/10 nxr-sidebar px-5 py-6 backdrop-blur-xl transition-all duration-300 md:static md:translate-x-0 flex flex-col',
        isSidebarCollapsed ? 'md:w-0 md:px-0 md:border-opacity-0 md:overflow-hidden' : ''
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 rounded-3xl border nxr-glass p-4">
        <img src="../assets/logo_icon3.png" alt="Nexora" class="h-11 w-11 rounded-2xl object-contain" />
        <div>
          <p class="text-sm font-semibold nxr-text">Nexora</p>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400">SaaS Core</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="mt-8 flex-1 overflow-y-auto custom-scrollbar">
        <p class="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Menú</p>
        <div class="mt-3 space-y-2">

          <!-- Dashboard global — solo visible para super_admin (métricas del sistema) -->
          <router-link
            v-if="authStore.user?.is_super_admin"
            to="/dashboard"
            :class="[
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
              isActive('/dashboard')
                ? 'nxr-nav-active shadow-lg'
                : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
            ]"
            @click="isMobileMenuOpen = false"
          >
            <div :class="['flex h-10 w-10 items-center justify-center rounded-2xl', isActive('/dashboard') ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-400']">
              <LayoutDashboard class="h-5 w-5" />
            </div>
            <span class="text-sm font-medium">Dashboard</span>
          </router-link>

          <!-- Loading state while menu loads -->
          <div v-if="!menuStore.loaded" class="flex items-center gap-3 px-4 py-3 text-slate-500">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span class="text-xs">Cargando módulos...</span>
          </div>

          <!-- Dynamic modules (one expandable section per module) -->
          <template v-else>
            <div
              v-for="mod in navModules"
              :key="mod.code"
              class="mt-1"
            >
              <!-- Module toggle button -->
              <button
                @click="toggleModule(mod.code)"
                :aria-expanded="isModuleExpanded(mod.code)"
                :aria-controls="`module-${mod.code}-transactions`"
                :class="[
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                  isModuleActive(mod)
                    ? 'nxr-nav-active shadow-lg'
                    : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
                ]"
              >
                <div :class="['flex h-10 w-10 items-center justify-center rounded-2xl', isModuleActive(mod) ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-400']">
                  <component :is="resolveIcon(mod.icon)" class="h-5 w-5" />
                </div>
                <span class="text-sm font-medium flex-1">{{ mod.name }}</span>
                <ChevronDown :class="['h-4 w-4 transition-transform', isModuleExpanded(mod.code) ? 'rotate-180' : '']" />
              </button>

              <!-- Module transactions submenu -->
              <div v-show="isModuleExpanded(mod.code)" :id="`module-${mod.code}-transactions`" class="mt-1 space-y-1 pl-4" role="group" :aria-label="`${mod.name} transactions`">
                <router-link
                  v-for="tx in mod.visibleTransactions"
                  :key="tx.code"
                  :to="tx.route"
                  :class="[
                    'flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition',
                    isActive(tx.route)
                      ? 'nxr-nav-active'
                      : 'border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-300'
                  ]"
                  @click="isMobileMenuOpen = false"
                >
                  <div :class="['flex h-8 w-8 items-center justify-center rounded-xl', isActive(tx.route) ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-500']">
                    <component :is="resolveIcon(tx.icon)" class="h-4 w-4" />
                  </div>
                  <span class="min-w-0">
                    <span class="block text-sm">{{ tx.name }}</span>
                    <span v-if="tx.description" class="block truncate text-xs text-slate-500">{{ tx.description }}</span>
                  </span>
                </router-link>
              </div>
            </div>
          </template>

        </div>
      </nav>

      <!-- Logout -->
      <div class="mt-auto pt-6">
        <button 
          @click="logout"
          class="flex w-full items-center justify-center gap-2 rounded-2xl border nxr-glass px-4 py-3 text-sm font-medium text-slate-200 transition hover:text-[var(--nexora-text-color)]"
        >
          <LogOut class="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto h-screen relative z-10">
      <div class="px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-7 min-h-full">
        <!-- Mobile Header -->
        <header class="mb-6 flex items-center justify-between rounded-[32px] border nxr-surface p-4 shadow-2xl shadow-black/15 backdrop-blur-xl md:hidden">
          <button 
            @click="toggleMobileMenu"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
          >
            <Menu class="h-6 w-6" />
          </button>
          <div class="flex items-center gap-2">
            <img src="../assets/logo_icon3.png" alt="Nexora" class="h-8 w-8 rounded-xl object-contain" />
            <span class="text-sm font-semibold nxr-text">Nexora</span>
          </div>
          <div class="w-10" />
        </header>

        <!-- Desktop Header -->
        <header class="mb-6 hidden rounded-[32px] border nxr-surface p-5 shadow-2xl shadow-black/15 backdrop-blur-xl md:block">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-2 rounded-full border nxr-badge-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
                    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
                  </svg>
                  Dashboard
                </span>
                <span v-if="authStore.user?.is_super_admin" class="inline-flex items-center gap-2 rounded-full border border-[#c0c7d1]/20 bg-[#c0c7d1]/10 px-3 py-1 text-xs font-medium text-[#d8dde5]">
                  Super Admin View
                </span>
              </div>
              <h1 class="mt-3 text-2xl font-semibold nxr-text">
                Panel de administración
              </h1>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <WidgetsNotificationBell />
              <button
                @click="toggleSidebar"
                class="flex items-center gap-2 rounded-2xl border nxr-glass px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-[var(--nexora-text-color)]"
                :title="isSidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú'"
              >
                <ChevronLeft v-if="!isSidebarCollapsed" class="h-4 w-4" />
                <ChevronRight v-else class="h-4 w-4" />
                <span class="hidden lg:inline">{{ isSidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú' }}</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="rounded-2xl sm:rounded-[32px] border nxr-surface p-3 sm:p-5 shadow-2xl shadow-black/15 backdrop-blur-xl min-h-[calc(100%-140px)]">
          <router-view />
        </div>

        <!-- Notification toasts (bottom-right) -->
        <WidgetsNotificationToast />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Scrollbar estilizado para el menú lateral ── */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.25);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.45);
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
}

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
