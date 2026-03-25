import React, { useMemo, useState } from "react";

type IconProps = { className?: string };
type ProfileScope = "global" | "company" | "module";
type ModuleStatus = "active" | "draft" | "hidden";

type ModuleItem = {
  id: string;
  name: string;
  key: string;
  description: string;
  status: ModuleStatus;
  group: string;
};

type ActionKey = "view" | "create" | "edit" | "delete" | "approve" | "export" | "manage";

type ProfileItem = {
  id: string;
  name: string;
  description: string;
  scope: ProfileScope;
  modules: string[];
  permissions: Record<string, ActionKey[]>;
};

function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l7 3v6c0 4.5-2.8 7.9-7 9-4.2-1.1-7-4.5-7-9V6l7-3z" />
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

function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
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

function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M20 6L9 17l-5-5" />
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

const ACTIONS: { key: ActionKey; label: string }[] = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "approve", label: "Aprobar" },
  { key: "export", label: "Exportar" },
  { key: "manage", label: "Gestionar" },
];

const INITIAL_MODULES: ModuleItem[] = [
  { id: "1", name: "Empleados", key: "employees", description: "Gestión completa de personal.", status: "active", group: "Gestión Humana" },
  { id: "2", name: "Sueldos", key: "payroll", description: "Cálculo y administración de sueldos.", status: "active", group: "Gestión Humana" },
  { id: "3", name: "Contratos", key: "contracts", description: "Contratos, anexos y vigencias.", status: "active", group: "Gestión Humana" },
  { id: "4", name: "Horarios", key: "schedules", description: "Turnos, asistencia y jornadas.", status: "active", group: "Gestión Humana" },
  { id: "5", name: "Inventario", key: "inventory", description: "Existencias, entradas, salidas y stock.", status: "active", group: "Operación" },
  { id: "6", name: "Órdenes", key: "orders", description: "Recepción, seguimiento y órdenes de trabajo.", status: "active", group: "Operación" },
  { id: "7", name: "Facturación", key: "billing", description: "Facturas, cobros y documentos tributarios.", status: "active", group: "Finanzas" },
  { id: "8", name: "Pagos y convenios", key: "payments", description: "Validación de pagos y convenios comerciales.", status: "draft", group: "Finanzas" },
  { id: "9", name: "Configuración", key: "settings", description: "Parámetros globales del tenant.", status: "active", group: "Administración" },
  { id: "10", name: "Solicitudes", key: "requests", description: "Onboarding, revisión y aprobación.", status: "active", group: "Administración" },
];

const INITIAL_PROFILES: ProfileItem[] = [
  {
    id: "p1",
    name: "Acceso total",
    description: "Control completo de todos los módulos de la empresa.",
    scope: "global",
    modules: INITIAL_MODULES.filter((m) => m.status !== "hidden").map((m) => m.key),
    permissions: Object.fromEntries(INITIAL_MODULES.map((m) => [m.key, ACTIONS.map((a) => a.key)])),
  },
  {
    id: "p2",
    name: "Gestión Humana / Supervisor",
    description: "Gestión total sobre RRHH y supervisión del área.",
    scope: "module",
    modules: ["employees", "payroll", "contracts", "schedules"],
    permissions: {
      employees: ["view", "create", "edit", "manage", "export"],
      payroll: ["view", "create", "edit", "manage", "export"],
      contracts: ["view", "create", "edit", "approve", "export"],
      schedules: ["view", "create", "edit", "manage"],
    },
  },
  {
    id: "p3",
    name: "Operación / Supervisor",
    description: "Operación diaria y supervisión de ejecución.",
    scope: "module",
    modules: ["inventory", "orders"],
    permissions: {
      inventory: ["view", "edit", "manage", "export"],
      orders: ["view", "create", "edit", "approve", "manage"],
    },
  },
];

function scopeStyles(scope: ProfileScope) {
  if (scope === "global") return { bg: "rgba(109,40,217,0.12)", border: "rgba(109,40,217,0.24)", color: "#ddd6fe", label: "Global" };
  if (scope === "company") return { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.24)", color: "#a5f3fc", label: "Empresa" };
  return { bg: "rgba(36,59,122,0.16)", border: "rgba(36,59,122,0.24)", color: "#bfdbfe", label: "Por módulo" };
}

function moduleStatusStyles(status: ModuleStatus) {
  if (status === "active") return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.24)", color: "#a7f3d0", label: "Activo" };
  if (status === "draft") return { bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.24)", color: "#f5df9f", label: "Borrador" };
  return { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.24)", color: "#cbd5e1", label: "Oculto" };
}

export default function NexoraProfilesPermissionsV1() {
  const [modules, setModules] = useState<ModuleItem[]>(INITIAL_MODULES);
  const [profiles, setProfiles] = useState<ProfileItem[]>(INITIAL_PROFILES);
  const [profileQuery, setProfileQuery] = useState("");
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>(INITIAL_PROFILES[0].id);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileItem>({
    id: "",
    name: "",
    description: "",
    scope: "module",
    modules: [],
    permissions: {},
  });

  const [moduleForm, setModuleForm] = useState<ModuleItem>({
    id: "",
    name: "",
    key: "",
    description: "",
    status: "active",
    group: "Administración",
  });

  const filteredProfiles = useMemo(() => {
    const term = profileQuery.trim().toLowerCase();
    return profiles.filter((profile) =>
      !term ||
      profile.name.toLowerCase().includes(term) ||
      profile.description.toLowerCase().includes(term)
    );
  }, [profiles, profileQuery]);

  const filteredModules = useMemo(() => {
    const term = moduleQuery.trim().toLowerCase();
    return modules.filter((module) =>
      !term ||
      module.name.toLowerCase().includes(term) ||
      module.group.toLowerCase().includes(term) ||
      module.key.toLowerCase().includes(term)
    );
  }, [modules, moduleQuery]);

  const selectedProfile = filteredProfiles.find((p) => p.id === selectedProfileId) || profiles.find((p) => p.id === selectedProfileId) || filteredProfiles[0] || profiles[0];

  const totalVisibleModules = modules.filter((m) => m.status !== "hidden").length;

  function openCreateProfile() {
    setEditingProfileId(null);
    setProfileForm({ id: "", name: "", description: "", scope: "module", modules: [], permissions: {} });
    setIsProfileFormOpen(true);
  }

  function openEditProfile(profile: ProfileItem) {
    setEditingProfileId(profile.id);
    setProfileForm({ ...profile, permissions: { ...profile.permissions } });
    setIsProfileFormOpen(true);
  }

  function saveProfile() {
    if (!profileForm.name.trim()) return;
    const cleanedPermissions = Object.fromEntries(
      Object.entries(profileForm.permissions).filter(([moduleKey]) => profileForm.modules.includes(moduleKey))
    );
    if (editingProfileId) {
      setProfiles((prev) => prev.map((p) => (p.id === editingProfileId ? { ...profileForm, id: editingProfileId, permissions: cleanedPermissions } : p)));
      setSelectedProfileId(editingProfileId);
    } else {
      const id = `profile-${Date.now()}`;
      setProfiles((prev) => [{ ...profileForm, id, permissions: cleanedPermissions }, ...prev]);
      setSelectedProfileId(id);
    }
    setIsProfileFormOpen(false);
  }

  function openCreateModule() {
    setEditingModuleId(null);
    setModuleForm({ id: "", name: "", key: "", description: "", status: "active", group: "Administración" });
    setIsModuleFormOpen(true);
  }

  function openEditModule(module: ModuleItem) {
    setEditingModuleId(module.id);
    setModuleForm({ ...module });
    setIsModuleFormOpen(true);
  }

  function saveModule() {
    if (!moduleForm.name.trim() || !moduleForm.key.trim()) return;
    if (editingModuleId) {
      setModules((prev) => prev.map((m) => (m.id === editingModuleId ? { ...moduleForm, id: editingModuleId } : m)));
    } else {
      const id = `module-${Date.now()}`;
      setModules((prev) => [{ ...moduleForm, id }, ...prev]);
    }
    setIsModuleFormOpen(false);
  }

  function toggleProfileModule(moduleKey: string) {
    setProfileForm((prev) => {
      const exists = prev.modules.includes(moduleKey);
      const modulesNext = exists ? prev.modules.filter((m) => m !== moduleKey) : [...prev.modules, moduleKey];
      const permissionsNext = { ...prev.permissions };
      if (!exists && !permissionsNext[moduleKey]) permissionsNext[moduleKey] = ["view"];
      if (exists) delete permissionsNext[moduleKey];
      return { ...prev, modules: modulesNext, permissions: permissionsNext };
    });
  }

  function toggleAction(moduleKey: string, action: ActionKey) {
    setProfileForm((prev) => {
      const current = prev.permissions[moduleKey] || [];
      const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
      return { ...prev, permissions: { ...prev.permissions, [moduleKey]: next } };
    });
  }

  const cardBase: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    background: "linear-gradient(180deg, rgba(36,59,122,0.16), rgba(8,16,31,0.96))",
    backdropFilter: "blur(18px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "14px 16px",
    color: "white",
    outline: "none",
    fontSize: 14,
  };

  return (
    <div style={{ minHeight: "100vh", overflow: "hidden", background: "#08101f", color: "white", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
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
        @media (max-width: 1180px) {
          .pp-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .pp-stats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .pp-header { flex-direction: column !important; align-items: stretch !important; }
          .pp-form-grid { grid-template-columns: 1fr !important; }
          .pp-span-2 { grid-column: span 1 !important; }
          .pp-actions-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }
        @media (max-width: 720px) {
          .pp-stats, .pp-actions-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(124,58,237,0.22), transparent 28%), radial-gradient(circle at top right, rgba(212,175,55,0.18), transparent 22%), radial-gradient(circle at bottom, rgba(148,163,184,0.12), transparent 20%)" }} />
        <div className="orb-one" style={{ position: "absolute", left: "-4rem", top: "4rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(124,58,237,0.18)", filter: "blur(70px)" }} />
        <div className="orb-two" style={{ position: "absolute", right: "-2rem", top: "6rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(212,175,55,0.14)", filter: "blur(70px)" }} />

        <div style={{ position: "relative", maxWidth: 1500, margin: "0 auto", padding: "24px 20px 36px" }}>
          <header style={{ ...cardBase, padding: 24 }}>
            <div className="pp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 280, flex: "1 1 640px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                    <SparklesIcon className="h-4 w-4" />
                    Perfiles y permisos
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1" }}>
                    Nexora / Seguridad parametrizable
                  </span>
                </div>
                <h1 style={{ marginTop: 16, fontSize: 36, lineHeight: 1.1, fontWeight: 700 }}>Perfiles, permisos y definición de módulos</h1>
                <p style={{ marginTop: 12, maxWidth: 960, fontSize: 15, lineHeight: 1.8, color: "#cbd5e1" }}>
                  En esta ventana defines los módulos del sistema y, sobre esa misma base, construyes perfiles reutilizables con permisos por módulo y por acción. Los módulos que crees aquí serán los mismos que luego se usan en la ventana de usuarios para asignar visibilidad y acceso.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button type="button" onClick={openCreateModule} style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#f5df9f", border: "1px solid rgba(212,175,55,0.24)", background: "rgba(212,175,55,0.12)", cursor: "pointer" }}><LayersIcon className="h-4 w-4" />Crear módulo</button>
                <button type="button" onClick={openCreateProfile} style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer", boxShadow: "0 12px 30px rgba(0,0,0,0.16)" }}><PlusIcon className="h-4 w-4" />Crear perfil</button>
              </div>
            </div>
          </header>

          <section className="pp-stats" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 24 }}>
            {[
              { label: "Perfiles creados", value: profiles.length },
              { label: "Módulos visibles", value: totalVisibleModules },
              { label: "Módulos en borrador", value: modules.filter((m) => m.status === "draft").length },
              { label: "Base para usuarios", value: "Parametrizada" },
            ].map((item) => (
              <div key={item.label} style={{ ...cardBase, padding: 18 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>{item.label}</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </section>

          <div className="pp-layout" style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1.06fr) minmax(0,0.94fr)", marginTop: 24 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ ...cardBase, padding: 24 }}>
                <div className="pp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Biblioteca de perfiles</h2>
                    <p style={{ fontSize: 14, color: "#94a3b8" }}>Perfiles reutilizables para asignarlos desde la ventana de usuarios.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "12px 14px", minWidth: 240 }}>
                    <SearchIcon className="h-4 w-4" />
                    <input value={profileQuery} onChange={(e) => setProfileQuery(e.target.value)} placeholder="Buscar perfil" style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "white", fontSize: 14 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  {filteredProfiles.map((profile) => {
                    const scope = scopeStyles(profile.scope);
                    const selected = selectedProfile?.id === profile.id;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedProfileId(profile.id)}
                        style={{ width: "100%", textAlign: "left", borderRadius: 24, padding: 18, border: selected ? "1px solid rgba(212,175,55,0.28)" : "1px solid rgba(255,255,255,0.1)", background: selected ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.05)", cursor: "pointer", boxShadow: selected ? "0 0 0 1px rgba(212,175,55,0.18)" : "none" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <div style={{ minWidth: 220, flex: "1 1 360px" }}>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</div>
                            <div style={{ marginTop: 6, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>{profile.description}</div>
                          </div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, background: scope.bg, border: `1px solid ${scope.border}`, color: scope.color }}>
                            {scope.label}
                          </div>
                        </div>
                        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {profile.modules.slice(0, 5).map((moduleKey) => (
                            <span key={moduleKey} style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(36,59,122,0.16)", border: "1px solid rgba(36,59,122,0.24)", color: "#bfdbfe" }}>{moduleKey}</span>
                          ))}
                          {profile.modules.length > 5 && <span style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>+{profile.modules.length - 5} más</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ ...cardBase, padding: 24 }}>
                <div className="pp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Módulos del sistema</h2>
                    <p style={{ fontSize: 14, color: "#94a3b8" }}>Los módulos definidos aquí son la base de visibilidad para perfiles y usuarios.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "12px 14px", minWidth: 240 }}>
                    <SearchIcon className="h-4 w-4" />
                    <input value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} placeholder="Buscar módulo" style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "white", fontSize: 14 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  {filteredModules.map((module) => {
                    const status = moduleStatusStyles(module.status);
                    return (
                      <div key={module.id} style={{ borderRadius: 24, padding: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <div style={{ minWidth: 220, flex: "1 1 360px" }}>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{module.name}</div>
                            <div style={{ marginTop: 6, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>{module.description}</div>
                            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
                              <span style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>{module.group}</span>
                              <span style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(36,59,122,0.16)", border: "1px solid rgba(36,59,122,0.24)", color: "#bfdbfe" }}>{module.key}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>{status.label}</span>
                            <button type="button" onClick={() => openEditModule(module)} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 14, padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}><EditIcon className="h-4 w-4" />Editar</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {selectedProfile && (
                <>
                  <div style={{ ...cardBase, padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <h2 style={{ fontSize: 26, fontWeight: 700 }}>{selectedProfile.name}</h2>
                        <p style={{ marginTop: 8, fontSize: 14, color: "#cbd5e1", lineHeight: 1.8 }}>{selectedProfile.description}</p>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, background: scopeStyles(selectedProfile.scope).bg, border: `1px solid ${scopeStyles(selectedProfile.scope).border}`, color: scopeStyles(selectedProfile.scope).color }}>{scopeStyles(selectedProfile.scope).label}</div>
                    </div>

                    <div className="pp-actions-grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))", marginTop: 18 }}>
                      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Módulos</div>
                        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{selectedProfile.modules.length}</div>
                      </div>
                      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Acciones</div>
                        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{Object.values(selectedProfile.permissions).reduce((acc, arr) => acc + arr.length, 0)}</div>
                      </div>
                      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Uso</div>
                        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>Reutilizable</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => openEditProfile(selectedProfile)} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer" }}><EditIcon className="h-4 w-4" />Editar perfil</button>
                    </div>
                  </div>

                  <div style={{ ...cardBase, padding: 24 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700 }}>Permisos por módulo</h3>
                    <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                      {selectedProfile.modules.map((moduleKey) => {
                        const moduleData = modules.find((m) => m.key === moduleKey);
                        const actions = selectedProfile.permissions[moduleKey] || [];
                        return (
                          <div key={moduleKey} style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{moduleData?.name || moduleKey}</div>
                            <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>{moduleData?.description || "Módulo parametrizado en la biblioteca."}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                              {actions.map((action) => (
                                <span key={action} style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(36,59,122,0.16)", border: "1px solid rgba(36,59,122,0.24)", color: "#bfdbfe" }}>{ACTIONS.find((a) => a.key === action)?.label || action}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ ...cardBase, padding: 24 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700 }}>Lógica de integración con usuarios</h3>
                    <p style={{ marginTop: 8, fontSize: 14, color: "#cbd5e1", lineHeight: 1.8 }}>
                      Los perfiles definidos aquí son los que después se asignan en la ventana de usuarios. Los módulos visibles también nacen aquí, por lo que la seguridad y la visibilidad del sistema quedan gobernadas por configuración y no por condicionales rígidos en código.
                    </p>
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                      {[
                        { title: "Perfil", text: "Agrupa módulos visibles y acciones permitidas." },
                        { title: "Módulo", text: "Se define una sola vez y luego puede reutilizarse en distintos perfiles." },
                        { title: "Usuario", text: "Recibe un perfil ya parametrizado desde la ventana de gestión de usuarios." },
                      ].map((item) => (
                        <div key={item.title} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>{item.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </div>

      {isProfileFormOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", padding: 16 }}>
          <div style={{ width: "min(1200px, 100%)", maxHeight: "92vh", overflow: "auto", ...cardBase, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                  <KeyIcon className="h-4 w-4" />
                  {editingProfileId ? "Editar perfil" : "Crear perfil"}
                </div>
                <h2 style={{ marginTop: 14, fontSize: 28, fontWeight: 700 }}>{editingProfileId ? "Configurar perfil reutilizable" : "Nuevo perfil de acceso"}</h2>
              </div>
              <button type="button" onClick={() => setIsProfileFormOpen(false)} style={{ borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cerrar</button>
            </div>

            <div className="pp-form-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: 22 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Nombre del perfil</label>
                <input style={inputStyle} value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Alcance</label>
                <select style={inputStyle} value={profileForm.scope} onChange={(e) => setProfileForm((p) => ({ ...p, scope: e.target.value as ProfileScope }))}>
                  <option value="global">Global</option>
                  <option value="company">Empresa</option>
                  <option value="module">Por módulo</option>
                </select>
              </div>
              <div className="pp-span-2" style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Descripción</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={profileForm.description} onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="pp-span-2" style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Módulos visibles del perfil</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                  {modules.filter((m) => m.status !== "hidden").map((module) => {
                    const checked = profileForm.modules.includes(module.key);
                    return (
                      <button key={module.key} type="button" onClick={() => toggleProfileModule(module.key)} style={{ borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, border: checked ? "1px solid rgba(36,59,122,0.28)" : "1px solid rgba(255,255,255,0.1)", background: checked ? "rgba(36,59,122,0.18)" : "rgba(255,255,255,0.05)", color: checked ? "#bfdbfe" : "#cbd5e1", cursor: "pointer" }}>{module.name}</button>
                    );
                  })}
                </div>
              </div>

              <div className="pp-span-2" style={{ gridColumn: "span 2", display: "grid", gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Acciones permitidas por módulo</label>
                {profileForm.modules.map((moduleKey) => {
                  const moduleData = modules.find((m) => m.key === moduleKey);
                  return (
                    <div key={moduleKey} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{moduleData?.name || moduleKey}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                        {ACTIONS.map((action) => {
                          const checked = (profileForm.permissions[moduleKey] || []).includes(action.key);
                          return (
                            <button key={action.key} type="button" onClick={() => toggleAction(moduleKey, action.key)} style={{ borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, border: checked ? "1px solid rgba(109,40,217,0.28)" : "1px solid rgba(255,255,255,0.1)", background: checked ? "rgba(109,40,217,0.16)" : "rgba(255,255,255,0.05)", color: checked ? "#ddd6fe" : "#cbd5e1", cursor: "pointer" }}>{action.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setIsProfileFormOpen(false)} style={{ borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={saveProfile} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer" }}><CheckIcon className="h-4 w-4" />Guardar perfil</button>
            </div>
          </div>
        </div>
      )}

      {isModuleFormOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", padding: 16 }}>
          <div style={{ width: "min(900px, 100%)", maxHeight: "92vh", overflow: "auto", ...cardBase, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                  <LayersIcon className="h-4 w-4" />
                  {editingModuleId ? "Editar módulo" : "Crear módulo"}
                </div>
                <h2 style={{ marginTop: 14, fontSize: 28, fontWeight: 700 }}>{editingModuleId ? "Modificar módulo del sistema" : "Nuevo módulo visible"}</h2>
              </div>
              <button type="button" onClick={() => setIsModuleFormOpen(false)} style={{ borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cerrar</button>
            </div>

            <div className="pp-form-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: 22 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Nombre del módulo</label>
                <input style={inputStyle} value={moduleForm.name} onChange={(e) => setModuleForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Clave técnica</label>
                <input style={inputStyle} value={moduleForm.key} onChange={(e) => setModuleForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Grupo</label>
                <input style={inputStyle} value={moduleForm.group} onChange={(e) => setModuleForm((p) => ({ ...p, group: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Estado</label>
                <select style={inputStyle} value={moduleForm.status} onChange={(e) => setModuleForm((p) => ({ ...p, status: e.target.value as ModuleStatus }))}>
                  <option value="active">Activo</option>
                  <option value="draft">Borrador</option>
                  <option value="hidden">Oculto</option>
                </select>
              </div>
              <div className="pp-span-2" style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Descripción</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={moduleForm.description} onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setIsModuleFormOpen(false)} style={{ borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={saveModule} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer" }}><CheckIcon className="h-4 w-4" />Guardar módulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
