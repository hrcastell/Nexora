<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { Loader2 } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref('');
const showPassword = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Por favor ingresa correo y contraseña';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    await authStore.login(email.value, password.value);
    router.push('/select-company');
  } catch (err: any) {
    if (err.response && err.response.data && err.response.data.error) {
      error.value = err.response.data.error;
    } else {
      error.value = 'Error al iniciar sesión. Intente nuevamente.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[#08101f] text-white">
    <div class="relative min-h-screen">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.12),transparent_20%)]" />
      <div class="absolute left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl orb-one" />
      <div class="absolute right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/18 blur-3xl orb-two" />
      <div class="absolute bottom-[-3rem] left-1/3 h-72 w-72 rounded-full bg-slate-200/10 blur-3xl orb-one" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(192,199,209,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(192,199,209,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(2,6,23,0.64)_62%,rgba(2,6,23,0.95)_100%)]" />

      <div class="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <section class="hidden lg:flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/6 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl lg:p-9">
          <div class="space-y-8">
            <!-- Logo -->
            <div class="flex items-center gap-4">
              <img src="../assets/logo_icon.png" alt="Nexora" class="h-16 w-16 rounded-2xl object-contain" />
              <div>
                <p class="text-xl font-semibold text-white">Nexora</p>
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">SaaS Platform</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#f4deb0] uppercase">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
                  <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                  <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
                </svg>
                Access Core
              </span>
              <span class="inline-flex items-center gap-2 rounded-full border border-[#c0c7d1]/20 bg-[#c0c7d1]/10 px-3 py-1 text-xs font-medium text-[#d8dde5]">
                Multiempresa · Multiperfil
              </span>
            </div>

            <div class="space-y-4">
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-[#c0c7d1]">
                 Nexora Base
              </p>
              <h1 class="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-5xl">
                Portal de acceso inteligente
              </h1>
              <p class="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Sistema de gestión multi-tenant con detección automática de empresas, 
                control de accesos por perfil y administración centralizada.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div class="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Paso 1</p>
                <h3 class="mt-2 text-sm font-semibold text-white">Identificación</h3>
                <p class="mt-2 text-sm leading-6 text-slate-300">
                  Ingresa tu correo corporativo para iniciar el proceso de autenticación.
                </p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-[#c0c7d1]">Paso 2</p>
                <h3 class="mt-2 text-sm font-semibold text-white">Selección</h3>
                <p class="mt-2 text-sm leading-6 text-slate-300">
                  Elige la empresa y el perfil con el que deseas operar en esta sesión.
                </p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-[#7c3aed]">Paso 3</p>
                <h3 class="mt-2 text-sm font-semibold text-white">Acceso</h3>
                <p class="mt-2 text-sm leading-6 text-slate-300">
                  Ingresa al dashboard con los permisos correspondientes a tu rol.
                </p>
              </div>
            </div>
          </div>

          <div class="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-[#d8dde5]">
              <svg class="h-4 w-4 text-[#d4af37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3l9 5-9 5-9-5 9-5z" />
                <path d="M3 12l9 5 9-5" />
                <path d="M3 16l9 5 9-5" />
              </svg>
              Resumen contextual
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Acceso</p>
                <p class="mt-2 text-sm font-medium text-white">Multiempresa</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Esquema</p>
                <p class="mt-2 text-sm font-medium text-white">Detectado por correo</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Perfil</p>
                <p class="mt-2 text-sm font-medium text-white">Rol asignado</p>
              </div>
            </div>
          </div>
        </section>

        <section class="flex items-center justify-center">
          <div class="w-full max-w-xl rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.90),rgba(7,12,24,0.96))] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
            <div class="mb-8 flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <img src="../assets/logo_icon3.png" alt="Nexora" class="h-14 w-14 rounded-2xl object-contain" />
                <div>
                  <p class="text-sm font-medium text-[#c0c7d1]">Acceso seguro</p>
                  <h2 class="mt-1 text-2xl font-semibold text-white">Ingreso al sistema</h2>
                </div>
              </div>
              <div class="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-3 shadow-lg shadow-[#d4af37]/10">
                <svg class="h-6 w-6 text-[#f0ce6f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M4 21V7l8-4 8 4v14" />
                  <path d="M9 21v-4h6v4" />
                  <path d="M8 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M16 10h.01" />
                  <path d="M8 13h.01" />
                  <path d="M12 13h.01" />
                  <path d="M16 13h.01" />
                </svg>
              </div>
            </div>

            <form class="space-y-5" @submit.prevent="handleLogin">
              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-200">Correo corporativo</label>
                <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                  <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M4 7l8 6 8-6" />
                  </svg>
                  <input
                    v-model="email"
                    type="email"
                    required
                    class="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="tu.correo@empresa.com"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-200">Contraseña</label>
                <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                  <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="8" cy="15" r="4" />
                    <path d="M12 15h9" />
                    <path d="M18 12v6" />
                    <path d="M21 13v4" />
                  </svg>
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    class="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Ingresa tu contraseña"
                  />
                  <button 
                    type="button"
                    @click="showPassword = !showPassword"
                    class="text-xs text-slate-400 hover:text-[#d4af37] transition-colors"
                  >
                    {{ showPassword ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
              </div>

              <div class="rounded-3xl border border-[#7c3aed]/20 bg-[#7c3aed]/10 p-4">
                <p class="text-sm font-medium text-[#e5d5ff]">Seguridad reforzada</p>
                <p class="mt-1 text-sm leading-6 text-slate-300">
                  El sistema valida tus credenciales contra la empresa seleccionada. 
                  Asegúrate de tener acceso activo.
                </p>
              </div>

              <div v-if="error" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                <p class="text-sm font-medium text-rose-300">{{ error }}</p>
              </div>

              <button
                type="submit"
                :disabled="isLoading"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#4c2f88] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <Loader2 v-if="isLoading" class="animate-spin h-4 w-4" />
                <span v-if="!isLoading">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M5 12h14" />
                    <path d="M13 5l7 7-7 7" />
                  </svg>
                </span>
                {{ isLoading ? 'Iniciando...' : 'Ingresar al sistema' }}
              </button>
            </form>

            <div class="mt-7 border-t border-white/10 pt-6">
              <p class="text-center text-xs leading-5 text-slate-400">
                Sistema Nexora SaaS · Acceso restringido a usuarios autorizados
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
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
