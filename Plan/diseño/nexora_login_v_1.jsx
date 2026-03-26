import React, { useState } from "react";

type Step = 1 | 2 | 3 | 4;

type Company = {
  id: string;
  name: string;
  schema: string;
  status: string;
  color: string;
};

type IconProps = {
  className?: string;
};

type Profile = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<IconProps>;
  recommended?: boolean;
};

const FLOW_STEPS = [
  { id: 1 as Step, label: "Correo" },
  { id: 2 as Step, label: "Empresa" },
  { id: 3 as Step, label: "Clave" },
  { id: 4 as Step, label: "Perfil" },
];

const COMPANIES: Company[] = [
  {
    id: "1",
    name: "HrCastell Systems Core",
    schema: "public",
    status: "Núcleo SaaS",
    color: "from-[#d4af37] to-[#b68b1f]",
  },
  {
    id: "2",
    name: "TesApp Motors Chile",
    schema: "hernancius",
    status: "Empresa base",
    color: "from-[#7c3aed] to-[#4c1d95]",
  },
  {
    id: "3",
    name: "Autoservicio Andino",
    schema: "empresa_andino",
    status: "Activa",
    color: "from-[#243b7a] to-[#111c44]",
  },
];

function SparklesIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
      <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
    </svg>
  );
}

function LayersIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

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

function MailIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function KeyIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="M12 15h9" />
      <path d="M18 12v6" />
      <path d="M21 13v4" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l7 3v6c0 4.5-2.8 7.9-7 9-4.2-1.1-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}

function CrownIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 18h18" />
      <path d="M5 18l2-10 5 5 5-5 2 10" />
      <path d="M7 8l-3-3" />
      <path d="M17 8l3-3" />
    </svg>
  );
}

function BriefcaseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function UserPlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15 19a5 5 0 00-10 0" />
      <circle cx="10" cy="8" r="3" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

function BadgeCheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l2 2.2 3-.5.8 2.9 2.8 1-1 2.8 1 2.8-2.8 1-.8 2.9-3-.5L12 21l-2-2.2-3 .5-.8-2.9-2.8-1 1-2.8-1-2.8 2.8-1 .8-2.9 3 .5L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M19 12H5" />
      <path d="M11 5l-7 7 7 7" />
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

const PROFILES: Profile[] = [
  {
    id: "super_admin",
    name: "super_admin",
    description: "Acceso total al núcleo SaaS, compañías, pagos, solicitudes y configuración global.",
    icon: CrownIcon,
    recommended: true,
  },
  {
    id: "admin_empresa",
    name: "admin_empresa",
    description: "Administración completa del tenant y de la operación de la empresa seleccionada.",
    icon: ShieldIcon,
  },
  {
    id: "supervisor_operacion",
    name: "supervisor_operacion",
    description: "Seguimiento de operación, validaciones y control de procesos diarios.",
    icon: BriefcaseIcon,
  },
];

function getStepState(currentStep: Step, itemId: Step) {
  return {
    active: currentStep === itemId,
    completed: currentStep > itemId,
  };
}

function canAdvanceToProfiles(password: string) {
  return password.trim().length > 0;
}

function SmokeTests() {
  const checks = [
    {
      name: "step active on initial state",
      ok: getStepState(1, 1).active === true,
    },
    {
      name: "step completed after progress",
      ok: getStepState(3, 2).completed === true,
    },
    {
      name: "blank password blocks next step",
      ok: canAdvanceToProfiles("   ") === false,
    },
    {
      name: "typed password enables next step",
      ok: canAdvanceToProfiles("abc123") === true,
    },
  ];

  const passed = checks.filter((item) => item.ok).length;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#091224]/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Smoke checks</p>
        <p className="text-xs text-slate-300">{passed}/{checks.length} OK</p>
      </div>
      <div className="mt-3 space-y-2">
        {checks.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-xs">
            <span className="text-slate-300">{item.name}</span>
            <span className={item.ok ? "text-emerald-300" : "text-rose-300"}>{item.ok ? "PASS" : "FAIL"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TesAppLoginV2() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("hernan.castellanos@hrcastell.com");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(COMPANIES[1]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(PROFILES[0]);
  const [password, setPassword] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [wizardSaved, setWizardSaved] = useState(false);

  const selectedCompanyLabel = selectedCompany
    ? `${selectedCompany.name} · schema ${selectedCompany.schema}`
    : "Selecciona una empresa";

  const handleDetectCompanies = () => {
    setStep(2);
  };

  const handleContinueToPassword = () => {
    if (!selectedCompany) return;
    setStep(3);
  };

  const handleContinueToProfiles = () => {
    if (!canAdvanceToProfiles(password)) return;
    setStep(4);
  };

  const handleWizardSubmit = () => {
    setWizardSaved(true);
  };

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
        @keyframes glowPulse {
          0%,100% { opacity: .45; }
          50% { opacity: .72; }
        }
        .orb-one { animation: driftOne 8s ease-in-out infinite; }
        .orb-two { animation: driftTwo 10s ease-in-out infinite; }
        .glow-pulse { animation: glowPulse 5s ease-in-out infinite; }
      `}</style>

      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.12),transparent_20%)]" />
        <div className="absolute left-[-4rem] top-16 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl orb-one" />
        <div className="absolute right-[-2rem] top-24 h-72 w-72 rounded-full bg-[#d4af37]/18 blur-3xl orb-two" />
        <div className="absolute bottom-[-3rem] left-1/3 h-72 w-72 rounded-full bg-slate-200/10 blur-3xl orb-one" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(192,199,209,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(192,199,209,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(2,6,23,0.64)_62%,rgba(2,6,23,0.95)_100%)]" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
          <section className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/6 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl lg:p-9">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#f4deb0] uppercase">
                  <SparklesIcon className="h-4 w-4" />
                  Access Core
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#c0c7d1]/20 bg-[#c0c7d1]/10 px-3 py-1 text-xs font-medium text-[#d8dde5]">
                  Multiempresa · Multiperfil
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#c0c7d1]">
                  TES App / Nexora Base
                </p>
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-5xl">
                  Login con detección automática de esquema, clave por empresa y selección final de perfil.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  Este acceso ya refleja el flujo real que planteaste: primero se identifica el correo, luego se
                  detectan las empresas asociadas, después se pide la clave para la empresa elegida y, por último,
                  se permite entrar con uno de los perfiles disponibles del usuario.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Paso 1</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">Detección de empresas</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    El usuario escribe su correo y el sistema busca automáticamente a qué esquemas está vinculado.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#c0c7d1]">Paso 2</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">Empresa antes de clave</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    La contraseña se solicita recién después de escoger la empresa o schema sobre el que se desea entrar.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#0d1730]/75 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7c3aed]">Paso 3</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">Perfil posterior al login</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Una vez validada la clave, el sistema muestra los perfiles disponibles; por defecto, super_admin.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-[#0c162d] via-[#121d39] to-[#21113d] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Flujo operativo del acceso</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      Correo → empresas detectadas → empresa seleccionada → clave → perfiles del usuario → ingreso al dashboard o flujo correspondiente.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-sm font-medium text-[#f5e3ab]">
                    Tenant first, password after
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#d8dde5]">
                <LayersIcon className="h-4 w-4 text-[#d4af37]" />
                Resumen contextual
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Acceso</p>
                  <p className="mt-2 text-sm font-medium text-white">Multiempresa</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Esquema</p>
                  <p className="mt-2 text-sm font-medium text-white">Detectado por correo</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#091224]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Perfil</p>
                  <p className="mt-2 text-sm font-medium text-white">super_admin por default</p>
                </div>
              </div>
              <SmokeTests />
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-xl rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.90),rgba(7,12,24,0.96))] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#c0c7d1]">Acceso seguro</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Ingreso inteligente</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    El sistema guía el acceso en etapas para identificar correctamente empresa, clave y perfil.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-3 shadow-lg shadow-[#d4af37]/10">
                  <BuildingIcon className="h-6 w-6 text-[#f0ce6f]" />
                </div>
              </div>

              <div className="mb-7 grid grid-cols-4 gap-2">
                {FLOW_STEPS.map((item) => {
                  const { active, completed } = getStepState(step, item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border px-3 py-3 text-center transition-all ${
                        active
                          ? "border-[#d4af37]/40 bg-[#d4af37]/12 text-[#f5df9f] shadow-lg shadow-[#d4af37]/10"
                          : completed
                            ? "border-[#7c3aed]/30 bg-[#7c3aed]/12 text-[#d9c2ff]"
                            : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      <div className="text-xs font-semibold tracking-[0.16em] uppercase">0{item.id}</div>
                      <div className="mt-1 text-[11px] font-medium">{item.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-5">
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Correo corporativo</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                        <MailIcon className="h-5 w-5 text-slate-400" />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                          placeholder="tu.correo@empresa.com"
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#7c3aed]/20 bg-[#7c3aed]/10 p-4">
                      <p className="text-sm font-medium text-[#e5d5ff]">Comportamiento esperado</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Al continuar, el sistema consulta el directorio central y detecta en qué empresas o esquemas existe tu usuario.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectCompanies}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#4c2f88] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                    >
                      Detectar empresas registradas
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Correo detectado</p>
                        <p className="mt-1 text-sm font-medium text-white">{email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        Cambiar
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-200">Empresas encontradas para este usuario</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Selecciona con cuál deseas trabajar en esta sesión. La clave se validará contra la empresa elegida.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {COMPANIES.map((company) => {
                        const selected = selectedCompany?.id === company.id;
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => setSelectedCompany(company)}
                            className={`w-full rounded-3xl border p-4 text-left transition ${
                              selected
                                ? "border-[#d4af37]/40 bg-[#d4af37]/10 shadow-lg shadow-[#d4af37]/10"
                                : "border-white/10 bg-[#091224]/80 hover:border-[#7c3aed]/30 hover:bg-[#101a31]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${company.color}`}>
                                  <BuildingIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white">{company.name}</p>
                                    {company.schema === "public" && (
                                      <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4deb0]">
                                        core
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                                    schema {company.schema}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Estado</p>
                                <p className="mt-1 text-sm font-medium text-slate-200">{company.status}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueToPassword}
                        className="flex flex-[1.3] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                      >
                        Continuar con empresa seleccionada
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-[#c0c7d1]/15 bg-[#0b1326] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Empresa elegida</p>
                      <p className="mt-2 text-sm font-semibold text-white">{selectedCompanyLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Ahora sí se solicita la clave, únicamente para la empresa o schema seleccionado.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Clave de acceso</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3.5 focus-within:border-[#d4af37]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/15">
                        <KeyIcon className="h-5 w-5 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                          placeholder="Ingresa tu contraseña"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueToProfiles}
                        className="flex flex-[1.3] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                      >
                        Validar clave
                        <BadgeCheckIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4">
                      <p className="text-sm font-medium text-[#f5df9f]">Acceso validado</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Selecciona el perfil con el que deseas ingresar. Para este usuario, el perfil por defecto es super_admin.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {PROFILES.map((profile) => {
                        const Icon = profile.icon;
                        const active = selectedProfile?.id === profile.id;
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => setSelectedProfile(profile)}
                            className={`w-full rounded-3xl border p-4 text-left transition ${
                              active
                                ? "border-[#d4af37]/40 bg-[#d4af37]/10 shadow-lg shadow-[#d4af37]/10"
                                : "border-white/10 bg-[#091224]/80 hover:border-[#7c3aed]/30 hover:bg-[#101a31]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl ${
                                    active ? "bg-[#d4af37]/20 text-[#f5df9f]" : "bg-[#7c3aed]/15 text-[#d9c2ff]"
                                  }`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white">{profile.name}</p>
                                    {profile.recommended && (
                                      <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5df9f]">
                                        default
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-slate-300">{profile.description}</p>
                                </div>
                              </div>
                              <div
                                className={`mt-1 h-4 w-4 rounded-full border ${
                                  active ? "border-[#d4af37] bg-[#d4af37] glow-pulse" : "border-slate-500"
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Empresa</p>
                        <p className="mt-2 text-sm font-medium text-white">{selectedCompany?.schema}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Perfil activo</p>
                        <p className="mt-2 text-sm font-medium text-white">{selectedProfile?.name}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Volver
                      </button>
                      <button
                        type="button"
                        className="flex flex-[1.3] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                      >
                        Ingresar al dashboard
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowWizard(true);
                    setWizardSaved(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#c0c7d1]/20 bg-[#c0c7d1]/8 px-4 py-3.5 text-sm font-medium text-[#e5e7eb] transition hover:border-[#d4af37]/25 hover:bg-white/10"
                >
                  <UserPlusIcon className="h-4 w-4 text-[#d4af37]" />
                  Registrarme y completar onboarding
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  El registro abre el formulario tipo wizard. Al enviarlo, la solicitud queda pendiente de revisión por el super_admin.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,45,0.96),rgba(8,16,31,0.98))] p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#d4af37]">Registro de nueva empresa</p>
                <h3 className="mt-2 text-3xl font-semibold text-white">Onboarding tipo wizard</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Aquí se levantaría el formulario completo que definiste anteriormente para solicitud, datos comerciales, empresa, representante y configuración inicial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWizard(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            {!wizardSaved ? (
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[
                  "Empresa y rubro",
                  "Contacto principal",
                  "Ubicación y operación",
                  "Interés comercial",
                ].map((item, index) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Paso 0{index + 1}</p>
                    <p className="mt-2 text-sm font-medium text-white">{item}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {!wizardSaved ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
                  <label className="text-sm font-medium text-slate-200">Nombre empresa</label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-400">
                    Campo del wizard
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
                  <label className="text-sm font-medium text-slate-200">Nombre contacto principal</label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-400">
                    Campo del wizard
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
                  <label className="text-sm font-medium text-slate-200">País / ciudad</label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-400">
                    Campo del wizard
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#091224]/80 p-5">
                  <label className="text-sm font-medium text-slate-200">Módulo principal requerido</label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#0b1326] px-4 py-3 text-sm text-slate-400">
                    Campo del wizard
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-[28px] border border-[#d4af37]/25 bg-[#d4af37]/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/18 text-[#f5df9f]">
                    <BadgeCheckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Solicitud registrada correctamente</p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
                      Su solicitud será revisada y se le notificará a la brevedad.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      Internamente, esta solicitud quedaría disponible en la ventana exclusiva del super_admin para revisión, seguimiento comercial y posible alta de empresa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {!wizardSaved ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleWizardSubmit}
                    className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                  >
                    Enviar solicitud
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="rounded-2xl bg-gradient-to-r from-[#243b7a] via-[#6d28d9] to-[#d4af37] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4c2f88]/25 transition hover:translate-y-[-1px]"
                >
                  Volver al login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
