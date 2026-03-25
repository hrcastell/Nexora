import React, { useMemo, useState } from "react";

type IconProps = { className?: string };

type CompanyField = {
  label: string;
  value: string;
  span?: "full" | "half";
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

function MailIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function PhoneIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.4 19.4 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7l.5 3a2 2 0 01-.6 1.8l-1.3 1.3a16 16 0 006 6l1.3-1.3a2 2 0 011.8-.6l3 .5A2 2 0 0122 16.9z" />
    </svg>
  );
}

function MapPinIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 21s-6-5.4-6-11a6 6 0 1112 0c0 5.6-6 11-6 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function GlobeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 010 18" />
      <path d="M12 3a15 15 0 000 18" />
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

function EditIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function SaveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
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

function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const COMPANY_VIEW: CompanyField[] = [
  { label: "Razón social", value: "HrCastell Systems SpA" },
  { label: "Nombre comercial", value: "Nexora by HrCastell" },
  { label: "RUT / Identificación", value: "76.458.210-9" },
  { label: "Tipo de empresa", value: "Tecnología y soluciones SaaS" },
  { label: "Correo principal", value: "contacto@hrcastell.com" },
  { label: "Teléfono", value: "+56 9 8123 4567" },
  { label: "País", value: "Chile" },
  { label: "Ciudad", value: "Santiago" },
  { label: "Región", value: "Región Metropolitana" },
  { label: "Comuna", value: "San Joaquín" },
  { label: "Dirección", value: "Av. Referencial 2450, Oficina 402", span: "full" },
  { label: "Sitio web", value: "www.hrcastell.com" },
  { label: "Schema asociado", value: "public" },
  { label: "Estado comercial", value: "Activa" },
  { label: "Sponsor / Administrador", value: "hernan.castellanos@hrcastell.com", span: "full" },
];

export default function NexoraCompanyProfileV1() {
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState("HrCastell Systems SpA");
  const [tradeName, setTradeName] = useState("Nexora by HrCastell");
  const [rut, setRut] = useState("76.458.210-9");
  const [businessType, setBusinessType] = useState("Tecnología y soluciones SaaS");
  const [email, setEmail] = useState("contacto@hrcastell.com");
  const [phone, setPhone] = useState("+56 9 8123 4567");
  const [country, setCountry] = useState("Chile");
  const [city, setCity] = useState("Santiago");
  const [region, setRegion] = useState("Región Metropolitana");
  const [district, setDistrict] = useState("San Joaquín");
  const [address, setAddress] = useState("Av. Referencial 2450, Oficina 402");
  const [website, setWebsite] = useState("www.hrcastell.com");
  const [schema, setSchema] = useState("public");
  const [status, setStatus] = useState("Activa");
  const [sponsor, setSponsor] = useState("hernan.castellanos@hrcastell.com");
  const [saved, setSaved] = useState(false);

  const stats = useMemo(
    () => [
      { label: "Usuarios asociados", value: "18" },
      { label: "Módulos habilitados", value: "12" },
      { label: "Solicitudes procesadas", value: "94" },
      { label: "Última actualización", value: "Hoy · 10:42" },
    ],
    []
  );

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
      `}</style>

      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(124,58,237,0.22), transparent 28%), radial-gradient(circle at top right, rgba(212,175,55,0.18), transparent 22%), radial-gradient(circle at bottom, rgba(148,163,184,0.12), transparent 20%)" }} />
        <div className="orb-one" style={{ position: "absolute", left: "-4rem", top: "4rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(124,58,237,0.18)", filter: "blur(70px)" }} />
        <div className="orb-two" style={{ position: "absolute", right: "-2rem", top: "6rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(212,175,55,0.14)", filter: "blur(70px)" }} />

        <div style={{ position: "relative", maxWidth: 1440, margin: "0 auto", padding: "24px 20px 36px" }}>
          <header style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, background: "linear-gradient(180deg, rgba(36,59,122,0.24), rgba(8,16,31,0.96))", backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.14)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <div style={{ minWidth: 280, flex: "1 1 620px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: "1px solid rgba(212,175,55,0.28)", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                    <SparklesIcon className="h-4 w-4" />
                    Perfil de empresa
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1" }}>
                    Nexora / Configuración
                  </span>
                </div>
                <h1 style={{ marginTop: 16, fontSize: 36, lineHeight: 1.1, fontWeight: 700 }}>Perfil general de la empresa</h1>
                <p style={{ marginTop: 12, maxWidth: 860, fontSize: 15, lineHeight: 1.8, color: "#cbd5e1" }}>
                  Aquí se visualiza y administra la información general de la empresa, su contexto comercial, su identificación tributaria,
                  su ubicación principal y los datos estructurales asociados al tenant dentro de Nexora.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                {saved && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 14px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.24)", color: "#a7f3d0", fontSize: 13, fontWeight: 600 }}>
                    <CheckIcon className="h-4 w-4" />
                    Cambios guardados
                  </div>
                )}
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setSaved(false);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer", boxShadow: "0 12px 30px rgba(0,0,0,0.16)" }}>
                      <EditIcon className="h-4 w-4" />
                      Editar perfil
                    </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSaved(false);
                      }}
                      style={{ borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSaved(true);
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "white", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(90deg, #243b7a, #6d28d9, #d4af37)", cursor: "pointer", boxShadow: "0 12px 30px rgba(0,0,0,0.16)" }}>
                      <SaveIcon className="h-4 w-4" />
                      Guardar cambios
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 24 }}>
            {stats.map((item) => (
              <div key={item.label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, padding: 18, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>{item.label}</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </section>

          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1.08fr) minmax(340px,0.92fr)", marginTop: 24 }}>
            <section style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, background: "linear-gradient(180deg, rgba(36,59,122,0.16), rgba(8,16,31,0.96))", backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 46, height: 46, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,59,122,0.22)", color: "#d4af37" }}>
                  <BuildingIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>Información general</h2>
                  <p style={{ fontSize: 14, color: "#94a3b8" }}>Datos corporativos, tributarios y de localización principal.</p>
                </div>
              </div>

              {!isEditing ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
                  {COMPANY_VIEW.map((field) => (
                    <div key={field.label} style={{ gridColumn: field.span === "full" ? "span 2" : "span 1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, background: "rgba(255,255,255,0.05)", padding: 18 }}>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>{field.label}</div>
                      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "white", lineHeight: 1.7 }}>{field.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Razón social</label>
                    <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Nombre comercial</label>
                    <input style={inputStyle} value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>RUT / Identificación</label>
                    <input style={inputStyle} value={rut} onChange={(e) => setRut(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Tipo de empresa</label>
                    <input style={inputStyle} value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Correo principal</label>
                    <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Teléfono</label>
                    <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>País</label>
                    <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Ciudad</label>
                    <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Región</label>
                    <input style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Comuna</label>
                    <input style={inputStyle} value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Dirección</label>
                    <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Sitio web</label>
                    <input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Schema asociado</label>
                    <input style={inputStyle} value={schema} onChange={(e) => setSchema(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Estado comercial</label>
                    <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option>Activa</option>
                      <option>En revisión</option>
                      <option>Suspendida</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "span 2", display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Sponsor / Administrador</label>
                    <input style={inputStyle} value={sponsor} onChange={(e) => setSponsor(e.target.value)} />
                  </div>
                </div>
              )}
            </section>

            <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, background: "linear-gradient(180deg, rgba(36,59,122,0.16), rgba(8,16,31,0.96))", backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                    <ShieldIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700 }}>Resumen operativo</h2>
                    <p style={{ fontSize: 14, color: "#94a3b8" }}>Estado general del tenant dentro de Nexora.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Empresa activa</div>
                    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{isEditing ? companyName : "HrCastell Systems SpA"}</div>
                  </div>
                  <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Tenant / schema</div>
                    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{isEditing ? schema : "public"}</div>
                  </div>
                  <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Estado comercial</div>
                    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 12px", background: status === "Activa" ? "rgba(16,185,129,0.12)" : status === "En revisión" ? "rgba(212,175,55,0.12)" : "rgba(244,63,94,0.12)", border: status === "Activa" ? "1px solid rgba(16,185,129,0.24)" : status === "En revisión" ? "1px solid rgba(212,175,55,0.24)" : "1px solid rgba(244,63,94,0.24)", color: status === "Activa" ? "#a7f3d0" : status === "En revisión" ? "#f5df9f" : "#fecdd3", fontSize: 13, fontWeight: 700 }}>
                      {status}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, background: "linear-gradient(180deg, rgba(36,59,122,0.16), rgba(8,16,31,0.96))", backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Contactos y presencia</h2>
                <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <MailIcon className="h-5 w-5" />
                    <div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>Correo principal</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>{isEditing ? email : "contacto@hrcastell.com"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <PhoneIcon className="h-5 w-5" />
                    <div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>Teléfono</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>{isEditing ? phone : "+56 9 8123 4567"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <MapPinIcon className="h-5 w-5" />
                    <div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>Ubicación principal</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>{isEditing ? `${district}, ${city}, ${country}` : "San Joaquín, Santiago, Chile"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <GlobeIcon className="h-5 w-5" />
                    <div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>Sitio web</div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>{isEditing ? website : "www.hrcastell.com"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
