import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import api from '../utils/axios';

export type ThemeMode = 'dark' | 'light';

// Nexora Brand Colors
export const NEXORA_COLORS = {
  nightBlue: '#08101f',      // Fondo principal
  darkBlue: '#0b1326',       // Cards oscuro
  navyBlue: '#243b7a',       // Azul primario
  royalPurple: '#7c3aed',    // Morado acento
  gold: '#d4af37',           // Dorado acento
  silver: '#c0c7d1',         // Plateado texto
  lightSilver: '#d8dde5',    // Plateado claro
};

export type Wallpaper = {
  id: string;
  name: string;
  colors: [string, string, string?];
  labelTone: 'dark' | 'light';
  isDefault?: boolean;
};

export type FontOption = {
  id: string;
  name: string;
  preview: string;
  family: string;
};

// Default Nexora Configuration
export const DEFAULT_CONFIG = {
  mode: 'dark' as ThemeMode,
  wallpaper: 'nexora-dark',
  scale: 100,
  fontId: 'inter',
  fontSize: 16,
  primaryColor: '#243b7a',   // Navy blue
  accentColor: '#d4af37',    // Gold
  customColor: '#7c3aed',    // Purple
  transparency: 85,          // High transparency for glass effect
  corner: 32,                // Large rounded corners (like login)
};

export const WALLPAPERS: Wallpaper[] = [
  // Nexora Brand Wallpapers
  { 
    id: 'nexora-dark', 
    name: 'Nexora Dark', 
    colors: ['#08101f', '#0c162d', '#1a1035'], 
    labelTone: 'dark',
    isDefault: true 
  },
  { 
    id: 'nexora-purple', 
    name: 'Nexora Purple', 
    colors: ['#0f0a1e', '#1e1136', '#3d1f61'], 
    labelTone: 'dark' 
  },
  { 
    id: 'nexora-gold', 
    name: 'Nexora Gold', 
    colors: ['#0a0810', '#1a1610', '#2d2415'], 
    labelTone: 'dark' 
  },
  // Legacy wallpapers
  { id: 'aurora', name: 'Aurora', colors: ['#1b2049', '#10254f', '#14386b'], labelTone: 'dark' },
  { id: 'sunset', name: 'Sunset', colors: ['#df7adf', '#fd5d7a', '#f7a16e'], labelTone: 'dark' },
  { id: 'forest', name: 'Forest', colors: ['#062734', '#163946', '#2e5968'], labelTone: 'dark' },
  { id: 'candy', name: 'Candy', colors: ['#a28ed4', '#b697d4', '#d6add4'], labelTone: 'dark' },
  { id: 'midnight', name: 'Midnight', colors: ['#000000', '#050608', '#171717'], labelTone: 'dark' },
  { id: 'ice', name: 'Ice', colors: ['#b8d3da', '#b0d7df', '#d8e7ef'], labelTone: 'light' },
  { id: 'nebula', name: 'Nebula', colors: ['#1e1136', '#4b1f74', '#9a4dff'], labelTone: 'dark' },
  { id: 'sand', name: 'Sand', colors: ['#d6c3a1', '#e8d6b4', '#f4ead8'], labelTone: 'light' },
];

export const FONTS: FontOption[] = [
  { id: 'inter', name: 'Inter', preview: 'Nexora Display', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'georgia', name: 'Georgia', preview: 'Nexora Display', family: 'Georgia, Cambria, serif' },
  { id: 'mono', name: 'Jet Mono', preview: 'Nexora Display', family: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

export const PRESET_COLORS = [
  '#243b7a', // Nexora Navy Blue
  '#7c3aed', // Nexora Purple
  '#d4af37', // Nexora Gold
  '#c0c7d1', // Nexora Silver
  '#10B981', // Emerald
  '#F97316', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

// Helper: hex to rgba
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper: hex to "r, g, b" string for use in rgba(var(--x), alpha)
export function hexToRgbStr(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

export function wallpaperBackground(wallpaper: Wallpaper): string {
  return `linear-gradient(135deg, ${wallpaper.colors[0]}, ${wallpaper.colors[1]} 55%, ${wallpaper.colors[2] ?? wallpaper.colors[1]})`;
}

export const useVisualConfigStore = defineStore('visualConfig', () => {
  // Current user â€” used to scope localStorage to a single user
  const _userId = ref<number | null>(null);
  const _legacyStorageKey = 'nexora_visual_config';
  const _storageKey = () => (_userId.value ? `nexora_visual_config_${_userId.value}` : null);

  // State - Nexora Defaults
  const mode = ref<ThemeMode>(DEFAULT_CONFIG.mode);
  const selectedWallpaper = ref(DEFAULT_CONFIG.wallpaper);
  const scale = ref(DEFAULT_CONFIG.scale);
  const fontId = ref(DEFAULT_CONFIG.fontId);
  const fontSize = ref(DEFAULT_CONFIG.fontSize);
  const primaryColor = ref(DEFAULT_CONFIG.primaryColor);
  const accentColor = ref(DEFAULT_CONFIG.accentColor);
  const customColor = ref(DEFAULT_CONFIG.customColor);
  const transparency = ref(DEFAULT_CONFIG.transparency);
  const corner = ref(DEFAULT_CONFIG.corner);

  // Computed
  const currentWallpaper = computed(() => 
    WALLPAPERS.find((item) => item.id === selectedWallpaper.value) || WALLPAPERS[0]
  );
  
  const currentFont = computed(() => 
    FONTS.find((item) => item.id === fontId.value) || FONTS[0]
  );

  const shellBg = computed(() => mode.value === 'dark' ? '#08101f' : '#eef4fb');
  const textColor = computed(() => mode.value === 'dark' ? '#ffffff' : '#0f172a');
  const mutedText = computed(() => mode.value === 'dark' ? '#cbd5e1' : '#475569');
  const softText = computed(() => mode.value === 'dark' ? '#94a3b8' : '#64748b');
  
  const surface = computed(() => {
    if (mode.value === 'dark') {
      const alpha      = transparency.value / 100;
      const alphaStrong = Math.min(alpha + 0.05, 1);
      return `linear-gradient(180deg, ${hexToRgba('#0b1326', alpha)}, ${hexToRgba('#08101f', alphaStrong)})`;
    }
    return `linear-gradient(180deg, #ffffff, #f8fafc)`;
  });

  const cardBg = computed(() => {
    if (mode.value === 'dark') {
      return hexToRgba('#091224', transparency.value / 100);
    }
    return hexToRgba('#ffffff', Math.max(transparency.value / 100, 0.75));
  });

  const cardBorder = computed(() => {
    if (mode.value === 'dark') {
      return 'rgba(255, 255, 255, 0.10)';
    }
    return 'rgba(0, 0, 0, 0.08)';
  });

  const previewScale = computed(() => scale.value / 100);

  // CSS variables for global application
  const cssVariables = computed(() => {
    const isDark = mode.value === 'dark';
    return {
      // Core colors
      '--nexora-shell-bg': isDark ? '#08101f' : '#f8fafc',
      '--nexora-text-color': isDark ? '#ffffff' : '#0f172a',
      '--nexora-muted-text': isDark ? '#94a3b8' : '#64748b',
      '--nexora-soft-text': isDark ? '#c0c7d1' : '#94a3b8',
      
      // Brand colors
      '--nexora-primary-color': primaryColor.value,
      '--nexora-primary-rgb': hexToRgbStr(primaryColor.value),
      '--nexora-accent-color': accentColor.value,
      '--nexora-accent-rgb': hexToRgbStr(accentColor.value),
      '--nexora-custom-color': customColor.value,
      '--nexora-custom-rgb': hexToRgbStr(customColor.value),
      '--nexora-purple': '#7c3aed',
      '--nexora-gold': '#d4af37',
      '--nexora-silver': '#c0c7d1',
      '--nexora-night-blue': '#08101f',
      '--nexora-dark-blue': '#0b1326',
      
      // Surfaces
      '--nexora-surface': surface.value,
      '--nexora-card-bg': cardBg.value,
      '--nexora-card-border': cardBorder.value,
      '--nexora-border-color': isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      '--nexora-border-subtle': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      
      // Glass effects - opacity driven by transparency slider (30–95 → 0.30–0.95)
      '--nexora-glass-bg':        isDark ? hexToRgba('#091224', transparency.value / 100)         : 'rgba(255, 255, 255, 0.95)',
      '--nexora-glass-bg-strong': isDark ? hexToRgba('#091224', Math.min((transparency.value + 10) / 100, 1)) : 'rgba(255, 255, 255, 1.00)',
      '--nexora-glass-bg-subtle': isDark ? `rgba(255, 255, 255, ${Math.max((100 - transparency.value) / 1000, 0.03).toFixed(3)})` : 'rgba(0, 0, 0, 0.03)',
      '--nexora-glass-blur': isDark ? '16px' : '0px',
      
      // Layout
      '--nexora-sidebar-bg': isDark ? hexToRgba('#08101f', Math.min((transparency.value + 5) / 100, 0.98)) : 'rgba(248, 250, 252, 0.95)',
      '--nexora-font-family': currentFont.value.family,
      '--nexora-font-size': `${fontSize.value}px`,
      '--nexora-corner': `${corner.value}px`,
      '--nexora-corner-lg': `${corner.value + 8}px`,
      '--nexora-transparency': `${transparency.value}%`,
      '--nexora-scale': `${previewScale.value}`,
      
      // Button gradient - uses primary color and accent color dynamically
      '--nexora-btn-gradient': `linear-gradient(135deg, ${primaryColor.value} 0%, ${accentColor.value} 100%)`,
      '--nexora-btn-gradient-hover': `linear-gradient(135deg, ${primaryColor.value} 0%, ${customColor.value} 100%)`,
    };
  });

  // Actions
  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
  }

  function setWallpaper(wallpaperId: string) {
    selectedWallpaper.value = wallpaperId;
  }

  function setScale(newScale: number) {
    scale.value = newScale;
  }

  function setFont(newFontId: string) {
    fontId.value = newFontId;
  }

  function setFontSize(newSize: number) {
    fontSize.value = newSize;
  }

  function setPrimaryColor(color: string) {
    primaryColor.value = color;
  }

  function setAccentColor(color: string) {
    accentColor.value = color;
  }

  function setCustomColor(color: string) {
    customColor.value = color;
  }

  function setTransparency(newTransparency: number) {
    transparency.value = newTransparency;
  }

  function setCorner(newCorner: number) {
    corner.value = newCorner;
  }

  function resetToDefaults() {
    mode.value = DEFAULT_CONFIG.mode;
    selectedWallpaper.value = DEFAULT_CONFIG.wallpaper;
    scale.value = DEFAULT_CONFIG.scale;
    fontId.value = DEFAULT_CONFIG.fontId;
    fontSize.value = DEFAULT_CONFIG.fontSize;
    primaryColor.value = DEFAULT_CONFIG.primaryColor;
    accentColor.value = DEFAULT_CONFIG.accentColor;
    customColor.value = DEFAULT_CONFIG.customColor;
    transparency.value = DEFAULT_CONFIG.transparency;
    corner.value = DEFAULT_CONFIG.corner;
  }

  // Load from localStorage â€” uses user-specific key when userId is known
  function loadFromStorage() {
    try {
      const storageKey = _storageKey();
      if (!storageKey) {
        resetToDefaults();
        return;
      }

      const stored = localStorage.getItem(storageKey);
      if (stored) {
        applyConfig(JSON.parse(stored));
        return;
      }
      // One-time migration from legacy global key to user-specific key.
      const legacyStored = localStorage.getItem(_legacyStorageKey);
      if (legacyStored) {
        applyConfig(JSON.parse(legacyStored));
        localStorage.setItem(storageKey, JSON.stringify(getConfigSnapshot()));
        localStorage.removeItem(_legacyStorageKey);
        return;
      }

      resetToDefaults();
    } catch {
      // Ignore storage errors
    }
  }

  // Bind a user ID and immediately load their config from localStorage.
  // Called after login; ensures different users never share visual state.
  function setUser(userId: number) {
    if (_userId.value === userId) return;
    _userId.value = userId;
    loadFromStorage();
  }

  function clearUserContext() {
    _userId.value = null;
    resetToDefaults();
  }

  function getConfigSnapshot() {
    return {
      mode: mode.value,
      selectedWallpaper: selectedWallpaper.value,
      scale: scale.value,
      fontId: fontId.value,
      fontSize: fontSize.value,
      primaryColor: primaryColor.value,
      accentColor: accentColor.value,
      customColor: customColor.value,
      transparency: transparency.value,
      corner: corner.value,
    };
  }

  function applyConfig(config: Record<string, any>) {
    mode.value              = config.mode              ?? DEFAULT_CONFIG.mode;
    selectedWallpaper.value = config.selectedWallpaper ?? DEFAULT_CONFIG.wallpaper;
    scale.value             = config.scale             ?? DEFAULT_CONFIG.scale;
    fontId.value            = config.fontId            ?? DEFAULT_CONFIG.fontId;
    fontSize.value          = config.fontSize          ?? DEFAULT_CONFIG.fontSize;
    primaryColor.value      = config.primaryColor      ?? DEFAULT_CONFIG.primaryColor;
    accentColor.value       = config.accentColor       ?? DEFAULT_CONFIG.accentColor;
    customColor.value       = config.customColor       ?? DEFAULT_CONFIG.customColor;
    transparency.value      = config.transparency      ?? DEFAULT_CONFIG.transparency;
    corner.value            = config.corner            ?? DEFAULT_CONFIG.corner;
  }

  // Save to user-specific localStorage key + API
  function saveToStorage() {
    const storageKey = _storageKey();
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(getConfigSnapshot()));
    } catch {
      // Ignore storage errors
    }
    void saveToApi();
  }

  // Load from API. On success overwrites localStorage with the authoritative DB value.
  async function loadFromApi() {
    if (!_userId.value) return;

    try {
      const { data } = await api.get('/auth/visual-config');
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        applyConfig(data);
        const storageKey = _storageKey();
        try {
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(getConfigSnapshot()));
          }
        } catch { /* ignore */ }
      }
    } catch {
      // API unavailable - keep whatever loadFromStorage / setUser already applied
    }
  }

  // Save to API (silent on failure; localStorage is the fallback)
  async function saveToApi() {
    if (!_userId.value) return;

    try {
      await api.put('/auth/visual-config', getConfigSnapshot());
    } catch {
      // Ignore - localStorage still has the data
    }
  }

  // Initialize with anonymous/default state (no userId yet)
  loadFromStorage();

  return {
    // State
    mode,
    selectedWallpaper,
    scale,
    fontId,
    fontSize,
    primaryColor,
    accentColor,
    customColor,
    transparency,
    corner,
    // Computed
    currentWallpaper,
    currentFont,
    shellBg,
    textColor,
    mutedText,
    softText,
    surface,
    cardBg,
    cardBorder,
    previewScale,
    cssVariables,
    // Actions
    setMode,
    setWallpaper,
    setScale,
    setFont,
    setFontSize,
    setPrimaryColor,
    setAccentColor,
    setCustomColor,
    setTransparency,
    setCorner,
    resetToDefaults,
    setUser,
    clearUserContext,
    loadFromStorage,
    saveToStorage,
    loadFromApi,
    saveToApi,
  };
});

