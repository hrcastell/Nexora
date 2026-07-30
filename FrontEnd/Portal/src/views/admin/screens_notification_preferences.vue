<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Settings, Bell, ArrowLeft, Save } from 'lucide-vue-next';
import { useNotificationsStore } from '../../stores/notifications';

const router    = useRouter();
const notifStore = useNotificationsStore();

const saving  = ref(false);
const saved   = ref(false);
const error   = ref('');

const form = reactive({
  show_toast: true,
  categories: {
    system:        true,
    users:         true,
    subscriptions: true,
    requests:      true,
    billing:       true,
    modules:       true,
    dental:        true,
    inventory:     true,
    human_resources: true,
    treasury_collections: true,
  }
});

type CategoryKey = keyof typeof form.categories;

const CATEGORY_LABELS: Record<CategoryKey, { label: string; description: string }> = {
  system:        { label: 'Sistema',        description: 'Notificaciones del sistema y mantenimiento' },
  users:         { label: 'Usuarios',       description: 'Creación y cambios en usuarios' },
  subscriptions: { label: 'Suscripciones',  description: 'Cambios en planes y suscripciones' },
  requests:      { label: 'Solicitudes',    description: 'Nuevas solicitudes de empresas' },
  billing:       { label: 'Facturación',    description: 'Cobros, pagos y facturas' },
  modules:       { label: 'Módulos',        description: 'Activación y desactivación de módulos' },
  dental:        { label: 'Dental',         description: 'Citas, agenda y eventos clínicos del core dental' },
  inventory:     { label: 'Inventario',     description: 'Stock, recepciones y alertas de reposición' },
  human_resources: { label: 'Recursos Humanos', description: 'Solicitudes y aprobaciones de Recursos Humanos' },
  treasury_collections: { label: 'Tesorería y Cobranza', description: 'Recibos, pagos y aplicaciones de tesorería' },
};

const categoryKeys = Object.keys(CATEGORY_LABELS) as CategoryKey[];

onMounted(async () => {
  await notifStore.fetchPreferences();
  if (notifStore.preferences) {
    form.show_toast              = notifStore.preferences.show_toast;
    form.categories.system       = notifStore.preferences.categories.system       ?? true;
    form.categories.users        = notifStore.preferences.categories.users        ?? true;
    form.categories.subscriptions = notifStore.preferences.categories.subscriptions ?? true;
    form.categories.requests     = notifStore.preferences.categories.requests     ?? true;
    form.categories.billing      = notifStore.preferences.categories.billing      ?? true;
    form.categories.modules      = notifStore.preferences.categories.modules      ?? true;
    form.categories.dental       = notifStore.preferences.categories.dental       ?? true;
    form.categories.inventory    = notifStore.preferences.categories.inventory    ?? true;
    form.categories.human_resources = notifStore.preferences.categories.human_resources ?? true;
    form.categories.treasury_collections = notifStore.preferences.categories.treasury_collections ?? true;
  }
});

async function save() {
  try {
    saving.value = true;
    error.value  = '';
    await notifStore.savePreferences({
      show_toast: form.show_toast,
      categories: { ...form.categories }
    });
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2500);
  } catch {
    error.value = 'Error al guardar las preferencias. Intenta de nuevo.';
  } finally {
    saving.value = false;
  }
}

function allEnabled(): boolean {
  return Object.values(form.categories).every(v => v === true);
}

function toggleAll() {
  const newVal = !allEnabled();
  (Object.keys(form.categories) as Array<keyof typeof form.categories>)
    .forEach(k => { form.categories[k] = newVal; });
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">

    <!-- Header -->
    <div class="flex items-center gap-4">
      <button
        @click="router.push('/admin/notifications')"
        class="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-[var(--nexora-text-color)]"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20">
          <Settings class="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 class="text-lg font-semibold nxr-text">Preferencias de notificaciones</h2>
          <p class="text-xs text-slate-400">Configura qué notificaciones recibir y cómo</p>
        </div>
      </div>
    </div>

    <!-- Toast setting -->
    <div class="rounded-[24px] border border-white/10 bg-white/3 p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
            <Bell class="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p class="text-sm font-medium nxr-text">Notificaciones en pantalla</p>
            <p class="mt-0.5 text-xs text-slate-500">Mostrar notificaciones emergentes mientras navegas</p>
          </div>
        </div>
        <button
          @click="form.show_toast = !form.show_toast"
          :class="[
            'relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200',
            form.show_toast
              ? 'border-violet-500/60 bg-violet-500/30'
              : 'border-white/10 bg-white/10'
          ]"
        >
          <span
            :class="[
              'absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
              form.show_toast ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Categories -->
    <div class="rounded-[24px] border border-white/10 bg-white/3 p-5 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold nxr-text">Categorías</p>
        <button
          @click="toggleAll"
          class="text-xs font-medium text-violet-400 transition hover:text-violet-300"
        >
          {{ allEnabled() ? 'Desactivar todas' : 'Activar todas' }}
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="key in categoryKeys"
          :key="key"
          class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/2 px-4 py-3 transition hover:bg-white/5"
        >
          <div>
            <p class="text-xs font-medium text-slate-200">{{ CATEGORY_LABELS[key].label }}</p>
            <p class="mt-0.5 text-[11px] text-slate-600">{{ CATEGORY_LABELS[key].description }}</p>
          </div>
          <button
            @click="form.categories[key] = !form.categories[key]"
            :class="[
              'relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200',
              form.categories[key]
                ? 'border-violet-500/60 bg-violet-500/30'
                : 'border-white/10 bg-white/10'
            ]"
          >
            <span
              :class="[
                'absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                form.categories[key] ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
      {{ error }}
    </div>

    <!-- Save button -->
    <div class="flex justify-end">
      <button
        @click="save"
        :disabled="saving"
        :class="[
          'flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-medium transition disabled:opacity-50',
          saved
            ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
            : 'border border-violet-500/40 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30'
        ]"
      >
        <Save class="h-4 w-4" />
        {{ saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar cambios' }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.bg-white\/2 { background-color: rgba(255,255,255,0.02); }
.bg-white\/3 { background-color: rgba(255,255,255,0.03); }
</style>
