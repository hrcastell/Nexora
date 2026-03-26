import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export type ThemeMode = 'dark' | 'light';

export type Wallpaper = {
  id: string;
  name: string;
  colors: [string, string, string?];
  labelTone: 'dark' | 'light';
};

export type FontOption = {
  id: string;
  name: string;
  preview: string;
  family: string;
};

export const WALLPAPERS: Wallpaper[] = [
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

export const PRESET_COLORS = ['#243B7A', '#6D28D9', '#D4AF37', '#C0C7D1', '#10B981', '#F97316', '#EC4899', '#06B6D4'];

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
  // State
  const mode = ref<ThemeMode>('dark');
  const selectedWallpaper = ref('aurora');
  const scale = ref(100);
  const fontId = ref('inter');
  const fontSize = ref(16);
  const primaryColor = ref('#243B7A');
  const accentColor = ref('#D4AF37');
  const customColor = ref('#7C3AED');
  const transparency = ref(72);
  const corner = ref(24);

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
      return `linear-gradient(180deg, ${hexToRgba(primaryColor.value, transparency.value / 220)}, rgba(8,16,31,0.96))`;
    }
    return `linear-gradient(180deg, ${hexToRgba(primaryColor.value, 0.12)}, rgba(255,255,255,0.95))`;
  });

  const previewScale = computed(() => scale.value / 100);

  // CSS variables for global application
  const cssVariables = computed(() => {
    const isDark = mode.value === 'dark';
    return {
      '--nexora-shell-bg': shellBg.value,
      '--nexora-text-color': textColor.value,
      '--nexora-muted-text': mutedText.value,
      '--nexora-soft-text': softText.value,
      '--nexora-primary-color': primaryColor.value,
      '--nexora-primary-rgb': hexToRgbStr(primaryColor.value),
      '--nexora-accent-color': accentColor.value,
      '--nexora-accent-rgb': hexToRgbStr(accentColor.value),
      '--nexora-custom-color': customColor.value,
      '--nexora-custom-rgb': hexToRgbStr(customColor.value),
      '--nexora-surface': surface.value,
      '--nexora-border-color': isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)',
      '--nexora-glass-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      '--nexora-glass-bg-strong': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      '--nexora-sidebar-bg': isDark ? 'rgba(7,17,32,0.92)' : 'rgba(238,244,251,0.92)',
      '--nexora-font-family': currentFont.value.family,
      '--nexora-font-size': `${fontSize.value}px`,
      '--nexora-corner': `${corner.value}px`,
      '--nexora-transparency': `${transparency.value}%`,
      '--nexora-scale': `${previewScale.value}`,
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
    mode.value = 'dark';
    selectedWallpaper.value = 'aurora';
    scale.value = 100;
    fontId.value = 'inter';
    fontSize.value = 16;
    primaryColor.value = '#243B7A';
    accentColor.value = '#D4AF37';
    customColor.value = '#7C3AED';
    transparency.value = 72;
    corner.value = 24;
  }

  // Load from localStorage on init
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem('nexora_visual_config');
      if (stored) {
        const config = JSON.parse(stored);
        mode.value = config.mode ?? 'dark';
        selectedWallpaper.value = config.selectedWallpaper ?? 'aurora';
        scale.value = config.scale ?? 100;
        fontId.value = config.fontId ?? 'inter';
        fontSize.value = config.fontSize ?? 16;
        primaryColor.value = config.primaryColor ?? '#243B7A';
        accentColor.value = config.accentColor ?? '#D4AF37';
        customColor.value = config.customColor ?? '#7C3AED';
        transparency.value = config.transparency ?? 72;
        corner.value = config.corner ?? 24;
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      localStorage.setItem('nexora_visual_config', JSON.stringify({
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
      }));
    } catch {
      // Ignore storage errors
    }
  }

  // Initialize
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
    loadFromStorage,
    saveToStorage,
  };
});
