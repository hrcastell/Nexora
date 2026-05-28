<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, CheckCheck, Settings, X, ChevronDown } from 'lucide-vue-next';
import { useNotificationsStore } from '../../stores/notifications';
import type { Notification } from '../../stores/notifications';

const router    = useRouter();
const notifStore = useNotificationsStore();

type TabKey = 'all' | 'unread' | string;
const activeTab      = ref<TabKey>('all');
const activeCategory = ref<string>('');

const CATEGORIES = [
  { key: 'system',        label: 'Sistema' },
  { key: 'users',         label: 'Usuarios' },
  { key: 'subscriptions', label: 'Suscripciones' },
  { key: 'requests',      label: 'Solicitudes' },
  { key: 'billing',       label: 'Facturación' },
  { key: 'modules',       label: 'Módulos' },
];

async function loadNotifications(reset = true) {
  await notifStore.fetchNotifications({
    reset,
    unreadOnly:  activeTab.value === 'unread',
    category:    activeCategory.value || undefined,
  });
}

onMounted(() => loadNotifications());

async function setTab(tab: TabKey) {
  activeTab.value = tab;
  if (tab !== 'category') activeCategory.value = '';
  await loadNotifications();
}

async function setCategory(cat: string) {
  activeCategory.value = cat === activeCategory.value ? '' : cat;
  activeTab.value = 'category';
  await loadNotifications();
}

async function onMarkAllRead() {
  await notifStore.markAllRead();
  await loadNotifications();
}

async function onMarkRead(n: Notification) {
  if (!n.is_read) await notifStore.markRead(n.id);
}

async function onDismiss(id: number) {
  await notifStore.dismiss(id);
}

function navigateTo(n: Notification) {
  onMarkRead(n);
  if (n.action_url) router.push(n.action_url);
}

async function loadMore() {
  await notifStore.loadMore();
}

const hasMore = computed(() =>
  notifStore.notifications.length < notifStore.total
);

function typeColor(type: Notification['type']): string {
  switch (type) {
    case 'success': return 'text-emerald-400';
    case 'warning': return 'text-amber-400';
    case 'error':   return 'text-rose-400';
    default:        return 'text-violet-400';
  }
}

function typeBg(type: Notification['type']): string {
  switch (type) {
    case 'success': return 'bg-emerald-400/10';
    case 'warning': return 'bg-amber-400/10';
    case 'error':   return 'bg-rose-400/10';
    default:        return 'bg-violet-400/10';
  }
}

function typeIcon(type: Notification['type']): string {
  switch (type) {
    case 'success': return '✓';
    case 'warning': return '⚠';
    case 'error':   return '✕';
    default:        return 'ℹ';
  }
}

function categoryLabel(cat: string): string {
  return CATEGORIES.find(c => c.key === cat)?.label ?? cat;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es');
}
</script>

<template>
  <div class="space-y-6">

    <!-- Page header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20">
          <Bell class="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-white">Centro de Notificaciones</h2>
          <p class="text-xs text-slate-400">
            {{ notifStore.total }} notificaciones
            <span v-if="notifStore.unreadCount > 0" class="text-violet-400">&nbsp;· {{ notifStore.unreadCount }} sin leer</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="notifStore.unreadCount > 0"
          @click="onMarkAllRead"
          class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <CheckCheck class="h-4 w-4" />
          Marcar todas como leídas
        </button>
        <button
          @click="router.push('/admin/notifications/settings')"
          class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Settings class="h-4 w-4" />
          Preferencias
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="tab in [{ key: 'all', label: 'Todas' }, { key: 'unread', label: 'Sin leer' }]"
        :key="tab.key"
        @click="setTab(tab.key)"
        :class="[
          'rounded-2xl border px-4 py-1.5 text-xs font-medium transition',
          activeTab === tab.key && activeCategory === ''
            ? 'border-violet-500/40 bg-violet-500/20 text-violet-300'
            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
        ]"
      >
        {{ tab.label }}
        <span
          v-if="tab.key === 'unread' && notifStore.unreadCount > 0"
          class="ml-1.5 rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold text-violet-300"
        >
          {{ notifStore.unreadCount }}
        </span>
      </button>

      <div class="h-5 w-px bg-white/10" />

      <!-- Category chips -->
      <button
        v-for="cat in CATEGORIES"
        :key="cat.key"
        @click="setCategory(cat.key)"
        :class="[
          'rounded-2xl border px-3 py-1 text-xs font-medium transition',
          activeCategory === cat.key
            ? 'border-violet-500/40 bg-violet-500/20 text-violet-300'
            : 'border-white/10 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
        ]"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Notifications list -->
    <div class="space-y-2">

      <!-- Loading -->
      <div v-if="notifStore.loading && notifStore.notifications.length === 0" class="flex items-center justify-center py-16">
        <span class="text-sm text-slate-500">Cargando notificaciones...</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!notifStore.loading && notifStore.notifications.length === 0"
        class="flex flex-col items-center gap-3 rounded-[24px] border border-white/10 bg-white/3 py-16"
      >
        <Bell class="h-10 w-10 text-slate-600" />
        <p class="text-sm font-medium text-slate-400">Sin notificaciones</p>
        <p class="text-xs text-slate-600">No hay notificaciones para mostrar con los filtros actuales.</p>
      </div>

      <!-- Items -->
      <div
        v-for="n in notifStore.notifications"
        :key="n.id"
        :class="[
          'group flex items-start gap-4 rounded-[20px] border p-4 transition cursor-pointer',
          n.is_read
            ? 'border-white/5 bg-white/2 hover:bg-white/5'
            : 'border-white/10 bg-white/5 hover:bg-white/8'
        ]"
        @click="navigateTo(n)"
      >
        <!-- Unread dot -->
        <div class="mt-1 shrink-0">
          <div
            :class="[
              'h-2 w-2 rounded-full',
              n.is_read ? 'bg-transparent' : 'bg-violet-500'
            ]"
          />
        </div>

        <!-- Type icon -->
        <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', typeBg(n.type), typeColor(n.type)]">
          {{ typeIcon(n.type) }}
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p :class="['text-sm font-medium leading-tight', n.is_read ? 'text-slate-300' : 'text-white']">
                {{ n.title }}
              </p>
              <p v-if="n.body" class="mt-1 text-xs leading-relaxed text-slate-500">{{ n.body }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                {{ categoryLabel(n.category) }}
              </span>
              <span class="text-[11px] text-slate-600">{{ timeAgo(n.created_at) }}</span>
            </div>
          </div>
          <p
            v-if="n.action_url"
            class="mt-1 text-[11px] text-violet-400 opacity-0 transition group-hover:opacity-100"
          >
            {{ n.action_url }} →
          </p>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 flex-col items-end gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            v-if="!n.is_read"
            @click.stop="onMarkRead(n)"
            class="rounded-xl p-1.5 text-slate-600 transition hover:bg-white/10 hover:text-violet-400"
            title="Marcar como leída"
          >
            <CheckCheck class="h-3.5 w-3.5" />
          </button>
          <button
            @click.stop="onDismiss(n.id)"
            class="rounded-xl p-1.5 text-slate-600 transition hover:bg-white/10 hover:text-rose-400"
            title="Eliminar"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center pt-2">
        <button
          @click="loadMore"
          :disabled="notifStore.loading"
          class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <ChevronDown v-if="!notifStore.loading" class="h-4 w-4" />
          <span>{{ notifStore.loading ? 'Cargando...' : 'Cargar más' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.bg-white\/2  { background-color: rgba(255,255,255,0.02); }
.bg-white\/3  { background-color: rgba(255,255,255,0.03); }
.bg-white\/8  { background-color: rgba(255,255,255,0.08); }
</style>
