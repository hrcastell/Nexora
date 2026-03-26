import React, { useMemo, useState } from "react";

type IconProps = { className?: string };

type ConfigModule = {
  id: string;
  title: string;
  description: string;
  status: "active" | "draft" | "review";
  items: number;
  icon: React.ComponentType<IconProps>;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: "success" | "warning" | "info";
};

function BuildingIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function WalletIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path d="M16 12h.01" />
      <path d="M3 9h16" />
      <path d="M17 5V3H7v2" />
    </svg>
  );
}

function FileCheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

function ImageIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15l-5-5L5 20" />
    </svg>
  );
}

function LayersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.54V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.54 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.7 1.7 0 005 15a1.7 1.7 0 00-1.54-1H3.4a2 2 0 010-4h.09A1.7 1.7 0 005 8.46a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.7 1.7 0 009 4.1a1.7 1.7 0 001-1.54V2.5a2 2 0 014 0v.09a1.7 1.7 0 001 1.54 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.7 1.7 0 0019.4 9c.27.64.89 1.06 1.58 1.06h.09a2 2 0 010 4h-.09c-.69 0-1.31.42-1.58 1.06z" />
    </svg>
  );
}

function BellIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15 17H5l1.4-1.4A2 2 0 007 14.2V10a5 5 0 0110 0v4.2a2 2 0 00.6 1.4L19 17h-4" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 6l6 6-6 6" />
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

const CONFIG_MODULES: ConfigModule[] = [
  {
    id: "companies",
    title: "Gestión de empresas",
    description: "Alta, edición, estado comercial, relación con esquema y contexto operativo por compañía.",
    status: "active",
    items: 18,
    icon: BuildingIcon,
  },
  {
    id: "users",
    title: "Usuarios y accesos",
    description: "Administración de usuarios, perfiles, activación, bloqueo y asignación por empresa.",
    status: "active",
    items: 46,
    icon: UsersIcon,
  },
  {
    id: "payments",
    title: "Pagos y convenios",
    description: "Control de tarifas, validación de pagos, convenios activos y vencimientos comerciales.",
    status: "review",
    items: 12,
    icon: WalletIcon,
  },
  {
    id: "requests",
    title: "Solicitudes",
    description: "Bandeja de nuevos registros, evaluación comercial y seguimiento de onboarding pendiente.",
    status: "active",
    items: 9,
    icon: FileCheckIcon,
  },
  {
    id: "banners",
    title: "Aprobar banner",
    description: "Revisión, aprobación y publicación de banners comerciales por sponsor o empresa.",
    status: "draft",
    items: 7,
    icon: ImageIcon,
  },
  {
    id: "plans",
    title: "Planes de publicidad",
    description: "Definición de planes, vigencias, beneficios y visibilidad en el portal.",
    status: "review",
    items: 5,
    icon: LayersIcon,
  },
];

const ACTIVITY_LOG: ActivityItem[] = [
  {
    id: "1",
    title: "Solicitud aprobada",
    detail: "Centro Médico Andes pasó de pendiente a aprobada y quedó lista para activación.",
    time: "Hace 12 min",
    type: "success",
  },
  {
    id: "2",
    title: "Pago en revisión",
    detail: "TesApp Motors Chile cargó comprobante y quedó esperando validación manual.",
    time: "Hace 48 min",
    type: "warning",
  },
  {
    id: "3",
    title: "Nuevo banner recibido",
    detail: "Se registró una pieza nueva en la cola de aprobación comercial.",
    time: "Hace 1 h",
    type: "info",
  },
];

function getStatusStyles(status: ConfigModule["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "review":
      return "border-[#d4af37]/20 bg-[#d4af37]/10 text-[#f5df9f]";
    default:
      return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  }
}

function getActivityStyles(type: ActivityItem["type"]) {
  switch (type) {
    case "success":
      return "bg-emerald-400/10 text-emerald-200 border-emerald-400/20";
    case "warning":
      return "bg-[#d4af37]/10 text-[#f5df9f] border-[#d4af37]/20";
    default:
      return "bg-violet-400/10 text-violet-200 border-violet-400/20";
  }
}

export default function NexoraDashboardConfigV1() {
  const [selectedModule, setSelectedModule] = useState<string>("companies");
  const [search, setSearch] = useState("");

  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return CONFIG_MODULES;
    return CONFIG_MODULES.filter(
      (module) =>
        module.title.toLowerCase().includes(term) ||
        module.description.toLowerCase().includes(term)
    );
  }, [search]);

  const activeModule = filteredModules.find((item) => item.id === selectedModule) || filteredModules[0] || CONFIG_MODULES[0];

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
        .orb-one { animation: driftOne 8s ease-in-out infinite; }
        .orb-two { animation: driftTwo 10s ease-in-out infinite; }
      `}</style>

      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.12),transparent_20%)]" />
        <div className="absolute left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl orb-one" />
        <div className="absolute right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/18 blur-3xl orb-two" />
        <div className="absolute bottom-[-3rem] left-1/3 h-72 w-72 rounded-full bg-slate-200/10 blur-3xl orb-one" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(192,199,209,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(192,199,209,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(2,6,23,0.64)_62%,rgba(2,6,23,0.95)_100%)]" />

        <div className="relative flex min-h-screen">
          <aside className="hidden w-[300px] shrink-0 border-r border-white/10 bg-[#071120]/70 px-5 py-6 backdrop-blur-xl lg:block">
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/6 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#243b7a] via-[#6d28d9] to-[#d4af37] text-white shadow-lg shadow-[#4c2f88]/20">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Nexora</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Configuración</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Menú</p>
              <div className="mt-3 space-y-2">
                {CONFIG_MODULES.map((module) => {
                  const Icon = module.icon;
                  const selected = activeModule?.id === module.id;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setSelectedModule(module.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-[#d4af37]/25 bg-[#d4af37]/10 text-white shadow-lg shadow-[#d4af37]/5"
                          : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? "bg-[#d4af37]/15 text-[#f5df9f]" : "bg-white/5 text-slate-400"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{module.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{module.items} registros</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto activo</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Usuario</p>
                  <p className="mt-1 text-sm font-medium text-white">hernan.castellanos@hrcastell.com</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Perfil</p>
                  <p className="mt-1 text-sm font-medium text-white">super_admin</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Empresa</p>
                  <p className="mt-1 text-sm font-medium text-white">HrCastell Systems Core</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 px-5 py-6 lg:px-8 lg:py-7">
            <header className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl lg:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f4deb0]">
                      <SettingsIcon className="h-4 w-4" />
                      Dashboard Config
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#c0c7d1]/20 bg-[#c0c7d1]/10 px-3 py-1 text-xs font-medium text-[#d8dde5]">
                      Super Admin View
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                    Panel de configuración de Nexora
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                    Vista centrada únicamente en la sección de configuración, pensada para administrar empresas, usuarios, solicitudes,
                    convenios y activos visuales desde una consola unificada.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-300">
                    <SearchIcon className="h-4 w-4 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar módulo de configuración"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    <BellIcon className="h-4 w-4 text-[#d4af37]" />
                    3 alertas
                  </button>
                </div>
              </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Empresas activas</p>
                <p className="mt-3 text-3xl font-semibold text-white">24</p>
                <p className="mt-2 text-sm text-slate-300">Tenants operativos y visibles en el ecosistema.</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Solicitudes pendientes</p>
                <p className="mt-3 text-3xl font-semibold text-white">09</p>
                <p className="mt-2 text-sm text-slate-300">Registros nuevos esperando revisión comercial.</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pagos en revisión</p>
                <p className="mt-3 text-3xl font-semibold text-white">06</p>
                <p className="mt-2 text-sm text-slate-300">Convenios o comprobantes pendientes de validar.</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Banners por aprobar</p>
                <p className="mt-3 text-3xl font-semibold text-white">07</p>
                <p className="mt-2 text-sm text-slate-300">Contenido comercial esperando aprobación.</p>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#c0c7d1]">Módulos de configuración</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Centro de administración</h2>
                  </div>
                  <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-2 text-xs font-medium text-[#f5df9f]">
                    {filteredModules.length} módulos visibles
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {filteredModules.map((module) => {
                    const Icon = module.icon;
                    const selected = activeModule?.id === module.id;
                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => setSelectedModule(module.id)}
                        className={`rounded-[28px] border p-5 text-left transition ${
                          selected
                            ? "border-[#d4af37]/30 bg-[#d4af37]/10 shadow-lg shadow-[#d4af37]/5"
                            : "border-white/10 bg-[#091224]/80 hover:border-[#7c3aed]/25 hover:bg-[#101a31]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? "bg-[#d4af37]/15 text-[#f5df9f]" : "bg-white/5 text-slate-300"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusStyles(module.status)}`}>
                            {module.status}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-semibold text-white">{module.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{module.description}</p>

                        <div className="mt-5 flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Registros</p>
                            <p className="mt-1 text-sm font-medium text-white">{module.items}</p>
                          </div>
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#d8dde5]">
                            Abrir
                            <ChevronRightIcon className="h-4 w-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl lg:p-6">
                  <p className="text-sm font-medium text-[#c0c7d1]">Módulo seleccionado</p>
                  <div className="mt-4 rounded-[28px] border border-white/10 bg-[#091224]/80 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{activeModule.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{activeModule.description}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusStyles(activeModule.status)}`}>
                        {activeModule.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Registros activos</p>
                        <p className="mt-2 text-lg font-semibold text-white">{activeModule.items}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Responsable</p>
                        <p className="mt-2 text-lg font-semibold text-white">super_admin</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <button
                        type="button"
                        className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/20"
                      >
                        Entrar al módulo
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        Ver configuración rápida
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl lg:p-6">
                  <p className="text-sm font-medium text-[#c0c7d1]">Actividad reciente</p>
                  <div className="mt-4 space-y-3">
                    {ACTIVITY_LOG.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getActivityStyles(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{item.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
