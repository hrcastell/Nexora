<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useVisualConfigStore, wallpaperBackground } from '../stores/visualConfig';
import { useRoute, useRouter } from 'vue-router';
import { 
  Building2, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Settings, 
  Palette,
  ChevronDown,
  Mail
} from 'lucide-vue-next';

const authStore = useAuthStore();
const configStore = useVisualConfigStore();
const route = useRoute();
const router = useRouter();
const isMobileMenuOpen = ref(false);
const isConfigExpanded = ref(true);

// Main navigation items
const mainNav = computed(() => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]);

// Config submenu items (only for super_admin)
const configNav = computed(() => {
  if (!authStore.user?.is_super_admin) return [];
  return [
    { name: 'Empresas', href: '/admin/companies', icon: Building2 },
    { name: 'Solicitudes', href: '/admin/requests', icon: Mail },
    { name: 'Personalización visual', href: '/admin/config', icon: Palette },
  ];
});

const isActive = (href: string) => route.path === href;
const isConfigActive = computed(() => {
  return configNav.value.some(item => route.path.startsWith(item.href));
});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const toggleConfig = () => {
  isConfigExpanded.value = !isConfigExpanded.value;
};

const logout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div 
    class="h-screen overflow-hidden transition-colors duration-300 flex"
    :style="{ 
      background: configStore.shellBg, 
      color: configStore.textColor,
      fontFamily: configStore.currentFont.family
    }"
  >
    <style>
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
        'fixed inset-y-0 left-0 z-50 w-[280px] shrink-0 border-r border-white/10 nxr-sidebar px-5 py-6 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 flex flex-col'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 rounded-3xl border nxr-glass p-4">
        <img src="../assets/logo_icon3.png" alt="Nexora" class="h-11 w-11 rounded-2xl object-contain" />
        <div>
          <p class="text-sm font-semibold text-white">Nexora</p>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400">SaaS Core</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="mt-8 flex-1 overflow-y-auto">
        <p class="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Menú</p>
        <div class="mt-3 space-y-2">
          <!-- Dashboard -->
          <router-link
            v-for="item in mainNav"
            :key="item.name"
            :to="item.href"
            :class="[
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
              isActive(item.href)
                ? 'nxr-nav-active shadow-lg'
                : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
            ]"
            @click="isMobileMenuOpen = false"
          >
            <div :class="['flex h-10 w-10 items-center justify-center rounded-2xl', isActive(item.href) ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-400']">
              <component :is="item.icon" />
            </div>
            <span class="text-sm font-medium">{{ item.name }}</span>
          </router-link>

          <!-- Configuración expandable menu (only for super_admin) -->
          <div v-if="configNav.length > 0" class="mt-2">
            <button
              @click="toggleConfig"
              :class="[
                'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                isConfigActive
                  ? 'nxr-nav-active shadow-lg'
                  : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
              ]"
            >
              <div :class="['flex h-10 w-10 items-center justify-center rounded-2xl', isConfigActive ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-400']">
                <Settings class="h-5 w-5" />
              </div>
              <span class="text-sm font-medium flex-1">Configuración</span>
              <ChevronDown :class="['h-4 w-4 transition-transform', isConfigExpanded ? 'rotate-180' : '']" />
            </button>

            <!-- Config submenu -->
            <div v-show="isConfigExpanded" class="mt-2 space-y-1 pl-4">
              <router-link
                v-for="item in configNav"
                :key="item.name"
                :to="item.href"
                :class="[
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition',
                  isActive(item.href)
                    ? 'nxr-nav-active'
                    : 'border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-300'
                ]"
                @click="isMobileMenuOpen = false"
              >
                <div :class="['flex h-8 w-8 items-center justify-center rounded-xl', isActive(item.href) ? 'nxr-nav-icon-active' : 'bg-white/5 text-slate-500']">
                  <component :is="item.icon" class="h-4 w-4" />
                </div>
                <span class="text-sm">{{ item.name }}</span>
              </router-link>
            </div>
          </div>
        </div>
      </nav>

      <!-- User Context -->
      <!-- Logout -->
        <div class="mt-auto pt-6">
          <button 
            @click="logout"
            class="flex w-full items-center justify-center gap-2 rounded-2xl border nxr-glass px-4 py-3 text-sm font-medium text-slate-200 transition hover:text-white"
          >
            <LogOut class="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto h-screen relative z-10">
      <div class="px-5 py-6 lg:px-8 lg:py-7 min-h-full">
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
            <span class="text-sm font-semibold text-white">Nexora</span>
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
              <h1 class="mt-3 text-2xl font-semibold text-white">
                Panel de administración
              </h1>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="rounded-[32px] border nxr-surface p-5 shadow-2xl shadow-black/15 backdrop-blur-xl min-h-[calc(100%-140px)]">
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>
