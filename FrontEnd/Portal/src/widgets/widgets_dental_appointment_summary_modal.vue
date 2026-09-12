<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowRight, Ban, CalendarClock, CheckCircle2, Clock3, Eye, FileText,
  LogIn, Mail, MessageCircle, Pencil, Phone, Smartphone, Stethoscope, User, UserX, X,
} from 'lucide-vue-next';
import type { DentalAppointment } from '../types/dental';
import { toDate } from '../components/agenda/agendaLayout';

type DentalAppointmentAction = 'confirm' | 'check_in' | 'no_show' | 'cancel' | 'edit' | 'convert';

const props = defineProps<{
  modelValue: boolean;
  appointment: DentalAppointment | null;
  canEdit?: boolean;
  canConvert?: boolean;
  actionLoading?: DentalAppointmentAction | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'action', action: DentalAppointmentAction): void;
}>();

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programada', color: 'bg-blue-500/20 text-blue-400' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400' },
  checked_in: { label: 'Presente', color: 'bg-cyan-500/20 text-cyan-400' },
  completed: { label: 'Completada', color: 'bg-white/10 nxr-text-muted' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
  no_show: { label: 'No asistió', color: 'bg-orange-500/20 text-orange-400' },
  rescheduled: { label: 'Reprogramada', color: 'bg-purple-500/20 text-purple-400' },
};

const activeStatuses = ['scheduled', 'confirmed', 'rescheduled'];
const canConfirm = computed(() => !!props.canEdit && !!props.appointment && ['scheduled', 'rescheduled'].includes(props.appointment.status));
const canCheckIn = computed(() => !!props.canEdit && props.appointment?.status === 'confirmed');
const canNoShow = computed(() => !!props.canEdit && !!props.appointment && activeStatuses.includes(props.appointment.status));
const canCancel = computed(() => !!props.canEdit && !!props.appointment && activeStatuses.includes(props.appointment.status));
const canModify = computed(() => !!props.canEdit && !!props.appointment && !['completed', 'cancelled', 'no_show'].includes(props.appointment.status));
const canCreateConsultation = computed(() => !!props.canConvert && !!props.appointment && ['scheduled', 'confirmed', 'checked_in'].includes(props.appointment.status));
const hasActions = computed(() => canModify.value || canConfirm.value || canCheckIn.value || canNoShow.value || canCancel.value);

const patientName = computed(() => {
  const customer = props.appointment?.customer;
  return (customer as any)?.full_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Sin paciente asociado';
});
const fixedPhone = computed(() => props.appointment?.customer?.phone?.trim() || '');
const mobilePhone = computed(() => props.appointment?.customer?.mobile?.trim() || '');
const hasPhone = computed(() => !!fixedPhone.value || !!mobilePhone.value);
const whatsappUrl = computed(() => {
  const digits = mobilePhone.value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
});
const statusConfig = computed(() => STATUS_CONFIG[props.appointment?.status || ''] || { label: props.appointment?.status || '', color: 'bg-white/10 nxr-text-muted' });

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin definir';
  return toDate(value).toLocaleString('es-CL', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function close() {
  if (!props.actionLoading) emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue && appointment" class="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6" @click.self="close">
      <section class="flex max-h-[92vh] w-full min-w-0 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border shadow-2xl sm:max-w-2xl nxr-card" role="dialog" aria-modal="true" aria-labelledby="dental-appointment-summary-title">
        <header class="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6" :style="{ borderColor: 'var(--nexora-card-border)' }">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-[0.18em] nxr-text-muted">Cita dental #{{ appointment.id }}</p>
            <h2 id="dental-appointment-summary-title" class="mt-1 text-xl font-semibold nxr-text">Resumen de la cita</h2>
          </div>
          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" :class="statusConfig.color">{{ statusConfig.label }}</span>
            <button type="button" class="rounded-xl p-2 nxr-text-muted transition hover:bg-white/10 hover:text-[var(--nexora-text-color)]" aria-label="Cerrar resumen" @click="close"><X class="h-5 w-5" /></button>
          </div>
        </header>

        <div class="space-y-5 overflow-y-auto p-5 sm:p-6">
          <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-500"><User class="h-5 w-5" /></div>
              <div class="min-w-0 flex-1">
                <p class="text-xs nxr-text-muted">Paciente</p>
                <p class="mt-0.5 truncate text-base font-semibold nxr-text">{{ patientName }}</p>
                <div class="mt-3">
                  <a v-if="appointment.customer?.email" :href="`mailto:${appointment.customer.email}`" class="flex min-w-0 items-center gap-2 text-sm nxr-text-muted hover:text-[var(--nexora-primary)]"><Mail class="h-4 w-4 shrink-0" /><span class="truncate">{{ appointment.customer.email }}</span></a>
                  <span v-else class="flex items-center gap-2 text-sm nxr-text-soft"><Mail class="h-4 w-4" />Sin correo registrado</span>
                </div>
                <div v-if="hasPhone" class="mt-3 space-y-2">
                  <div v-if="fixedPhone" class="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--nexora-card-border)' }">
                    <div class="flex min-w-0 items-center gap-2"><Phone class="h-4 w-4 shrink-0 nxr-text-accent" /><div class="min-w-0"><p class="text-xs nxr-text-muted">Teléfono fijo</p><p class="truncate text-sm font-medium nxr-text">{{ fixedPhone }}</p></div></div>
                    <a :href="`tel:${fixedPhone}`" class="nxr-btn nxr-btn-secondary justify-center !px-3 !py-2 text-xs"><Phone class="h-4 w-4" />Llamar</a>
                  </div>
                  <div v-if="mobilePhone" class="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--nexora-card-border)' }">
                    <div class="flex min-w-0 items-center gap-2"><Smartphone class="h-4 w-4 shrink-0 nxr-text-accent" /><div class="min-w-0"><p class="text-xs nxr-text-muted">Teléfono móvil</p><p class="truncate text-sm font-medium nxr-text">{{ mobilePhone }}</p></div></div>
                    <div class="grid grid-cols-2 gap-2 sm:flex">
                      <a :href="`tel:${mobilePhone}`" class="nxr-btn nxr-btn-secondary justify-center !px-3 !py-2 text-xs"><Phone class="h-4 w-4" />Llamar</a>
                      <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer" class="nxr-btn justify-center !bg-emerald-500 !px-3 !py-2 text-xs !text-white hover:!bg-emerald-600"><MessageCircle class="h-4 w-4" />WhatsApp</a>
                    </div>
                  </div>
                </div>
                <p v-else class="mt-3 flex items-center gap-2 text-sm nxr-text-soft"><Phone class="h-4 w-4" />Sin teléfonos registrados</p>
              </div>
            </div>
          </article>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }"><div class="flex items-start gap-3"><CalendarClock class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" /><div><p class="text-xs nxr-text-muted">Inicio</p><p class="mt-1 text-sm font-medium nxr-text">{{ formatDateTime(appointment.scheduled_start) }}</p></div></div></article>
            <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }"><div class="flex items-start gap-3"><Clock3 class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" /><div><p class="text-xs nxr-text-muted">Término</p><p class="mt-1 text-sm font-medium nxr-text">{{ formatDateTime(appointment.scheduled_end) }}</p></div></div></article>
          </div>

          <article v-if="appointment.treatment?.name" class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }"><div class="flex items-start gap-3"><Stethoscope class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" /><div><p class="text-xs nxr-text-muted">Tratamiento</p><p class="mt-1 text-sm font-medium nxr-text">{{ appointment.treatment.name }}</p></div></div></article>
          <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }"><div class="flex items-start gap-3"><FileText class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" /><div class="min-w-0"><p class="text-xs nxr-text-muted">Razón o motivo de la cita</p><p class="mt-1 whitespace-pre-wrap text-sm font-medium nxr-text">{{ appointment.reason || 'Sin motivo registrado' }}</p><p v-if="appointment.notes" class="mt-2 whitespace-pre-wrap text-xs nxr-text-muted">Notas: {{ appointment.notes }}</p></div></div></article>

          <section v-if="hasActions" aria-labelledby="dental-appointment-actions-title">
            <div class="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 id="dental-appointment-actions-title" class="text-sm font-semibold nxr-text">Actualizar estado</h3><p class="mt-0.5 text-xs nxr-text-muted">Selecciona lo que ocurrió con esta cita.</p></div><button v-if="canModify" type="button" class="nxr-btn nxr-btn-secondary justify-center !px-3 !py-2 text-xs" :disabled="!!actionLoading" @click="emit('action', 'edit')"><Pencil class="h-4 w-4" />Editar datos</button></div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button v-if="canConfirm" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'confirm')"><CheckCircle2 class="h-4 w-4 text-green-500" />Confirmar</button>
              <button v-if="canCheckIn" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'check_in')"><LogIn class="h-4 w-4 text-cyan-500" />Paciente presente</button>
              <button v-if="canNoShow" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'no_show')"><UserX class="h-4 w-4 text-amber-500" />No asistió</button>
              <button v-if="canCancel" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'cancel')"><Ban class="h-4 w-4 text-rose-500" />Cancelar cita</button>
            </div>
          </section>
        </div>

        <footer class="grid grid-cols-1 gap-2 border-t px-5 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-6" :style="{ borderColor: 'var(--nexora-card-border)' }">
          <button type="button" class="nxr-btn nxr-btn-secondary justify-center" :disabled="!!actionLoading" @click="close"><Eye class="h-4 w-4" />Cerrar</button>
          <button v-if="canCreateConsultation" type="button" class="nxr-btn nxr-btn-primary justify-center" :disabled="!!actionLoading" @click="emit('action', 'convert')"><ArrowRight class="h-4 w-4" />Iniciar consulta</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
