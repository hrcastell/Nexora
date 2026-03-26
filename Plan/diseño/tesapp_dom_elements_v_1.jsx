import React, { useEffect, useMemo, useState } from "react";

type IconProps = { className?: string };

type ToastType = "success" | "warning" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M20 7L9 18l-5-5" />
    </svg>
  );
}

function AlertIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.8L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z" />
    </svg>
  );
}

function XCircleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}

function InfoIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v5" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function SparklesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
      <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
    </svg>
  );
}

function getToastTheme(type: ToastType) {
  switch (type) {
    case "success":
      return {
        icon: CheckIcon,
        ring: "border-emerald-400/25",
        bg: "bg-emerald-400/10",
        text: "text-emerald-200",
      };
    case "warning":
      return {
        icon: AlertIcon,
        ring: "border-[#d4af37]/30",
        bg: "bg-[#d4af37]/10",
        text: "text-[#f5df9f]",
      };
    case "error":
      return {
        icon: XCircleIcon,
        ring: "border-rose-400/25",
        bg: "bg-rose-400/10",
        text: "text-rose-200",
      };
    default:
      return {
        icon: InfoIcon,
        ring: "border-violet-400/25",
        bg: "bg-violet-400/10",
        text: "text-violet-200",
      };
  }
}

function ModalShell({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,45,0.96),rgba(8,16,31,0.99))] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#d4af37]">{eyebrow}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">{children}</div>

        {footer ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const theme = getToastTheme(toast.type);
  const Icon = theme.icon;

  return (
    <div className={`w-full rounded-[24px] border ${theme.ring} bg-[#0b1326]/95 p-4 shadow-xl shadow-black/30 backdrop-blur-xl`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${theme.bg} ${theme.text}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onClose(toast.id)}
              className="rounded-xl p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TesAppDomElementsV1() {
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toastExamples = useMemo(
    () => ({
      success: {
        type: "success" as ToastType,
        title: "Acción completada",
        message: "La empresa fue asociada correctamente al usuario seleccionado.",
      },
      warning: {
        type: "warning" as ToastType,
        title: "Revisión pendiente",
        message: "Su solicitud fue recibida y será evaluada por un super_admin.",
      },
      error: {
        type: "error" as ToastType,
        title: "No fue posible continuar",
        message: "La clave no corresponde al esquema elegido. Verifique e intente nuevamente.",
      },
      info: {
        type: "info" as ToastType,
        title: "Cambio de contexto",
        message: "Se cambió la empresa activa y se actualizaron los permisos de sesión.",
      },
    }),
    []
  );

  const pushToast = (toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 4));
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        removeToast(toast.id);
      }, 4500)
    );

    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#08101f] text-white">
      <style>{`
        @keyframes driftOne {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(16px,-18px,0) scale(1.04); }
        }
        @keyframes driftTwo {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-22px,16px,0) scale(1.06); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .orb-one { animation: driftOne 8s ease-in-out infinite; }
        .orb-two { animation: driftTwo 10s ease-in-out infinite; }
        .toast-in { animation: toastIn .22s ease-out; }
      `}</style>

      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.12),transparent_20%)]" />
        <div className="absolute left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl orb-one" />
        <div className="absolute right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/18 blur-3xl orb-two" />
        <div className="absolute bottom-[-3rem] left-1/3 h-72 w-72 rounded-full bg-slate-200/10 blur-3xl orb-one" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(192,199,209,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(192,199,209,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(2,6,23,0.64)_62%,rgba(2,6,23,0.95)_100%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f4deb0]">
              <SparklesIcon className="h-4 w-4" />
              DOM UI KIT
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c0c7d1]/20 bg-[#c0c7d1]/10 px-3 py-1 text-xs font-medium text-[#d8dde5]">
              Modals · Toasts · Paleta login
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[32px] border border-white/10 bg-white/6 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl lg:p-8">
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Elementos base del DOM para TesApp
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Esta base reutiliza el mismo lenguaje visual del login aprobado: azul noche, plateado, dorado y morado,
                con superficies glass, bordes suaves y jerarquía orientada a panel administrativo.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Modal info</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Para detalle de estado, ayuda contextual, confirmación de lectura y mensajes del sistema.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#c0c7d1]">Modal confirmación</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Para acciones sensibles: cambio de tenant, rechazo de solicitud, cierre de sesión o eliminación.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7c3aed]">Toasts</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Feedback no bloqueante para guardado, errores, validaciones suaves y cambios de contexto.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.90),rgba(7,12,24,0.96))] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
              <div>
                <p className="text-sm font-medium text-[#c0c7d1]">Biblioteca inicial</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Acciones demo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Dispara los componentes base para validar estética, jerarquía, espaciado y comportamiento.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Modals</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setOpenInfoModal(true)}
                      className="rounded-2xl border border-[#c0c7d1]/20 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    >
                      Abrir modal info
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenConfirmModal(true)}
                      className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-sm font-medium text-[#f5df9f] transition hover:bg-[#d4af37]/15"
                    >
                      Abrir confirmación
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenFormModal(true)}
                      className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-400/15"
                    >
                      Abrir modal formulario
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Toasts</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => pushToast(toastExamples.success)}
                      className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/15"
                    >
                      Toast success
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast(toastExamples.warning)}
                      className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-sm font-medium text-[#f5df9f] transition hover:bg-[#d4af37]/15"
                    >
                      Toast warning
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast(toastExamples.error)}
                      className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-400/15"
                    >
                      Toast error
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast(toastExamples.info)}
                      className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-400/15"
                    >
                      Toast info
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Uso sugerido</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                    <p className="text-sm font-semibold text-white">Modal bloqueante</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Acciones críticas o flujos que requieren atención total del usuario.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                    <p className="text-sm font-semibold text-white">Toast no bloqueante</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Confirmaciones rápidas y mensajes transitorios sin romper el flujo principal.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto toast-in">
              <ToastCard toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>
      </div>

      <ModalShell
        open={openInfoModal}
        onClose={() => setOpenInfoModal(false)}
        eyebrow="Modal informativo"
        title="Detalle de estado de solicitud"
        footer={
          <button
            type="button"
            onClick={() => setOpenInfoModal(false)}
            className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25"
          >
            Entendido
          </button>
        }
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-7 text-slate-300">
            La solicitud del cliente fue recibida correctamente y quedó en estado <span className="font-semibold text-[#f5df9f]">pendiente de revisión</span>.
            Un usuario con perfil <span className="font-semibold text-white">super_admin</span> podrá aprobarla, rechazarla o solicitar más antecedentes.
          </p>
        </div>
      </ModalShell>

      <ModalShell
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        eyebrow="Confirmación requerida"
        title="¿Deseas cambiar la empresa activa?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpenConfirmModal(false)}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenConfirmModal(false);
                pushToast({
                  type: "info",
                  title: "Empresa actualizada",
                  message: "La sesión se movió a la nueva empresa y se recargaron los permisos disponibles.",
                });
              }}
              className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25"
            >
              Sí, continuar
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Empresa actual</p>
            <p className="mt-2 text-sm font-semibold text-white">TesApp Motors Chile</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Nueva empresa</p>
            <p className="mt-2 text-sm font-semibold text-white">HrCastell Systems Core</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Este cambio puede modificar módulos visibles, permisos operativos y contexto de datos durante la sesión actual.
        </p>
      </ModalShell>

      <ModalShell
        open={openFormModal}
        onClose={() => setOpenFormModal(false)}
        eyebrow="Modal de formulario"
        title="Asignar empresa a usuario"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpenFormModal(false)}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenFormModal(false);
                pushToast({
                  type: "success",
                  title: "Asignación realizada",
                  message: "La empresa fue asociada y el usuario ya puede iniciar sesión en ese esquema.",
                });
              }}
              className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25"
            >
              Guardar cambios
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
            <label className="text-sm font-medium text-slate-200">Usuario</label>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-300">
              hernan.castellanos@hrcastell.com
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
            <label className="text-sm font-medium text-slate-200">Empresa</label>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-300">
              TesApp Motors Chile
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5 sm:col-span-2">
            <label className="text-sm font-medium text-slate-200">Perfil inicial</label>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-300">
              admin_empresa
            </div>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
