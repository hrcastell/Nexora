<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, Check, CheckCheck, X } from 'lucide-vue-next';
import { useNotificationsStore } from '../stores/notifications';
import type { Notification } from '../stores/notifications';

const router = useRouter();
const notifStore = useNotificationsStore();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const bellButtonRef = ref<HTMLElement | null>(null);

const dropdownStyle = computed(() => {
  if (!bellButtonRef.value) return {};
  const rect = bellButtonRef.value.getBoundingClientRect();
  return {
    top:   `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  };
});

const recentNotifications = computed<Notification[]>(() =>
  notifStore.notifications.slice(0, 5)
);

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    notifStore.fetchNotifications({ reset: true });
  }
}

function close() {
  isOpen.value = false;
}

function handleOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutsideClick));

async function onMarkAllRead() {
  await notifStore.markAllRead();
}

async function onMarkRead(id: number) {
  await notifStore.markRead(id);
}

async function onDismiss(id: number) {
  await notifStore.dismiss(id);
}

function navigateTo(n: Notification) {
  if (!n.is_read) notifStore.markRead(n.id);
  close();
  if (n.action_url) router.push(n.action_url);
}

function goToCenter() {
  close();
  router.push('/admin/notifications');
}

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Bell button -->
    <button
      ref="bellButtonRef"
      @click="toggle"
      class="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
      :title="'Notificaciones'"
    >
      <Bell class="h-5 w-5" />
      <!-- Badge -->
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg"
      >
        {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel — teleported to body to escape parent stacking contexts -->
    <Teleport to="body">
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        ref="dropdownPanelRef"
        class="fixed z-[200] w-80 rounded-[24px] border border-white/10 bg-[#0b1326]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
        :style="dropdownStyle"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div class="flex items-center gap-2">
            <Bell class="h-4 w-4 text-violet-400" />
            <span class="text-sm font-semibold text-white">Notificaciones</span>
            <span
              v-if="notifStore.unreadCount > 0"
              class="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300"
            >
              {{ notifStore.unreadCount }} sin leer
            </span>
          </div>
          <button
            v-if="notifStore.unreadCount > 0"
            @click="onMarkAllRead"
            class="flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            title="Marcar todas como leídas"
          >
            <CheckCheck class="h-3.5 w-3.5" />
            Todas leídas
          </button>
        </div>

        <!-- Notifications list -->
        <div class="max-h-72 overflow-y-auto custom-scrollbar">
          <div v-if="notifStore.loading" class="flex items-center justify-center py-8">
            <span class="text-xs text-slate-500">Cargando...</span>
          </div>

          <div v-else-if="recentNotifications.length === 0" class="flex flex-col items-center py-8 gap-2">
            <Bell class="h-8 w-8 text-slate-600" />
            <span class="text-xs text-slate-500">Sin notificaciones</span>
          </div>

          <div v-else>
            <div
              v-for="n in recentNotifications"
              :key="n.id"
              :class="[
                'group flex cursor-pointer items-start gap-3 border-b border-white/5 px-4 py-3 transition',
                n.is_read ? 'opacity-60 hover:opacity-100' : 'bg-white/3',
                'hover:bg-white/5'
              ]"
              @click="navigateTo(n)"
            >
              <!-- Type icon -->
              <div :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold', typeBg(n.type), typeColor(n.type)]">
                {{ typeIcon(n.type) }}
              </div>

              <!-- Content -->
              <div class="min-w-0 flex-1">
                <p :class="['text-xs font-medium leading-tight', n.is_read ? 'text-slate-300' : 'text-white']">
                  {{ n.title }}
                </p>
                <p v-if="n.body" class="mt-0.5 truncate text-[11px] text-slate-500">{{ n.body }}</p>
                <p class="mt-1 text-[10px] text-slate-600">{{ timeAgo(n.created_at) }}</p>
              </div>

              <!-- Actions -->
              <div class="flex shrink-0 flex-col items-end gap-1">
                <button
                  v-if="!n.is_read"
                  @click.stop="onMarkRead(n.id)"
                  class="rounded-lg p-1 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-violet-400"
                  title="Marcar como leída"
                >
                  <Check class="h-3 w-3" />
                </button>
                <button
                  @click.stop="onDismiss(n.id)"
                  class="rounded-lg p-1 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-rose-400"
                  title="Eliminar"
                >
                  <X class="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-white/10 px-4 py-3">
          <button
            @click="goToCenter"
            class="w-full rounded-2xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Ver todas las notificaciones →
          </button>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148,163,184,0.2); border-radius: 2px; }

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.bg-white\/3 { background-color: rgba(255,255,255,0.03); }
</style>
