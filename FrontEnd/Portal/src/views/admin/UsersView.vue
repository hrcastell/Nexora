<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Users, Plus, Search, Loader2, Pencil, Trash2, X, Save, ShieldAlert, ShieldCheck, UserCheck, UserX, Upload, Eye, EyeOff } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { useAuthStore } from '../../stores/auth';
import { usePermissions } from '../../composables/usePermissions';
import CompanySelector from '../../components/admin/CompanySelector.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import InfoModal from '../../components/admin/InfoModal.vue';
import AppToast, { type ToastItem, type ToastType } from '../../components/AppToast.vue';
import type { CompanyUser, Profile } from '../../types/auth';

const cfg    = useVisualConfigStore();
const auth   = useAuthStore();
const perms  = usePermissions();

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => cfg.cardBg);
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');
const modalBg     = computed(() => isLight.value ? '#ffffff' : '#0d1829');

const companyId = computed<number | null>(() => auth.currentCompany?.id ?? null);
const users     = ref<CompanyUser[]>([]);
const profiles  = ref<Profile[]>([]);
const isLoading = ref(true);

// filterCompanyId: used in the list panel (super_admin only)
const filterCompanyId   = ref<number | null>(null);
// selectedCompanyId: used in the create modal (existing logic)
interface CompanyOption { id: number; name: string; schema_name: string; }
const allCompanies = ref<CompanyOption[]>([]);
const selectedCompanyId = ref<number | null>(null);
const scopedCompanyId = computed<number | null>(() => {
  if (perms.isSuperAdmin.value) return filterCompanyId.value;
  return companyId.value;
});
const canManageScopedUsers = computed(() => !perms.isSuperAdmin.value || !!scopedCompanyId.value);
const search    = ref('');
const filterStatus = ref('');
const filterRole   = ref('');

const showModal  = ref(false);
const isEditing  = ref(false);
const isSaving   = ref(false);
const saveError  = ref('');
const showPwd    = ref(false);
const showConfirm = ref(false);

// Modals state
const showConfirmDelete = ref(false);
const userToDelete = ref<CompanyUser | null>(null);
const showInfoModal = ref(false);
const infoModalConfig = ref({ title: '', message: '', type: 'info' as 'success' | 'warning' | 'error' | 'info' });

// Toast state
const activeToast = ref<ToastItem | null>(null);
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = { id: Date.now(), title, message, type };
};

const avatarFile  = ref<File | null>(null);
const avatarPreview = ref<string>('');

const emptyForm = () => ({
  id: 0, email: '', first_name: '', last_name: '',
  phone: '', country: '', state_region: '', city: '', commune: '',
  role: 'inner_user' as CompanyUser['role'], status: 'activo' as CompanyUser['status'],
  job_title: '', access_level: 'por_modulo',
  is_company_admin: false, role_id: null as number | null,
  profile_ids: [] as number[],
  password: '', confirm_password: '',
});
const form = ref(emptyForm());

const passwordStrength = computed(() => {
  const p = form.value.password;
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)             s++;
  if (/[A-Z]/.test(p))           s++;
  if (/[0-9]/.test(p))           s++;
  if (/[^A-Za-z0-9]/.test(p))   s++;
  return s;
});
const strengthLabel = computed(() => ['', 'Debil', 'Regular', 'Buena', 'Fuerte'][passwordStrength.value]);
const strengthColor = computed(() => ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][passwordStrength.value]);

const filteredUsers = computed(() => {
  let list = users.value;
  if (filterStatus.value) list = list.filter(u => u.status === filterStatus.value);
  if (filterRole.value)   list = list.filter(u => u.role === filterRole.value);
  const q = search.value.toLowerCase();
  if (q) list = list.filter(u =>
    u.full_name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    (u.job_title ?? '').toLowerCase().includes(q)
  );
  return list;
});

const kpis = computed(() => ({
  total:     users.value.length,
  active:    users.value.filter(u => u.status === 'activo').length,
  suspended: users.value.filter(u => u.status === 'suspendido').length,
  blocked:   users.value.filter(u => u.status === 'bloqueado').length,
}));

async function loadProfilesForCompany(targetCompanyId: number | null) {
  try {
    if (perms.isSuperAdmin.value) {
      if (!targetCompanyId) {
        profiles.value = [];
        return;
      }
      const res = await api.get(`/companies/${targetCompanyId}/profiles`);
      profiles.value = Array.isArray(res.data) ? res.data : [];
      return;
    }

    const res = await api.get('/profiles');
    profiles.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    profiles.value = [];
  }
}

async function loadData() {
  isLoading.value = true;
  try {
    // super_admin with filter: show only that company's users
    // super_admin without filter: show all users globally
    // regular admin: show own company users
    let usersUrl: string;
    if (perms.isSuperAdmin.value) {
      usersUrl = filterCompanyId.value
        ? `/companies/${filterCompanyId.value}/users`
        : '/users';
    } else {
      usersUrl = companyId.value ? `/companies/${companyId.value}/users` : '/users';
    }

    const [usersRes] = await Promise.all([
      api.get(usersUrl),
      loadProfilesForCompany(scopedCompanyId.value),
    ]);
    users.value    = usersRes.data;

    // Load companies list for super_admin (modal create)
    if (perms.isSuperAdmin.value && allCompanies.value.length === 0) {
      try {
        const cRes = await api.get('/companies');
        allCompanies.value = cRes.data;
      } catch { /* silent */ }
    }
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

watch(filterCompanyId, () => loadData());
watch(selectedCompanyId, async (next) => {
  if (!showModal.value || isEditing.value || !perms.isSuperAdmin.value) return;
  await loadProfilesForCompany(next ?? null);
});

onMounted(loadData);

function openCreate() {
  isEditing.value = false;
  form.value = emptyForm();
  avatarFile.value = null;
  avatarPreview.value = '';
  saveError.value = '';
  showPwd.value = false;
  showConfirm.value = false;
  selectedCompanyId.value = perms.isSuperAdmin.value
    ? (filterCompanyId.value ?? companyId.value ?? null)
    : (companyId.value ?? null);
  void loadProfilesForCompany(perms.isSuperAdmin.value ? selectedCompanyId.value : companyId.value);
  showModal.value = true;
}

async function openEdit(u: CompanyUser) {
  if (perms.isSuperAdmin.value && !scopedCompanyId.value) {
    infoModalConfig.value = {
      title: 'Empresa requerida',
      message: 'Selecciona una empresa para editar usuarios y perfiles.',
      type: 'warning'
    };
    showInfoModal.value = true;
    return;
  }
  await loadProfilesForCompany(scopedCompanyId.value);

  isEditing.value = true;
  form.value = {
    id: u.id, email: u.email,
    first_name: u.first_name ?? '', last_name: u.last_name ?? '',
    phone: u.phone ?? '', country: u.country ?? '',
    state_region: u.state_region ?? '', city: u.city ?? '', commune: u.commune ?? '',
    role: u.role ?? 'inner_user', status: u.status ?? 'activo',
    job_title: u.job_title ?? '', access_level: u.access_level ?? 'por_modulo',
    is_company_admin: u.is_company_admin,
    role_id: u.role_id ?? null,
    profile_ids: (u.profiles ?? []).map(p => p.id),
    password: '', confirm_password: '',
  };
  avatarFile.value = null;
  avatarPreview.value = u.avatar_url ?? '';
  saveError.value = '';
  showModal.value = true;
}

function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  avatarFile.value = file;
  const reader = new FileReader();
  reader.onload = (ev) => { avatarPreview.value = ev.target?.result as string; };
  reader.readAsDataURL(file);
}

async function saveUser() {
  if (!form.value.first_name || !form.value.email) { saveError.value = 'Nombre y correo son requeridos'; return; }
  if (!isEditing.value && !form.value.password) { saveError.value = 'La contrasena es requerida'; return; }
  if (form.value.password && form.value.password !== form.value.confirm_password) { saveError.value = 'Las contrasenas no coinciden'; return; }
  if (form.value.password && passwordStrength.value < 3) { saveError.value = 'La contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial'; return; }

  isSaving.value = true; saveError.value = '';
  try {
    const cId = isEditing.value
      ? scopedCompanyId.value
      : (perms.isSuperAdmin.value
        ? (selectedCompanyId.value ?? filterCompanyId.value ?? companyId.value)
        : companyId.value);
    if (!cId) { saveError.value = 'Debe seleccionar una empresa'; isSaving.value = false; return; }

    const payload = {
      ...form.value,
      profile_ids: [...new Set(
        (form.value.profile_ids ?? [])
          .map(v => Number(v))
          .filter(v => Number.isInteger(v) && v > 0)
      )]
    };

    if (isEditing.value) {
      await api.put(`/companies/${cId}/users/${form.value.id}`, payload);
    } else {
      const res = await api.post(`/companies/${cId}/users`, payload);
      if (avatarFile.value && res.data.userId) {
        const fd = new FormData();
        fd.append('avatar', avatarFile.value);
        fd.append('userId', res.data.userId.toString());
        await api.post('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    }
    if (isEditing.value && avatarFile.value) {
      const fd = new FormData();
      fd.append('avatar', avatarFile.value);
      fd.append('userId', form.value.id.toString());
      await api.post('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    showModal.value = false;
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveError.value = err?.response?.data?.error ?? 'Error al guardar usuario';
  } finally {
    isSaving.value = false;
  }
}

async function changeStatus(u: CompanyUser, status: string) {
  if (u.is_system_user) {
    infoModalConfig.value = {
      title: 'Acción no permitida',
      message: 'No se puede cambiar el estado del usuario raíz del sistema.',
      type: 'warning'
    };
    showInfoModal.value = true;
    return;
  }
  const cId = scopedCompanyId.value;
  if (!cId) {
    infoModalConfig.value = {
      title: 'Empresa requerida',
      message: 'Selecciona una empresa para gestionar el estado del usuario.',
      type: 'warning'
    };
    showInfoModal.value = true;
    return;
  }
  try {
    await api.patch(`/companies/${cId}/users/${u.id}/status`, { status });
    u.status = status as CompanyUser['status'];
    const statusLabel = { activo: 'activado', suspendido: 'suspendido', bloqueado: 'bloqueado' }[status] ?? status;
    triggerToast('Estado actualizado', `Usuario ${statusLabel} correctamente.`, 'success');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    triggerToast('Error', err?.response?.data?.error ?? 'Error al cambiar estado', 'error');
  }
}

function openRemoveUser(u: CompanyUser) {
  if (u.is_system_user) {
    infoModalConfig.value = {
      title: 'Acción no permitida',
      message: 'No se puede desvincular al usuario raíz del sistema.',
      type: 'warning'
    };
    showInfoModal.value = true;
    return;
  }
  userToDelete.value = u;
  showConfirmDelete.value = true;
}

async function handleConfirmDelete() {
  if (!userToDelete.value) return;
  const u = userToDelete.value;
  const targetCompanyId = filterCompanyId.value ?? (perms.isSuperAdmin.value ? null : companyId.value);

  try {
    if (targetCompanyId) {
      await api.delete(`/companies/${targetCompanyId}/users/${u.id}`);
      triggerToast('Usuario desvinculado', `"${u.full_name}" fue desvinculado de la empresa.`, 'success');
    } else {
      await api.delete(`/users/${u.id}`);
      triggerToast('Usuario eliminado', `"${u.full_name}" fue eliminado permanentemente.`, 'success');
    }
    showConfirmDelete.value = false;
    userToDelete.value = null;
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    triggerToast('Error', err?.response?.data?.error ?? 'Error al eliminar usuario', 'error');
    showConfirmDelete.value = false;
  }
}

function toggleProfile(profileId: number) {
  const idx = form.value.profile_ids.indexOf(profileId);
  if (idx >= 0) {
    form.value.profile_ids.splice(idx, 1);
    return;
  }
  form.value.profile_ids.push(profileId);
}
const statusBadge = (s?: string) => {
  if (s === 'activo')     return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'suspendido') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  if (s === 'bloqueado')  return 'bg-red-500/15 text-red-300 border-red-500/25';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const roleBadge = (r?: string) => {
  if (r === 'super_admin') return 'bg-purple-500/15 text-purple-300 border-purple-500/25';
  if (r === 'admin')       return 'bg-blue-500/15 text-blue-300 border-blue-500/25';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL') : '-';
const BACKEND_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
const avatarSrc = (u: CompanyUser) => u.avatar_url
  ? (u.avatar_url.startsWith('http') ? u.avatar_url : `${BACKEND_BASE}${u.avatar_url}`)
  : null;
const initials = (u: CompanyUser) => `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || u.full_name.slice(0, 2).toUpperCase();
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <Users class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Gestion de Usuarios</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Administra usuarios, roles, perfiles y estados de acceso</p>
        </div>
      </div>
      <button v-if="perms.canManageUsers.value" @click="openCreate"
        class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary">
        <Plus class="h-4 w-4" /> Nuevo usuario
      </button>
    </div>

    <!-- Alert estado comercial -->
    <div v-if="perms.commercialAlert.value"
      class="flex items-start gap-3 rounded-2xl border px-4 py-3"
      :class="{
        'bg-amber-500/10 border-amber-500/30 text-amber-300': perms.commercialAlert.value?.type === 'warning',
        'bg-red-500/10 border-red-500/30 text-red-300': perms.commercialAlert.value?.type === 'error' || perms.commercialAlert.value?.type === 'blocked'
      }">
      <ShieldAlert class="h-4 w-4 mt-0.5 shrink-0" />
      <span class="text-sm">{{ perms.commercialAlert.value?.message }}</span>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="(val, key) in kpis" :key="key" class="rounded-2xl border p-4"
        :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <p class="text-xs uppercase tracking-wide" :style="{ color: mutedColor }">{{ { total: 'Total', active: 'Activos', suspended: 'Suspendidos', blocked: 'Bloqueados' }[key] }}</p>
        <p class="mt-1 text-2xl font-bold" :style="{ color: headerColor }">{{ val }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
      <CompanySelector
        v-model="filterCompanyId"
        placeholder="Todas las empresas"
        :show-all="true" />
      <div class="relative flex-1 min-w-[180px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" :style="{ color: mutedColor }" />
        <input v-model="search" placeholder="Buscar usuario..." class="w-full rounded-2xl border pl-9 pr-4 py-2 text-sm focus:outline-none"
          :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
      </div>
      <select v-model="filterStatus" class="rounded-2xl border px-3 py-2 text-sm focus:outline-none"
        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
        <option value="">Todos los estados</option>
        <option value="activo">Activo</option>
        <option value="suspendido">Suspendido</option>
        <option value="bloqueado">Bloqueado</option>
      </select>
      <select v-model="filterRole" class="rounded-2xl border px-3 py-2 text-sm focus:outline-none"
        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
        <option value="">Todos los roles</option>
        <option value="super_admin">Super Admin</option>
        <option value="admin">Admin</option>
        <option value="inner_user">Usuario interno</option>
        <option value="outer_user">Usuario externo</option>
      </select>
    </div>
    <p v-if="perms.isSuperAdmin.value && !filterCompanyId" class="text-xs" :style="{ color: mutedColor }">
      Vista global: para editar estado, perfil o datos de un usuario, selecciona una empresa.
    </p>

    <!-- Table -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <div v-else class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
      <div class="border-b px-5 py-3 flex items-center justify-between" :style="{ borderColor: cardBorder, backgroundColor: rowHoverBg }">
        <span class="text-sm font-medium" :style="{ color: headerColor }">{{ filteredUsers.length }} usuario{{ filteredUsers.length !== 1 ? 's' : '' }}</span>
      </div>
      <div v-if="filteredUsers.length === 0" class="p-10 text-center text-sm" :style="{ color: mutedColor }">
        No se encontraron usuarios.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="border-b" :style="{ backgroundColor: rowHoverBg, borderColor: cardBorder }">
            <tr>
              <th class="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Usuario</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Rol</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Cargo</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Perfiles</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Estado</th>
              <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Ultimo acceso</th>
              <th v-if="perms.canManageUsers.value" class="py-3 pl-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y" :style="{ borderColor: cardBorder }">
            <tr v-for="u in filteredUsers" :key="u.id" class="transition-colors group"
              @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
              @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
              <td class="py-3 pl-5 pr-3">
                <div class="flex items-center gap-3">
                  <!-- Avatar -->
                  <div class="relative shrink-0">
                    <img v-if="avatarSrc(u)" :src="avatarSrc(u)!" :alt="u.full_name" class="h-9 w-9 rounded-xl object-cover" />
                    <div v-else class="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      :style="{ background: 'linear-gradient(135deg, #243b7a, #7c3aed)' }">
                      {{ initials(u) }}
                    </div>
                    <span v-if="u.is_system_user" class="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-current flex items-center justify-center">
                      <ShieldCheck class="h-2 w-2 text-black" />
                    </span>
                  </div>
                  <div>
                    <p class="text-sm font-medium" :style="{ color: headerColor }">{{ u.full_name }}</p>
                    <p class="text-xs" :style="{ color: mutedColor }">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="text-xs rounded-full px-2 py-0.5 border" :class="roleBadge(u.role)">
                  {{ ({ super_admin: 'Super Admin', admin: 'Admin', inner_user: 'Interno', outer_user: 'Externo' } as Record<string,string>)[u.role ?? ''] ?? u.role }}
                </span>
              </td>
              <td class="px-3 py-3 text-sm" :style="{ color: mutedColor }">{{ u.job_title || '-' }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                  <span v-for="p in (u.profiles ?? []).slice(0,2)" :key="p.id"
                    class="text-xs rounded-full px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {{ p.name }}
                  </span>
                  <span v-if="(u.profiles ?? []).length > 2" class="text-xs" :style="{ color: mutedColor }">+{{ (u.profiles ?? []).length - 2 }}</span>
                  <span v-if="!(u.profiles ?? []).length" class="text-xs" :style="{ color: mutedColor }">Sin perfil</span>
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="text-xs rounded-full px-2 py-0.5 border" :class="statusBadge(u.status)">
                  {{ u.status ?? 'activo' }}
                </span>
              </td>
              <td class="px-3 py-3 text-sm" :style="{ color: mutedColor }">{{ fmtDate(u.last_login_at) }}</td>
              <td v-if="perms.canManageUsers.value" class="py-3 pl-3 pr-5 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button v-if="!u.is_system_user && u.status !== 'activo'" @click="changeStatus(u, 'activo')" class="rounded-xl p-1.5 hover:bg-emerald-500/10 transition" title="Activar"
                    :disabled="!canManageScopedUsers"
                    :class="{ 'opacity-40 cursor-not-allowed': !canManageScopedUsers }">
                    <UserCheck class="h-4 w-4 text-emerald-400" />
                  </button>
                  <button v-if="!u.is_system_user && u.status === 'activo'" @click="changeStatus(u, 'suspendido')" class="rounded-xl p-1.5 hover:bg-amber-500/10 transition" title="Suspender"
                    :disabled="!canManageScopedUsers"
                    :class="{ 'opacity-40 cursor-not-allowed': !canManageScopedUsers }">
                    <UserX class="h-4 w-4 text-amber-400" />
                  </button>
                  <button @click="openEdit(u)" class="rounded-xl p-1.5 hover:bg-white/10 transition"
                    :disabled="!canManageScopedUsers"
                    :class="{ 'opacity-40 cursor-not-allowed': !canManageScopedUsers }">
                    <Pencil class="h-4 w-4" :style="{ color: mutedColor }" />
                  </button>
                  <button v-if="!u.is_system_user" @click="openRemoveUser(u)" class="rounded-xl p-1.5 hover:bg-red-500/10 transition">
                    <Trash2 class="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Crear/Editar Usuario -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl" :style="{ backgroundColor: modalBg, borderColor: cardBorder }">
          <!-- Header -->
          <div class="flex items-center justify-between border-b p-5 shrink-0" :style="{ borderColor: cardBorder }">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-2xl nxr-nav-icon-active">
                <Users class="h-4 w-4" />
              </div>
              <h2 class="text-base font-semibold" :style="{ color: headerColor }">
                {{ isEditing ? 'Editar usuario' : 'Nuevo usuario' }}
              </h2>
            </div>
            <button @click="showModal = false" class="rounded-xl p-1.5 hover:bg-white/10 transition">
              <X class="h-5 w-5" :style="{ color: mutedColor }" />
            </button>
          </div>

          <!-- Body (scrollable) -->
          <div class="overflow-y-auto custom-scrollbar p-5 space-y-5 flex-1">
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <ShieldAlert class="h-4 w-4 shrink-0" /> {{ saveError }}
            </div>

            <!-- Company selector (super_admin only, create mode) -->
            <div v-if="perms.isSuperAdmin.value && !isEditing" class="rounded-2xl border p-4"
              :style="{ borderColor: inputBorder, backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }">
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Empresa destino *</label>
              <select v-model="selectedCompanyId" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                <option :value="null" disabled>-- Seleccionar empresa --</option>
                <option v-for="c in allCompanies" :key="c.id" :value="c.id">{{ c.name }} ({{ c.schema_name }})</option>
              </select>
              <p class="text-xs mt-1 opacity-60" :style="{ color: mutedColor }">El usuario sera vinculado a esta empresa.</p>
            </div>

            <!-- Avatar Upload -->
            <div class="flex items-center gap-5">
              <div class="relative h-20 w-20 shrink-0">
                <img v-if="avatarPreview" :src="avatarPreview" class="h-full w-full rounded-2xl object-cover" />
                <div v-else class="h-full w-full rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                  :style="{ background: 'linear-gradient(135deg, #243b7a, #7c3aed)' }">
                  {{ (form.first_name[0] ?? '') + (form.last_name[0] ?? '') }}
                </div>
              </div>
              <div>
                <p class="text-sm font-medium mb-1" :style="{ color: headerColor }">Foto de perfil</p>
                <label class="flex items-center gap-2 cursor-pointer rounded-2xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
                  :style="{ borderColor: cardBorder, color: mutedColor }">
                  <Upload class="h-3.5 w-3.5" />
                  Subir imagen
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onAvatarChange" />
                </label>
                <p class="text-xs mt-1 opacity-60" :style="{ color: mutedColor }">JPG, PNG o WebP · max 2 MB</p>
              </div>
            </div>

            <!-- Datos personales -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide mb-3" :style="{ color: mutedColor }">Datos personales</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Nombre *</label>
                  <input v-model="form.first_name" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Apellido</label>
                  <input v-model="form.last_name" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div class="col-span-2">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Correo electronico *</label>
                  <input v-model="form.email" type="email" :disabled="isEditing" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Telefono</label>
                  <input v-model="form.phone" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Pais</label>
                  <input v-model="form.country" placeholder="Chile" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Region / Estado</label>
                  <input v-model="form.state_region" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Ciudad</label>
                  <input v-model="form.city" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
              </div>
            </div>

            <!-- Acceso y rol -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide mb-3" :style="{ color: mutedColor }">Acceso y rol</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Rol del sistema</label>
                  <select v-model="form.role" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="inner_user">Usuario interno</option>
                    <option value="outer_user">Usuario externo</option>
                    <option value="admin">Administrador</option>
                    <option v-if="perms.isSuperAdmin.value" value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Estado</label>
                  <select v-model="form.status" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Cargo laboral</label>
                  <input v-model="form.job_title" placeholder="CEO, Analista..." class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Nivel de acceso</label>
                  <select v-model="form.access_level" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                    :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="por_modulo">Por modulo</option>
                    <option value="total">Acceso total</option>
                    <option value="supervision">Supervision</option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Perfiles funcionales</label>
                  <div class="flex flex-wrap gap-2">
                    <p v-if="profiles.length === 0" class="text-xs" :style="{ color: mutedColor }">
                      No hay perfiles disponibles para la empresa seleccionada.
                    </p>
                    <button v-for="p in profiles" :key="p.id"
                      type="button"
                      @click="toggleProfile(p.id)"
                      class="text-xs rounded-full px-3 py-1 border transition"
                      :class="form.profile_ids.includes(p.id)
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'border-white/10 text-slate-400 hover:bg-white/5'">
                      {{ p.name }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contrasena (solo creacion o cambio opcional) -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide mb-3" :style="{ color: mutedColor }">
                {{ isEditing ? 'Cambiar contrasena (opcional)' : 'Contrasena *' }}
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="relative">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Contrasena</label>
                  <div class="relative">
                    <input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="w-full rounded-2xl border px-3 py-2 pr-9 text-sm focus:outline-none"
                      :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                    <button type="button" @click="showPwd = !showPwd" class="absolute right-3 top-1/2 -translate-y-1/2">
                      <Eye v-if="!showPwd" class="h-4 w-4" :style="{ color: mutedColor }" />
                      <EyeOff v-else class="h-4 w-4" :style="{ color: mutedColor }" />
                    </button>
                  </div>
                  <!-- Strength bar -->
                  <div v-if="form.password" class="mt-1.5 flex items-center gap-2">
                    <div class="flex-1 h-1 rounded-full bg-white/10">
                      <div class="h-full rounded-full transition-all" :class="strengthColor" :style="{ width: `${passwordStrength * 25}%` }" />
                    </div>
                    <span class="text-xs" :style="{ color: mutedColor }">{{ strengthLabel }}</span>
                  </div>
                </div>
                <div class="relative">
                  <label class="mb-1 block text-xs font-medium" :style="{ color: mutedColor }">Confirmar contrasena</label>
                  <div class="relative">
                    <input v-model="form.confirm_password" :type="showConfirm ? 'text' : 'password'" class="w-full rounded-2xl border px-3 py-2 pr-9 text-sm focus:outline-none"
                      :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                    <button type="button" @click="showConfirm = !showConfirm" class="absolute right-3 top-1/2 -translate-y-1/2">
                      <Eye v-if="!showConfirm" class="h-4 w-4" :style="{ color: mutedColor }" />
                      <EyeOff v-else class="h-4 w-4" :style="{ color: mutedColor }" />
                    </button>
                  </div>
                  <p v-if="form.confirm_password && form.password !== form.confirm_password" class="mt-1 text-xs text-red-400">Las contrasenas no coinciden</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 border-t p-5 shrink-0" :style="{ borderColor: cardBorder }">
            <button @click="showModal = false" class="rounded-2xl border px-4 py-2 text-sm hover:bg-white/5 transition"
              :style="{ borderColor: cardBorder, color: mutedColor }">Cancelar</button>
            <button @click="saveUser" :disabled="isSaving"
              class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Modal -->
    <ConfirmActionModal
      :isOpen="showConfirmDelete"
      :title="userToDelete ? (filterCompanyId || !perms.isSuperAdmin.value ? 'Desvincular usuario' : 'Eliminar usuario') : ''"
      :message="userToDelete ? (filterCompanyId || !perms.isSuperAdmin.value ? 'Desvincular a ' + userToDelete.full_name + ' de esta empresa?' : 'Eliminar permanentemente a ' + userToDelete.full_name + ' del sistema? Esta acción no se puede deshacer.') : ''"
      confirmText="Confirmar"
      variant="danger"
      @confirmed="handleConfirmDelete"
      @cancelled="showConfirmDelete = false; userToDelete = null" />

    <!-- Info Modal -->
    <InfoModal
      :isOpen="showInfoModal"
      :title="infoModalConfig.title"
      :message="infoModalConfig.message"
      :type="infoModalConfig.type"
      @close="showInfoModal = false" />

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
          <AppToast :toast="activeToast" @close="activeToast = null" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.25);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.45);
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
}
</style>


