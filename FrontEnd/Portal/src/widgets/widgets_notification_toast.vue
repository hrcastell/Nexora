<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { X } from 'lucide-vue-next';
import { useNotificationsStore } from '../stores/notifications';
import type { Notification } from '../stores/notifications';

const router = useRouter();
const notifStore = useNotificationsStore();

interface ActiveToast {
  notification: Notification;
  timerId: ReturnType<typeof setTimeout>;
}

const activeToasts = ref<ActiveToast[]>([]);

function removeToast(id: number) {
  const idx = activeToasts.value.findIndex(t => t.notification.id === id);
  if (idx !== -1) {
    clearTimeout(activeToasts.value[idx].timerId);
    activeToasts.value.splice(idx, 1);
  }
}

function addToast(n: Notification) {
  const timerId = setTimeout(() => removeToast(n.id), 5000);
  activeToasts.value.push({ notification: n, timerId });
}

function handleClick(t: ActiveToast) {
  removeToast(t.notification.id);
  notifStore.markRead(t.notification.id);
  if (t.notification.action_url) {
    router.push(t.notification.action_url);
  }
}

// Watch the toast queue and drain it
watch(
  () => notifStore.toastQueue.length,
  (len) => {
    if (len > 0) {
      const n = notifStore.shiftToast();
      if (n) addToast(n);
    }
  }
);

onBeforeUnmount(() => {
  activeToasts.value.forEach(t => clearTimeout(t.timerId));
});

function typeColor(type: Notification['type']): string {
  switch (type) {
    case 'success': return 'border-emerald-500/30 bg-emerald-400/10';
    case 'warning': return 'border-amber-500/30 bg-amber-400/10';
    case 'error':   return 'border-rose-500/30 bg-rose-400/10';
    default:        return 'border-violet-500/30 bg-violet-400/10';
  }
}

function typeIconColor(type: Notification['type']): string {
  switch (type) {
    case 'success': return 'text-emerald-400';
    case 'warning': return 'text-amber-400';
    case 'error':   return 'text-rose-400';
    default:        return 'text-violet-400';
  }
}

function typeIconChar(type: Notification['type']): string {
  switch (type) {
    case 'success': return '✓';
    case 'warning': return '⚠';
    case 'error':   return '✕';
    default:        return 'ℹ';
  }
}
</script>

<template>
  <!-- Fixed container bottom-right -->
  <div class="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-80">
    <TransitionGroup name="toast">
      <div
        v-for="t in activeToasts"
        :key="t.notification.id"
        :class="[
          'pointer-events-auto flex cursor-pointer items-start gap-3 rounded-[20px] border p-4',
          'shadow-2xl shadow-black/30 backdrop-blur-xl bg-[#0b1326]/95',
          typeColor(t.notification.type)
        ]"
        @click="handleClick(t)"
      >
        <!-- Icon -->
        <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold', typeIconColor(t.notification.type)]">
          {{ typeIconChar(t.notification.type) }}
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-white leading-tight">{{ t.notification.title }}</p>
          <p v-if="t.notification.body" class="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{{ t.notification.body }}</p>
        </div>

        <!-- Close -->
        <button
          @click.stop="removeToast(t.notification.id)"
          class="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.toast-move {
  transition: transform 0.25s ease;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
