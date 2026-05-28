import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import type { PermissionAction } from '../stores/menu';

export function usePermissions() {
  const authStore = useAuthStore();
  const menuStore = useMenuStore();

  const isSuperAdmin = computed(() => authStore.user?.is_super_admin === true);
  const isAdmin      = computed(() => isSuperAdmin.value || authStore.user?.role === 'admin');
  const isReadOnly   = computed(() => authStore.readOnly === true);
  const isSystemUser = computed(() => authStore.user?.is_system_user === true);

  const userRole = computed(() => authStore.user?.role ?? 'inner_user');
  const userStatus = computed(() => authStore.user?.status ?? 'activo');
  const commercialStatus = computed(() => authStore.currentCompany?.commercial_status ?? 'activa');

  const canManageUsers    = computed(() => isSuperAdmin.value || (canDo('users', 'can_admin') && !isReadOnly.value));
  const canManageProfiles = computed(() => isSuperAdmin.value || (canDo('profiles', 'can_admin') && !isReadOnly.value));
  const canManageModules  = computed(() => isSuperAdmin.value && !isReadOnly.value);
  const canManageCommercial = computed(() => isSuperAdmin.value);

  // ── Module/transaction helpers ─────────────────────────────────
  // Delegan al useMenuStore cuando está cargado; super_admin siempre TRUE.
  const hasModule = (code: string): boolean => {
    if (isSuperAdmin.value) return true;
    return menuStore.hasModule(code);
  };
  const hasTransaction = (route: string): boolean => {
    if (isSuperAdmin.value) return true;
    return menuStore.hasTransaction(route);
  };

  /**
   * canDo(transactionCode, action) — verifica un permiso granular por transacción.
   * - super_admin: siempre TRUE
   * - Antes de que el menu cargue: FALSE (fallback fail-closed para seguridad)
   * - Transacción no encontrada en el índice: FALSE
   *
   * Uso: canDo('users', 'can_delete'), canDo('companies', 'can_create')
   */
  const canDo = (transactionCode: string, action: PermissionAction): boolean => {
    if (isSuperAdmin.value) return true;
    if (!menuStore.loaded) return false;
    const perms = menuStore.permissionIndex.get(transactionCode);
    if (!perms) return false;
    return perms[action] === true;
  };

  const commercialAlert = computed(() => {
    const cs = commercialStatus.value;
    if (cs === 'pendiente_pago') return { type: 'warning', message: 'Tu empresa tiene un pago pendiente. Regulariza para evitar restricciones.' };
    if (cs === 'suspendida')     return { type: 'error',   message: 'Tu empresa está suspendida por deuda. Solo puedes consultar información.' };
    if (cs === 'bloqueada')      return { type: 'blocked',  message: 'Tu empresa está bloqueada. Contacta al administrador del sistema.' };
    return null;
  });

  return {
    isSuperAdmin,
    isAdmin,
    isReadOnly,
    isSystemUser,
    userRole,
    userStatus,
    commercialStatus,
    canManageUsers,
    canManageProfiles,
    canManageModules,
    canManageCommercial,
    commercialAlert,
    hasModule,
    hasTransaction,
    canDo,
  };
}
