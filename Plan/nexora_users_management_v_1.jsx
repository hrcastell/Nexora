import React, { useMemo, useState } from "react";

type IconProps = { className?: string };

type UserStatus = "active" | "suspended" | "disabled";
type PermissionLevel = "total" | "module" | "supervision";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  profile: string;
  company: string;
  status: UserStatus;
  permissionLevel: PermissionLevel;
  modules: string[];
};

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

function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l7 3v6c0 4.5-2.8 7.9-7 9-4.2-1.1-7-4.5-7-9V6l7-3z" />
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

function TrashIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function PauseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function BanIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 19L19 5" />
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

function BriefcaseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M3 12h18" />
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

const INITIAL_USERS: UserItem[] = [
  {
    id: "1",
    name: "Hernan Castellanos",
    email: "hernan.castellanos@hrcastell.com",
    role: "Administrador",
    jobTitle: "CEO",
    profile: "Acceso total",
    company: "HrCastell Systems Core",
    status: "active",
    permissionLevel: "total",
    modules: ["Todos los módulos del esquema"],
  },
  {
    id: "2",
    name: "Maria Rincón",
    email: "maria.rincon@empresa.cl",
    role: "Usuario",
    jobTitle: "Jefa de Recursos Humanos",
    profile: "Gestión Humana / Supervisor",
    company: "HrCastell Systems Core",
    status: "active",
    permissionLevel: "module",
    modules: ["Empleados", "Sueldos", "Contratos", "Horarios", "Reportes RRHH"],
  },
  {
    id: "3",
    name: "Carlos Méndez",
    email: "carlos.mendez@empresa.cl",
    role: "Supervisor",
    jobTitle: "Jefe de Operaciones",
    profile: "Operación / Supervisor",
    company: "HrCastell Systems Core",
    status: "suspended",
    permissionLevel: "supervision",
    modules: ["Órdenes", "Agenda", "Inventario lectura"],
  },
  {
    id: "4",
    name: "Ana Torres",
    email: "ana.torres@empresa.cl",
    role: "Usuario",
    jobTitle: "Analista Contable",
    profile: "Finanzas",
    company: "HrCastell Systems Core",
    status: "disabled",
    permissionLevel: "module",
    modules: ["Facturación", "Cobranza", "Pagos"],
  },
];

const STATUS_OPTIONS: UserStatus[] = ["active", "suspended", "disabled"];
const ROLE_OPTIONS = ["Administrador", "Usuario", "Supervisor", "Auditor"];
const JOB_OPTIONS = ["CEO", "Jefa de Recursos Humanos", "Jefe de Operaciones", "Analista Contable", "Recepcionista", "Bodeguero"];
const PROFILE_OPTIONS = ["Acceso total", "Gestión Humana / Supervisor", "Operación / Supervisor", "Finanzas", "Inventario", "Consulta"];
const MODULE_OPTIONS = ["Empleados", "Sueldos", "Contratos", "Horarios", "Reportes RRHH", "Órdenes", "Agenda", "Inventario", "Facturación", "Cobranza", "Pagos", "Configuración"];

function statusStyles(status: UserStatus) {
  if (status === "active") return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.24)", color: "#a7f3d0", label: "Activo" };
  if (status === "suspended") return { bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.24)", color: "#f5df9f", label: "Suspendido" };
  return { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.24)", color: "#fecdd3", label: "Inhabilitado" };
}

function permissionStyles(level: PermissionLevel) {
  if (level === "total") return { bg: "rgba(109,40,217,0.12)", border: "rgba(109,40,217,0.24)", color: "#ddd6fe", label: "Acceso total" };
  if (level === "module") return { bg: "rgba(36,59,122,0.16)", border: "rgba(36,59,122,0.24)", color: "#bfdbfe", label: "Por módulo" };
  return { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.24)", color: "#a5f3fc", label: "Supervisión" };
}

export default function NexoraUsersManagementV1() {
  const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_USERS[0].id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserItem>({
    id: "",
    name: "",
    email: "",
    role: "Usuario",
    jobTitle: "Recepcionista",
    profile: "Consulta",
    company: "HrCastell Systems Core",
    status: "active",
    permissionLevel: "module",
    modules: [],
  });

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesText =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        user.jobTitle.toLowerCase().includes(term) ||
        user.profile.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [users, query, statusFilter]);

  const selectedUser = filteredUsers.find((u) => u.id === selectedId) || users.find((u) => u.id === selectedId) || filteredUsers[0] || users[0];

  const totals = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      disabled: users.filter((u) => u.status === "disabled").length,
    };
  }, [users]);

  function openCreate() {
    setEditingId(null);
    setForm({
      id: "",
      name: "",
      email: "",
      role: "Usuario",
      jobTitle: "Recepcionista",
      profile: "Consulta",
      company: "HrCastell Systems Core",
      status: "active",
      permissionLevel: "module",
      modules: [],
    });
    setIsFormOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditingId(user.id);
    setForm({ ...user });
    setIsFormOpen(true);
  }

  function saveUser() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingId) {
      setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...form, id: editingId } : u)));
      setSelectedId(editingId);
    } else {
      const id = `${Date.now()}`;
      const newUser = { ...form, id };
      setUsers((prev) => [newUser, ...prev]);
      setSelectedId(id);
    }
    setIsFormOpen(false);
  }

  function deleteUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (selectedId === id) {
      const next = users.find((u) => u.id !== id);
      if (next) setSelectedId(next.id);
    }
  }

  function updateStatus(id: string, status: UserStatus) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  }

  function toggleModule(module: string) {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module],
    }));
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
          .users-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .users-stats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .users-header { flex-direction: column !important; align-items: stretch !important; }
          .users-filters { width: 100% !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .span-2 { grid-column: span 1 !important; }
        }
        @media (max-width: 720px) {
          .users-stats { grid-template-columns: 1fr !important; }
          .user-actions { flex-wrap: wrap; }
          .toolbar-actions { flex-direction: column; }
        }
      `}</style>

      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(124,58,237,0.22), transparent 28%), radial-gradient(circle at top right, rgba(212,175,55,0.18), transparent 22%), radial-gradient(circle at bottom, rgba(148,163,184,0.12), transparent 20%)" }} />
        <div className="orb-one" style={{ position: "absolute", left: "-4rem", top: "4rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(124,58,237,0.18)", filter: "blur(70px)" }} />
        <div className="orb-two" style={{ position: "absolute", right: "-2rem", top: "6rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(212,175,55,0.14)", filter: "blur(70px)" }} />

        <div style={{ position: "relative", maxWidth: 1480, margin: "0 auto", padding: "24px 20px 36px" }}>
          <header style={{ ...cardBase, padding: 24 }}>
            <div className="users-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 280, flex: "1 1 620px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                    <SparklesIcon className="h-4 w-4" />
                    Gestión de usuarios
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1" }}>
                    Nexora / Seguridad y visibilidad
                  </span>
                </div>
                <h1 style={{ marginTop: 16, fontSize: 36, lineHeight: 1.1, fontWeight: 700 }}>Usuarios, accesos y permisos</h1>
                <p style={{ marginTop: 12, maxWidth: 900, fontSize: 15, lineHeight: 1.8, color: "#cbd5e1" }}>
                  Desde esta ventana puedes crear, modificar, eliminar, inhabilitar o suspender usuarios, además de asignar rol, cargo y perfil. El objetivo es parametrizar accesos, visibilidad y acciones por módulo para mantener el código limpio y desacoplar reglas duras del sistema.
                </p>
              </div>

              <div className="toolbar-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={openCreate}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer", boxShadow: "0 12px 30px rgba(0,0,0,0.16)" }}>
                  <PlusIcon className="h-4 w-4" />
                  Crear usuario
                </button>
              </div>
            </div>
          </header>

          <section className="users-stats" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 24 }}>
            {[
              { label: "Usuarios totales", value: totals.total },
              { label: "Activos", value: totals.active },
              { label: "Suspendidos", value: totals.suspended },
              { label: "Inhabilitados", value: totals.disabled },
            ].map((item) => (
              <div key={item.label} style={{ ...cardBase, padding: 18 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>{item.label}</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </section>

          <div className="users-layout" style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1.15fr) minmax(340px,0.85fr)", marginTop: 24 }}>
            <section style={{ ...cardBase, padding: 24 }}>
              <div className="users-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>Directorio de usuarios</h2>
                  <p style={{ fontSize: 14, color: "#94a3b8" }}>Gestión completa de accesos, perfiles y estados operativos.</p>
                </div>
                <div className="users-filters" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", width: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "12px 14px", minWidth: 240 }}>
                    <SearchIcon className="h-4 w-4" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar usuario, perfil o cargo"
                      style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "white", fontSize: 14 }}
                    />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 180, padding: "12px 14px" }}>
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="suspended">Suspendidos</option>
                    <option value="disabled">Inhabilitados</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {filteredUsers.map((user) => {
                  const status = statusStyles(user.status);
                  const permission = permissionStyles(user.permissionLevel);
                  const selected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 24,
                        padding: 18,
                        border: selected ? "1px solid rgba(212,175,55,0.28)" : "1px solid rgba(255,255,255,0.1)",
                        background: selected ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        boxShadow: selected ? "0 0 0 1px rgba(212,175,55,0.18)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ minWidth: 220, flex: "1 1 320px" }}>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: "#cbd5e1" }}>{user.email}</div>
                          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>{status.label}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: permission.bg, border: `1px solid ${permission.border}`, color: permission.color }}>{permission.label}</span>
                          </div>
                        </div>
                        <div style={{ minWidth: 220, flex: "1 1 300px", display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 13, color: "#94a3b8" }}>Rol: <span style={{ color: "white", fontWeight: 600 }}>{user.role}</span></div>
                          <div style={{ fontSize: 13, color: "#94a3b8" }}>Cargo: <span style={{ color: "white", fontWeight: 600 }}>{user.jobTitle}</span></div>
                          <div style={{ fontSize: 13, color: "#94a3b8" }}>Perfil: <span style={{ color: "white", fontWeight: 600 }}>{user.profile}</span></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {selectedUser && (
                <>
                  <div style={{ ...cardBase, padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <h2 style={{ fontSize: 24, fontWeight: 700 }}>{selectedUser.name}</h2>
                        <p style={{ marginTop: 6, fontSize: 14, color: "#cbd5e1" }}>{selectedUser.email}</p>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, background: statusStyles(selectedUser.status).bg, border: `1px solid ${statusStyles(selectedUser.status).border}`, color: statusStyles(selectedUser.status).color }}>
                        {statusStyles(selectedUser.status).label}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                      {[
                        { icon: <ShieldIcon className="h-4 w-4" />, label: "Rol", value: selectedUser.role },
                        { icon: <BriefcaseIcon className="h-4 w-4" />, label: "Cargo", value: selectedUser.jobTitle },
                        { icon: <KeyIcon className="h-4 w-4" />, label: "Perfil", value: selectedUser.profile },
                        { icon: <UsersIcon className="h-4 w-4" />, label: "Empresa", value: selectedUser.company },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,59,122,0.22)", color: "#d4af37" }}>{row.icon}</div>
                          <div>
                            <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.16em" }}>{row.label}</div>
                            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{row.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.16em" }}>Módulos permitidos</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                        {selectedUser.modules.map((module) => (
                          <span key={module} style={{ borderRadius: 9999, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "rgba(36,59,122,0.16)", border: "1px solid rgba(36,59,122,0.24)", color: "#bfdbfe" }}>
                            {module}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="user-actions" style={{ display: "flex", gap: 10, marginTop: 20 }}>
                      <button type="button" onClick={() => openEdit(selectedUser)} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer" }}><EditIcon className="h-4 w-4" />Editar</button>
                      <button type="button" onClick={() => updateStatus(selectedUser.id, "suspended")} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#f5df9f", border: "1px solid rgba(212,175,55,0.24)", background: "rgba(212,175,55,0.12)", cursor: "pointer" }}><PauseIcon className="h-4 w-4" />Suspender</button>
                      <button type="button" onClick={() => updateStatus(selectedUser.id, "disabled")} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#fecdd3", border: "1px solid rgba(244,63,94,0.24)", background: "rgba(244,63,94,0.12)", cursor: "pointer" }}><BanIcon className="h-4 w-4" />Inhabilitar</button>
                      <button type="button" onClick={() => deleteUser(selectedUser.id)} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#fecdd3", border: "1px solid rgba(244,63,94,0.24)", background: "rgba(244,63,94,0.12)", cursor: "pointer" }}><TrashIcon className="h-4 w-4" />Eliminar</button>
                    </div>
                  </div>

                  <div style={{ ...cardBase, padding: 24 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 700 }}>Modelo de permisos</h3>
                    <p style={{ marginTop: 8, fontSize: 14, color: "#cbd5e1", lineHeight: 1.8 }}>
                      Esta ventana está pensada para parametrizar accesos y evitar condicionales rígidos en código. El rol define el papel dentro de la app, el cargo representa el puesto laboral y el perfil determina qué módulos puede ver y qué acciones puede ejecutar.
                    </p>
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                      {[
                        { title: "Rol", text: "Papel funcional dentro de la aplicación: administrador, usuario, supervisor, auditor." },
                        { title: "Cargo", text: "Puesto laboral real: CEO, jefa de RRHH, recepcionista, analista, etc." },
                        { title: "Perfil", text: "Nivel de acceso y visibilidad sobre módulos y acciones concretas del sistema." },
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

      {isFormOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", padding: 16 }}>
          <div style={{ width: "min(1100px, 100%)", maxHeight: "92vh", overflow: "auto", ...cardBase, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                  <ShieldIcon className="h-4 w-4" />
                  {editingId ? "Editar usuario" : "Crear usuario"}
                </div>
                <h2 style={{ marginTop: 14, fontSize: 28, fontWeight: 700 }}>{editingId ? "Configurar accesos y permisos" : "Alta de nuevo usuario"}</h2>
                <p style={{ marginTop: 8, fontSize: 14, color: "#cbd5e1" }}>Define identidad, estado, rol, cargo, perfil y módulos visibles para mantener un modelo de seguridad parametrizable.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} style={{ borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cerrar</button>
            </div>

            <div className="form-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: 22 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Nombre completo</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Correo</label>
                <input style={inputStyle} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Rol</label>
                <select style={inputStyle} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                  {ROLE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Cargo</label>
                <select style={inputStyle} value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}>
                  {JOB_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Perfil</label>
                <select style={inputStyle} value={form.profile} onChange={(e) => setForm((p) => ({ ...p, profile: e.target.value }))}>
                  {PROFILE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Estado</label>
                <select style={inputStyle} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as UserStatus }))}>
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusStyles(option).label}</option>)}
                </select>
              </div>
              <div className="span-2" style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Nivel de acceso</label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
                  {(["total", "module", "supervision"] as PermissionLevel[]).map((level) => {
                    const selected = form.permissionLevel === level;
                    const style = permissionStyles(level);
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, permissionLevel: level, modules: level === "total" ? ["Todos los módulos del esquema"] : p.modules }))}
                        style={{ borderRadius: 18, padding: 16, textAlign: "left", border: selected ? `1px solid ${style.border}` : "1px solid rgba(255,255,255,0.1)", background: selected ? style.bg : "rgba(255,255,255,0.05)", color: "white", cursor: "pointer" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{style.label}</div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#cbd5e1" }}>
                          {level === "total" ? "Control total del esquema" : level === "module" ? "Acceso solo a módulos asignados" : "Seguimiento y supervisión"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="span-2" style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Módulos habilitados</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                  {MODULE_OPTIONS.map((module) => {
                    const checked = form.modules.includes(module);
                    const disabled = form.permissionLevel === "total";
                    return (
                      <button
                        key={module}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleModule(module)}
                        style={{ borderRadius: 9999, padding: "8px 12px", fontSize: 12, fontWeight: 700, border: checked ? "1px solid rgba(36,59,122,0.28)" : "1px solid rgba(255,255,255,0.1)", background: checked ? "rgba(36,59,122,0.18)" : "rgba(255,255,255,0.05)", color: checked ? "#bfdbfe" : "#cbd5e1", opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                        {module}
                      </button>
                    );
                  })}
                </div>
                {form.permissionLevel === "total" && <div style={{ fontSize: 12, color: "#94a3b8" }}>Con acceso total no necesitas marcar módulos individuales.</div>}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setIsFormOpen(false)} style={{ borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={saveUser} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer" }}><CheckIcon className="h-4 w-4" />Guardar usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
