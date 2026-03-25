import React, { useMemo, useState } from "react";

type IconProps = { className?: string };
type ThemeMode = "dark" | "light";

type Wallpaper = {
  id: string;
  name: string;
  colors: [string, string, string?];
  labelTone: "dark" | "light";
};

type FontOption = {
  id: string;
  name: string;
  preview: string;
  family: string;
};

function SparklesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
      <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
    </svg>
  );
}

function MonitorIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function TypeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

function PaletteIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
      <path d="M7.5 11.5a1 1 0 100-2 1 1 0 000 2z" />
      <path d="M12 8.5a1 1 0 100-2 1 1 0 000 2z" />
      <path d="M16.5 11.5a1 1 0 100-2 1 1 0 000 2z" />
      <path d="M14.5 16a1 1 0 11-2 0c0-1.3 1-2 2.2-2H16a2 2 0 100-4" />
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

function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const WALLPAPERS: Wallpaper[] = [
  { id: "aurora", name: "Aurora", colors: ["#1b2049", "#10254f", "#14386b"], labelTone: "dark" },
  { id: "sunset", name: "Sunset", colors: ["#df7adf", "#fd5d7a", "#f7a16e"], labelTone: "dark" },
  { id: "forest", name: "Forest", colors: ["#062734", "#163946", "#2e5968"], labelTone: "dark" },
  { id: "candy", name: "Candy", colors: ["#a28ed4", "#b697d4", "#d6add4"], labelTone: "dark" },
  { id: "midnight", name: "Midnight", colors: ["#000000", "#050608", "#171717"], labelTone: "dark" },
  { id: "ice", name: "Ice", colors: ["#b8d3da", "#b0d7df", "#d8e7ef"], labelTone: "light" },
  { id: "nebula", name: "Nebula", colors: ["#1e1136", "#4b1f74", "#9a4dff"], labelTone: "dark" },
  { id: "sand", name: "Sand", colors: ["#d6c3a1", "#e8d6b4", "#f4ead8"], labelTone: "light" },
];

const FONTS: FontOption[] = [
  { id: "inter", name: "Inter", preview: "Nexora Display", family: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "georgia", name: "Georgia", preview: "Nexora Display", family: "Georgia, Cambria, serif" },
  { id: "mono", name: "Jet Mono", preview: "Nexora Display", family: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const PRESET_COLORS = ["#243B7A", "#6D28D9", "#D4AF37", "#C0C7D1", "#10B981", "#F97316", "#EC4899", "#06B6D4"];

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function wallpaperBackground(wallpaper: Wallpaper) {
  return `linear-gradient(135deg, ${wallpaper.colors[0]}, ${wallpaper.colors[1]} 55%, ${wallpaper.colors[2] ?? wallpaper.colors[1]})`;
}

export default function NexoraConfigVisualStylesV1() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [selectedWallpaper, setSelectedWallpaper] = useState("aurora");
  const [scale, setScale] = useState(100);
  const [fontId, setFontId] = useState("inter");
  const [fontSize, setFontSize] = useState(16);
  const [primaryColor, setPrimaryColor] = useState("#243B7A");
  const [accentColor, setAccentColor] = useState("#D4AF37");
  const [customColor, setCustomColor] = useState("#7C3AED");
  const [transparency, setTransparency] = useState(72);
  const [corner, setCorner] = useState(24);

  const currentWallpaper = useMemo(() => WALLPAPERS.find((item) => item.id === selectedWallpaper) || WALLPAPERS[0], [selectedWallpaper]);
  const currentFont = useMemo(() => FONTS.find((item) => item.id === fontId) || FONTS[0], [fontId]);

  const shellBg = mode === "dark" ? "#08101f" : "#eef4fb";
  const textColor = mode === "dark" ? "#ffffff" : "#0f172a";
  const mutedText = mode === "dark" ? "#cbd5e1" : "#475569";
  const softText = mode === "dark" ? "#94a3b8" : "#64748b";
  const surface = mode === "dark"
    ? `linear-gradient(180deg, ${hexToRgba(primaryColor, transparency / 220)}, rgba(8,16,31,0.96))`
    : `linear-gradient(180deg, ${hexToRgba(primaryColor, 0.12)}, rgba(255,255,255,0.95))`;
  const previewScale = scale / 100;

  return (
    <div style={{ minHeight: "100vh", overflow: "hidden", background: shellBg, color: textColor, fontSize: `${fontSize}px`, fontFamily: currentFont.family }}>
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
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(124,58,237,0.18), transparent 30%), radial-gradient(circle at top right, rgba(212,175,55,0.14), transparent 25%), radial-gradient(circle at bottom, rgba(59,130,246,0.08), transparent 24%)" }} />
        <div className="orb-one" style={{ position: "absolute", left: "-4rem", top: "4rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(124,58,237,0.15)", filter: "blur(70px)" }} />
        <div className="orb-two" style={{ position: "absolute", right: "-2rem", top: "6rem", width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(212,175,55,0.14)", filter: "blur(70px)" }} />

        <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto", padding: "24px 20px 32px" }}>
          <header style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ minWidth: 280, flex: "1 1 600px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", border: `1px solid ${hexToRgba(accentColor, 0.28)}`, background: hexToRgba(accentColor, 0.12), color: accentColor }}>
                    <SparklesIcon className="h-4 w-4" />
                    Estilos visuales
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: mutedText }}>
                    Nexora / Configuración
                  </span>
                </div>
                <h1 style={{ marginTop: 16, fontSize: 36, lineHeight: 1.1, fontWeight: 700 }}>Preferencias visuales del entorno</h1>
                <p style={{ marginTop: 12, maxWidth: 860, fontSize: 15, lineHeight: 1.8, color: mutedText }}>
                  Configura tema claro u oscuro, fondos de pantalla, escala visual, tipografías, colores de interfaz, transparencia y estilo general del entorno operativo de Nexora.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(140px, 1fr))", gap: 12, width: 360, maxWidth: "100%" }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Tema activo</div>
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: accentColor }}>{mode === "dark" ? "Oscuro" : "Claro"}</div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Fondo</div>
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{currentWallpaper.name}</div>
                </div>
              </div>
            </div>
          </header>

          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1.1fr) minmax(360px,0.9fr)", marginTop: 24 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: hexToRgba(primaryColor, 0.18), color: accentColor }}>
                    <MonitorIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Tema y fondo de pantalla</h2>
                    <p style={{ fontSize: 14, color: softText }}>Ajusta la base visual del sistema.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>Modo de interfaz</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 16 }}>
                      {(["dark", "light"] as ThemeMode[]).map((item) => {
                        const selected = mode === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setMode(item)}
                            style={{
                              borderRadius: 18,
                              padding: 16,
                              textAlign: "left",
                              border: selected ? `1px solid ${hexToRgba(accentColor, 0.4)}` : "1px solid rgba(255,255,255,0.1)",
                              background: selected ? `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.35)}, ${hexToRgba(accentColor, 0.18)})` : "rgba(255,255,255,0.05)",
                              color: textColor,
                              cursor: "pointer"
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{item === "dark" ? "Oscuro" : "Claro"}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: mutedText }}>{item === "dark" ? "Mayor contraste y enfoque" : "Entorno suave y limpio"}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 600 }}>Escala del entorno</div>
                      <span style={{ borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", fontSize: 12, color: mutedText }}>{scale}%</span>
                    </div>
                    <input type="range" min={80} max={120} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: "100%", marginTop: 16 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: softText }}>
                      <span>Compacto</span>
                      <span>Normal</span>
                      <span>Amplio</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 20 }}>
                  {WALLPAPERS.map((wallpaper) => {
                    const selected = selectedWallpaper === wallpaper.id;
                    const darkLabel = wallpaper.labelTone === "dark";
                    return (
                      <button
                        key={wallpaper.id}
                        type="button"
                        onClick={() => setSelectedWallpaper(wallpaper.id)}
                        style={{
                          position: "relative",
                          height: 176,
                          borderRadius: 22,
                          overflow: "hidden",
                          cursor: "pointer",
                          border: selected ? "2px solid white" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: selected ? `0 0 0 2px ${hexToRgba(accentColor, 0.35)}` : "none",
                          background: wallpaperBackground(wallpaper)
                        }}
                      >
                        {selected && (
                          <div style={{ position: "absolute", right: 12, top: 12, width: 30, height: 30, borderRadius: 9999, background: "white", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CheckIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div style={{ position: "absolute", left: 14, bottom: 14, borderRadius: 12, padding: "6px 12px", fontSize: 14, fontWeight: 700, background: darkLabel ? "rgba(0,0,0,0.38)" : "rgba(71,85,105,0.6)", color: "white" }}>
                          {wallpaper.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: hexToRgba(primaryColor, 0.18), color: accentColor }}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Tipografía y tamaño de letra</h2>
                    <p style={{ fontSize: 14, color: softText }}>Define legibilidad y densidad visual del entorno.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>Tipo de letra</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                      {FONTS.map((font) => {
                        const selected = fontId === font.id;
                        return (
                          <button
                            key={font.id}
                            type="button"
                            onClick={() => setFontId(font.id)}
                            style={{
                              width: "100%",
                              borderRadius: 18,
                              padding: 16,
                              textAlign: "left",
                              border: selected ? `1px solid ${hexToRgba(accentColor, 0.38)}` : "1px solid rgba(255,255,255,0.1)",
                              background: selected ? hexToRgba(primaryColor, 0.24) : "rgba(255,255,255,0.05)",
                              color: textColor,
                              cursor: "pointer"
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{font.name}</div>
                            <div style={{ marginTop: 8, fontSize: 22, fontFamily: font.family }}>{font.preview}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 600 }}>Tamaño de la letra</div>
                      <span style={{ borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", fontSize: 12, color: mutedText }}>{fontSize}px</span>
                    </div>
                    <input type="range" min={12} max={20} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: "100%", marginTop: 16 }} />
                    <div style={{ marginTop: 20, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: mode === "dark" ? "rgba(11,19,38,0.5)" : "rgba(255,255,255,0.72)", padding: 16 }}>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Vista previa</div>
                      <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>Panel principal</div>
                      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.8, color: mutedText }}>
                        Ajusta la legibilidad según el tipo de operación, densidad de datos y preferencia visual del usuario.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: hexToRgba(primaryColor, 0.18), color: accentColor }}>
                    <PaletteIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Colores y variantes adicionales</h2>
                    <p style={{ fontSize: 14, color: softText }}>Combina colores preseleccionados con tonos personalizados.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>Colores preseleccionados</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 16 }}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPrimaryColor(color)}
                          style={{
                            height: 48,
                            borderRadius: 16,
                            cursor: "pointer",
                            background: color,
                            border: primaryColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.15)",
                            boxShadow: primaryColor === color ? `0 0 0 2px ${hexToRgba(accentColor, 0.25)}` : "none"
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: 20 }}>
                      <label style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 12 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Color principal</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 48, height: 40, border: 0, background: "transparent", padding: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{primaryColor}</span>
                        </div>
                      </label>
                      <label style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 12 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Color de acento</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: 48, height: 40, border: 0, background: "transparent", padding: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{accentColor}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>Color adicional personalizado</div>
                    <div style={{ marginTop: 16, borderRadius: 18, border: "1px dashed rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ width: 64, height: 56, border: 0, background: "transparent", padding: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>Color adicional</div>
                          <div style={{ marginTop: 4, fontSize: 14, color: mutedText }}>Úsalo para badges, estados secundarios o elementos decorativos.</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                        <span style={{ borderRadius: 9999, padding: "6px 12px", fontSize: 14, fontWeight: 600, color: "white", background: customColor }}>Custom tag</span>
                        <span style={{ borderRadius: 9999, padding: "6px 12px", fontSize: 14, fontWeight: 600, color: customColor, background: hexToRgba(customColor, 0.16), border: `1px solid ${hexToRgba(customColor, 0.24)}` }}>Secondary accent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: hexToRgba(primaryColor, 0.18), color: accentColor }}>
                    <LayersIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Transparencia y superficie</h2>
                    <p style={{ fontSize: 14, color: softText }}>Controla la intensidad visual de cards, paneles y bloques.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 600 }}>Nivel de transparencia</div>
                      <span style={{ borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", fontSize: 12, color: mutedText }}>{transparency}%</span>
                    </div>
                    <input type="range" min={30} max={95} step={1} value={transparency} onChange={(e) => setTransparency(Number(e.target.value))} style={{ width: "100%", marginTop: 16 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20 }}>
                      <div style={{ fontWeight: 600 }}>Redondeo de superficies</div>
                      <span style={{ borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", fontSize: 12, color: mutedText }}>{corner}px</span>
                    </div>
                    <input type="range" min={12} max={32} step={2} value={corner} onChange={(e) => setCorner(Number(e.target.value))} style={{ width: "100%", marginTop: 16 }} />
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>Aplicación sugerida</div>
                    <ul style={{ marginTop: 16, display: "grid", gap: 12, fontSize: 14, lineHeight: 1.8, color: mutedText }}>
                      <li>• Cards principales con transparencia media para mantener contraste.</li>
                      <li>• Paneles laterales con un poco más de opacidad para lectura de tablas.</li>
                      <li>• Elementos secundarios usando el color adicional personalizado.</li>
                      <li>• Ajustes globales pensados para usarse tanto en tema claro como oscuro.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <aside>
              <div style={{ position: "sticky", top: 24, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", background: surface }}>
                <div style={{ fontSize: 14, color: softText }}>Vista previa en vivo</div>
                <h2 style={{ marginTop: 8, fontSize: 30, fontWeight: 700 }}>Cómo se verá Nexora</h2>

                <div style={{ marginTop: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", borderRadius: corner + 4, background: wallpaperBackground(currentWallpaper), transform: `scale(${previewScale})`, transformOrigin: "top center" }}>
                  <div style={{ background: "rgba(0,0,0,0.18)", padding: 16 }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 16, backdropFilter: "blur(18px)", borderRadius: corner, background: mode === "dark" ? hexToRgba(primaryColor, transparency / 200) : hexToRgba("#FFFFFF", 0.74) }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.72)" }}>Dashboard</div>
                          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: "white" }}>Configuración visual</div>
                        </div>
                        <div style={{ borderRadius: 16, padding: "8px 12px", fontSize: 14, fontWeight: 700, color: "white", background: accentColor }}>Activo</div>
                      </div>

                      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
                        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: Math.max(corner - 4, 12), padding: 16, background: hexToRgba(customColor, 0.16) }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Card principal</div>
                          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.82)" }}>Ejemplo de panel con color adicional y superficie translúcida.</div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                          <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: Math.max(corner - 6, 12), padding: 16, background: hexToRgba(primaryColor, 0.22) }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.72)" }}>Fuente</div>
                            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: "white" }}>{currentFont.name}</div>
                          </div>
                          <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: Math.max(corner - 6, 12), padding: 16, background: hexToRgba(accentColor, 0.18) }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.72)" }}>Texto base</div>
                            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: "white" }}>{fontSize}px</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: 20 }}>
                  <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Principal</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: primaryColor }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{primaryColor}</span>
                    </div>
                  </div>
                  <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: softText }}>Acento</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: accentColor }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{accentColor}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                  <button type="button" style={{ borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "white", boxShadow: "0 12px 30px rgba(0,0,0,0.16)", background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`, border: "none", cursor: "pointer" }}>
                    Guardar preferencias
                  </button>
                  <button type="button" style={{ borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600, color: mutedText, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>
                    Restablecer valores
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
