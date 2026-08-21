import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity
const WARNING_BEFORE_MS = 60 * 1000; // warn 1 minute before auto-logout
const ACTIVITY_THROTTLE_MS = 5000; // don't reset timers more than once per 5s
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;

// Singleton: App.vue mounts once, so timers/listeners must not be duplicated
// across multiple composable calls.
const showWarning = ref(false);
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let warningTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityAt = 0;
let listening = false;

function clearTimers() {
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);
  idleTimer = null;
  warningTimer = null;
}

export function useIdleLogout() {
  const authStore = useAuthStore();
  const router = useRouter();

  function logoutForIdle() {
    clearTimers();
    showWarning.value = false;
    authStore.logout();
    router.push({ path: '/login', query: { reason: 'idle' } });
  }

  function scheduleTimers() {
    clearTimers();
    showWarning.value = false;
    warningTimer = setTimeout(() => {
      showWarning.value = true;
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    idleTimer = setTimeout(logoutForIdle, IDLE_TIMEOUT_MS);
  }

  function handleActivity() {
    const now = Date.now();
    if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
    lastActivityAt = now;
    scheduleTimers();
  }

  function startListening() {
    if (listening) return;
    listening = true;
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    scheduleTimers();
  }

  function stopListening() {
    if (!listening) return;
    listening = false;
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
    clearTimers();
    showWarning.value = false;
  }

  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) startListening();
    else stopListening();
  }, { immediate: true });

  function stayConnected() {
    lastActivityAt = Date.now();
    scheduleTimers();
  }

  return { showWarning, stayConnected };
}
