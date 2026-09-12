<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowRight, Ban, CalendarClock, Car, CheckCircle2, Clock3, Eye,
  FileText, Loader2, LogIn, Mail, MessageCircle, Pencil, Phone, Smartphone, User, UserX, X,
} from 'lucide-vue-next';
import type { Appointment } from '../types/garage';
import { toDate } from '../components/agenda/agendaLayout';
import widgets_garage_appointment_status_badge from './widgets_garage_appointment_status_badge.vue';

type AppointmentAction = 'confirm' | 'arrive' | 'no_show' | 'cancel' | 'edit' | 'convert';

const props = defineProps<{
  modelValue: boolean;
  appointment: Appointment | null;
  canEdit?: boolean;
  canConvert?: boolean;
  actionLoading?: AppointmentAction | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'action', action: AppointmentAction): void;
}>();

const activeStatuses = ['scheduled', 'confirmed', 'rescheduled'];
const canConfirm = computed(() => !!props.canEdit && !!props.appointment && ['scheduled', 'rescheduled'].includes(props.appointment.status));
const canArrive = computed(() => !!props.canEdit && !!props.appointment && activeStatuses.includes(props.appointment.status));
const canNoShow = computed(() => !!props.canEdit && !!props.appointment && activeStatuses.includes(props.appointment.status));
const canCancel = computed(() => !!props.canEdit && !!props.appointment && activeStatuses.includes(props.appointment.status));
const canModify = computed(() => !!props.canEdit && !!props.appointment && !['cancelled', 'no_show', 'converted_to_work_order'].includes(props.appointment.status));
const canCreateWorkOrder = computed(() => !!props.canConvert && !!props.appointment && ['scheduled', 'confirmed', 'arrived'].includes(props.appointment.status));
const hasActions = computed(() => canModify.value || canConfirm.value || canArrive.value || canNoShow.value || canCancel.value);

const fixedPhone = computed(() => props.appointment?.customer_phone?.trim() || '');
const mobilePhone = computed(() => props.appointment?.customer_mobile?.trim() || '');
const hasPhone = computed(() => !!fixedPhone.value || !!mobilePhone.value);
const whatsappUrl = computed(() => {
  const digits = mobilePhone.value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
});

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
      <section class="flex max-h-[92vh] w-full min-w-0 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border shadow-2xl sm:max-w-2xl nxr-card" role="dialog" aria-modal="true" aria-labelledby="appointment-summary-title">
        <header class="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6" :style="{ borderColor: 'var(--nexora-card-border)' }">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-[0.18em] nxr-text-muted">{{ appointment.appointment_number }}</p>
            <h2 id="appointment-summary-title" class="mt-1 text-xl font-semibold nxr-text">Resumen de la cita</h2>
          </div>
          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <widgets_garage_appointment_status_badge :status="appointment.status" />
            <button type="button" class="rounded-xl p-2 nxr-text-muted transition hover:bg-white/10 hover:text-[var(--nexora-text-color)]" aria-label="Cerrar resumen" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>
        </header>

        <div class="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-2xl border p-4 sm:col-span-2" :style="{ borderColor: 'var(--nexora-card-border)' }">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-500"><User class="h-5 w-5" /></div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs nxr-text-muted">Persona agendada</p>
                  <p class="mt-0.5 truncate text-base font-semibold nxr-text">{{ appointment.customer_name || 'Sin cliente asociado' }}</p>
                  <div class="mt-3">
                    <a v-if="appointment.customer_email" :href="`mailto:${appointment.customer_email}`" class="flex min-w-0 items-center gap-2 text-sm nxr-text-muted hover:text-[var(--nexora-primary)]">
                      <Mail class="h-4 w-4 shrink-0" /><span class="truncate">{{ appointment.customer_email }}</span>
                    </a>
                    <span v-else class="flex items-center gap-2 text-sm nxr-text-soft"><Mail class="h-4 w-4" />Sin correo registrado</span>
                  </div>
                  <div v-if="hasPhone" class="mt-3 space-y-2">
                    <div v-if="fixedPhone" class="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--nexora-card-border)' }">
                      <div class="flex min-w-0 items-center gap-2">
                        <Phone class="h-4 w-4 shrink-0 nxr-text-accent" />
                        <div class="min-w-0"><p class="text-xs nxr-text-muted">Teléfono fijo</p><p class="truncate text-sm font-medium nxr-text">{{ fixedPhone }}</p></div>
                      </div>
                      <a :href="`tel:${fixedPhone}`" class="nxr-btn nxr-btn-secondary justify-center !px-3 !py-2 text-xs"><Phone class="h-4 w-4" />Llamar</a>
                    </div>
                    <div v-if="mobilePhone" class="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--nexora-card-border)' }">
                      <div class="flex min-w-0 items-center gap-2">
                        <Smartphone class="h-4 w-4 shrink-0 nxr-text-accent" />
                        <div class="min-w-0"><p class="text-xs nxr-text-muted">Teléfono móvil</p><p class="truncate text-sm font-medium nxr-text">{{ mobilePhone }}</p></div>
                      </div>
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

            <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
              <div class="flex items-start gap-3">
                <CalendarClock class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
                <div><p class="text-xs nxr-text-muted">Inicio</p><p class="mt-1 text-sm font-medium nxr-text">{{ formatDateTime(appointment.scheduled_start) }}</p></div>
              </div>
            </article>
            <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
              <div class="flex items-start gap-3">
                <Clock3 class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
                <div><p class="text-xs nxr-text-muted">Término</p><p class="mt-1 text-sm font-medium nxr-text">{{ formatDateTime(appointment.scheduled_end) }}</p></div>
              </div>
            </article>
          </div>

          <article class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
            <div class="flex items-start gap-3">
              <FileText class="mt-0.5 h-5 w-5 shrink-0 nxr-text-accent" />
              <div class="min-w-0">
                <p class="text-xs nxr-text-muted">Razón o motivo de la cita</p>
                <p class="mt-1 whitespace-pre-wrap text-sm font-medium nxr-text">{{ appointment.requested_service_summary || appointment.reported_issue || 'Sin motivo registrado' }}</p>
                <p v-if="appointment.requested_service_summary && appointment.reported_issue" class="mt-2 whitespace-pre-wrap text-xs nxr-text-muted">Problema reportado: {{ appointment.reported_issue }}</p>
              </div>
            </div>
          </article>

          <article v-if="appointment.plate || appointment.brand || appointment.model" class="rounded-2xl border p-4" :style="{ borderColor: 'var(--nexora-card-border)' }">
            <div class="flex items-center gap-3"><Car class="h-5 w-5 nxr-text-accent" /><div><p class="text-xs nxr-text-muted">Vehículo</p><p class="mt-1 text-sm font-medium nxr-text">{{ [appointment.plate, appointment.brand, appointment.model].filter(Boolean).join(' · ') }}</p></div></div>
          </article>

          <section v-if="hasActions" aria-labelledby="appointment-actions-title">
            <div class="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 id="appointment-actions-title" class="text-sm font-semibold nxr-text">Actualizar estado</h3><p class="mt-0.5 text-xs nxr-text-muted">Selecciona lo que ocurrió con esta cita.</p></div>
              <button v-if="canModify" type="button" class="nxr-btn nxr-btn-secondary justify-center !px-3 !py-2 text-xs sm:self-auto" :disabled="!!actionLoading" @click="emit('action', 'edit')"><Pencil class="h-4 w-4" />Editar datos</button>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button v-if="canConfirm" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'confirm')"><Loader2 v-if="actionLoading === 'confirm'" class="h-4 w-4 animate-spin" /><CheckCircle2 v-else class="h-4 w-4 text-cyan-500" />Confirmar</button>
              <button v-if="canArrive" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'arrive')"><Loader2 v-if="actionLoading === 'arrive'" class="h-4 w-4 animate-spin" /><LogIn v-else class="h-4 w-4 text-emerald-500" />Cliente llegó</button>
              <button v-if="canNoShow" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'no_show')"><Loader2 v-if="actionLoading === 'no_show'" class="h-4 w-4 animate-spin" /><UserX v-else class="h-4 w-4 text-amber-500" />No se presentó</button>
              <button v-if="canCancel" type="button" class="nxr-btn nxr-btn-secondary flex-col !gap-1 !py-3 text-xs" :disabled="!!actionLoading" @click="emit('action', 'cancel')"><Loader2 v-if="actionLoading === 'cancel'" class="h-4 w-4 animate-spin" /><Ban v-else class="h-4 w-4 text-rose-500" />Cancelar cita</button>
            </div>
          </section>
        </div>

        <footer class="grid grid-cols-1 gap-2 border-t px-5 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-6" :style="{ borderColor: 'var(--nexora-card-border)' }">
          <button type="button" class="nxr-btn nxr-btn-secondary justify-center" :disabled="!!actionLoading" @click="close"><Eye class="h-4 w-4" />Cerrar</button>
          <button v-if="canCreateWorkOrder" type="button" class="nxr-btn nxr-btn-primary justify-center" :disabled="!!actionLoading" @click="emit('action', 'convert')"><ArrowRight class="h-4 w-4" />Crear orden de trabajo</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
