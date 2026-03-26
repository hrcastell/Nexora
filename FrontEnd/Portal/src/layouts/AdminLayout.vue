<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useVisualConfigStore, wallpaperBackground } from '../stores/visualConfig';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const configStore = useVisualConfigStore();
const route = useRoute();
const router = useRouter();
const isMobileMenuOpen = ref(false);
const isConfigExpanded = ref(true); // Config menu expanded by default

// Custom Icons as components
const BuildingIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-4h6v4"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/></svg>` };
const UsersIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` };
const LayoutDashboardIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` };
const LogOutIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>` };
const MenuIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-6 w-6"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>` };
const SettingsIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.1a2 2 0 01-1-1.72v-.51a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>` };
const PaletteIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M12 22a10 10 0 100-20 10 10 0 000 20z"/><path d="M7.5 11.5a1 1 0 100-2 1 1 0 000 2z"/><path d="M12 8.5a1 1 0 100-2 1 1 0 000 2z"/><path d="M16.5 11.5a1 1 0 100-2 1 1 0 000 2z"/><path d="M14.5 16a1 1 0 11-2 0c0-1.3 1-2 2.2-2H16a2 2 0 100-4"/></svg>` };
const ChevronDownIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M6 9l6 6 6-6"/></svg>` };

// Main navigation items
const mainNav = computed(() => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
]);

// Config submenu items (only for super_admin)
const configNav = computed(() => {
  if (!authStore.user?.is_super_admin) return [];
  return [
    { name: 'Empresas', href: '/admin/companies', icon: BuildingIcon },
    { name: 'Solicitudes', href: '/admin/requests', icon: UsersIcon },
    { name: 'Personalización visual', href: '/admin/config', icon: PaletteIcon },
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
                <SettingsIcon />
              </div>
              <span class="text-sm font-medium flex-1">Configuración</span>
              <ChevronDownIcon :class="['transition-transform', isConfigExpanded ? 'rotate-180' : '']" />
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
      <div class="mt-auto pt-6">
        <div class="rounded-[28px] border nxr-glass p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto activo</p>
          <div class="mt-4 space-y-4">
            <div>
              <p class="text-xs text-slate-400">Usuario</p>
              <p class="mt-1 text-sm font-medium text-white truncate">{{ authStore.user?.email || 'No autenticado' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Perfil</p>
              <p class="mt-1 text-sm font-medium text-white">{{ authStore.user?.is_super_admin ? 'super_admin' : 'user' }}</p>
            </div>
            <div v-if="authStore.currentCompany">
              <p class="text-xs text-slate-400">Empresa</p>
              <p class="mt-1 text-sm font-medium text-white truncate">{{ authStore.currentCompany.name }}</p>
            </div>
          </div>
        </div>

        <!-- Logout -->
        <div class="mt-4">
          <button 
            @click="logout"
            class="flex w-full items-center justify-center gap-2 rounded-2xl border nxr-glass px-4 py-3 text-sm font-medium text-slate-200 transition hover:text-white"
          >
            <LogOutIcon />
            Cerrar sesión
          </button>
        </div>
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
            <MenuIcon />
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
