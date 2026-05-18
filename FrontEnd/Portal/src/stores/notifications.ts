import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../utils/axios';

export interface Notification {
  id: number;
  user_id: number;
  company_id: number | null;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'users' | 'subscriptions' | 'requests' | 'billing' | 'modules';
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: number;
  categories: {
    system: boolean;
    users: boolean;
    subscriptions: boolean;
    requests: boolean;
    billing: boolean;
    modules: boolean;
  };
  show_toast: boolean;
  updated_at: string | null;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications   = ref<Notification[]>([]);
  const unreadCount     = ref(0);
  const total           = ref(0);
  const page            = ref(1);
  const limit           = ref(20);
  const loading         = ref(false);
  const preferences     = ref<NotificationPreferences | null>(null);

  // Última conteo conocido — para detectar incremento y disparar toast
  const previousUnreadCount = ref(0);
  const toastQueue = ref<Notification[]>([]);

  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  const hasUnread = computed(() => unreadCount.value > 0);

  // ── Fetch lista paginada ──────────────────────────────────────────────────
  async function fetchNotifications(opts: {
    reset?: boolean;
    unreadOnly?: boolean;
    category?: string;
  } = {}) {
    try {
      loading.value = true;
      if (opts.reset) {
        page.value = 1;
        notifications.value = [];
      }

      const params: Record<string, string | number> = {
        page:  page.value,
        limit: limit.value,
      };
      if (opts.unreadOnly) params.unread_only = 'true';
      if (opts.category)   params.category    = opts.category;

      const { data } = await api.get('/notifications', { params });
      const incoming: Notification[] = data.notifications ?? [];

      if (opts.reset) {
        notifications.value = incoming;
      } else {
        notifications.value.push(...incoming);
      }
      total.value = data.total ?? 0;
    } catch (err) {
      console.error('[notifications] fetchNotifications error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (notifications.value.length >= total.value) return;
    page.value++;
    await fetchNotifications();
  }

  // ── Fetch unread count ────────────────────────────────────────────────────
  async function fetchUnreadCount() {
    try {
      const { data } = await api.get('/notifications/unread-count');
      const newCount: number = data.count ?? 0;

      // Detectar incremento para encolar toasts
      if (newCount > previousUnreadCount.value && previousUnreadCount.value >= 0) {
        const diff = newCount - previousUnreadCount.value;
        if (diff > 0 && preferences.value?.show_toast) {
          // Obtener las últimas notificaciones no leídas para el toast
          try {
            const { data: fresh } = await api.get('/notifications', {
              params: { unread_only: 'true', limit: diff, page: 1 }
            });
            const items: Notification[] = fresh.notifications ?? [];
            toastQueue.value.push(...items.slice(0, 3));
          } catch { /* non-critical */ }
        }
      }

      previousUnreadCount.value = newCount;
      unreadCount.value = newCount;
    } catch (err) {
      console.error('[notifications] fetchUnreadCount error:', err);
    }
  }

  // ── Mark single as read ───────────────────────────────────────────────────
  async function markRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`);
      const n = notifications.value.find(n => n.id === id);
      if (n && !n.is_read) {
        n.is_read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (err) {
      console.error('[notifications] markRead error:', err);
    }
  }

  // ── Mark all as read ──────────────────────────────────────────────────────
  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      notifications.value.forEach(n => { n.is_read = true; });
      unreadCount.value = 0;
      previousUnreadCount.value = 0;
    } catch (err) {
      console.error('[notifications] markAllRead error:', err);
    }
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────
  async function dismiss(id: number) {
    try {
      await api.delete(`/notifications/${id}`);
      const idx = notifications.value.findIndex(n => n.id === id);
      if (idx !== -1) {
        const removed = notifications.value[idx];
        notifications.value.splice(idx, 1);
        if (!removed.is_read) {
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
        total.value = Math.max(0, total.value - 1);
      }
    } catch (err) {
      console.error('[notifications] dismiss error:', err);
    }
  }

  // ── Preferences ───────────────────────────────────────────────────────────
  async function fetchPreferences() {
    try {
      const { data } = await api.get('/notifications/preferences');
      preferences.value = data;
    } catch (err) {
      console.error('[notifications] fetchPreferences error:', err);
    }
  }

  async function savePreferences(prefs: Partial<NotificationPreferences>) {
    try {
      const { data } = await api.put('/notifications/preferences', prefs);
      preferences.value = data;
    } catch (err) {
      console.error('[notifications] savePreferences error:', err);
      throw err;
    }
  }

  // ── Toast queue helpers ───────────────────────────────────────────────────
  function shiftToast(): Notification | null {
    if (toastQueue.value.length === 0) return null;
    return toastQueue.value.shift() ?? null;
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  function startPolling(intervalMs = 60_000) {
    if (pollingTimer !== null) return;
    fetchUnreadCount(); // fetch inmediato
    pollingTimer = setInterval(fetchUnreadCount, intervalMs);
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    stopPolling();
    notifications.value    = [];
    unreadCount.value      = 0;
    previousUnreadCount.value = 0;
    total.value            = 0;
    page.value             = 1;
    preferences.value      = null;
    toastQueue.value       = [];
  }

  return {
    notifications,
    unreadCount,
    total,
    page,
    limit,
    loading,
    preferences,
    toastQueue,
    hasUnread,
    fetchNotifications,
    loadMore,
    fetchUnreadCount,
    markRead,
    markAllRead,
    dismiss,
    fetchPreferences,
    savePreferences,
    shiftToast,
    startPolling,
    stopPolling,
    reset,
  };
});
