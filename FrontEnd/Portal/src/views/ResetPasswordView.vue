<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/axios';
import { Loader2, Lock, ArrowLeft } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const email = String(route.query.email || '');
const token = String(route.query.token || '');

const newPassword = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref(false);

const handleSubmit = async () => {
  if (!email || !token) {
    error.value = 'El link de recuperación es inválido. Solicitá uno nuevo.';
    return;
  }
  if (newPassword.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    await api.post('/auth/reset-password', { email, token, newPassword: newPassword.value });
    success.value = true;
    setTimeout(() => router.push('/login'), 2500);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'No se pudo restablecer la contraseña. Intentá nuevamente.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
    <div class="relative flex min-h-screen items-center justify-center px-6 py-8">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.08),transparent_20%)]" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div class="relative w-full max-w-md rounded-[34px] border border-slate-900/8 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
        <div class="mb-6 flex items-center gap-4">
          <img src="../assets/logo_icon3.png" alt="Nexora" class="h-12 w-12 rounded-2xl object-contain" />
          <div>
            <p class="text-sm font-medium text-slate-500">Recuperar acceso</p>
            <h2 class="mt-1 text-xl font-semibold text-slate-900">Nueva contraseña</h2>
          </div>
        </div>

        <template v-if="!email || !token">
          <div class="rounded-2xl border border-rose-300 bg-rose-50 p-4">
            <p class="text-sm font-medium text-rose-700">El link de recuperación es inválido o está incompleto. Solicitá uno nuevo.</p>
          </div>
        </template>

        <template v-else-if="!success">
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700">Nueva contraseña</label>
              <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                <Lock class="h-5 w-5 text-slate-400" />
                <input
                  v-model="newPassword"
                  type="password"
                  required
                  minlength="8"
                  class="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700">Confirmar contraseña</label>
              <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                <Lock class="h-5 w-5 text-slate-400" />
                <input
                  v-model="confirmPassword"
                  type="password"
                  required
                  minlength="8"
                  class="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Repetí la contraseña"
                />
              </div>
            </div>

            <div v-if="error" class="rounded-2xl border border-rose-300 bg-rose-50 p-4">
              <p class="text-sm font-medium text-rose-700">{{ error }}</p>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#4c2f88] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Loader2 v-if="isLoading" class="animate-spin h-4 w-4" />
              {{ isLoading ? 'Guardando...' : 'Restablecer contraseña' }}
            </button>
          </form>
        </template>

        <template v-else>
          <div class="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p class="text-sm font-medium text-emerald-800">Contraseña actualizada. Te redirigimos al login...</p>
          </div>
        </template>

        <router-link to="/login" class="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-[#a8790a] transition-colors">
          <ArrowLeft class="h-4 w-4" />
          Volver al login
        </router-link>
      </div>
    </div>
  </div>
</template>
