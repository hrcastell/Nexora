import { ref } from 'vue';
import type { ToastItem, ToastType } from '../components/AppToast.vue';

export function useToast() {
  const toasts = ref<ToastItem[]>([]);
  let nextId = 0;

  function triggerToast(title: string, message: string, type: ToastType = 'info') {
    toasts.value.push({ id: nextId++, type, title, message });
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return { toasts, triggerToast, removeToast };
}
