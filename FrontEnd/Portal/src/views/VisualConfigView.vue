<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVisualConfigStore, WALLPAPERS, FONTS, PRESET_COLORS, wallpaperBackground, type ThemeMode } from '../stores/visualConfig';
import AppToast, { type ToastItem, type ToastType } from '../components/AppToast.vue';
import { Monitor, Type, Palette, Layers, Sparkles, Check, Save, RotateCcw, Sun, Moon } from 'lucide-vue-next';

const configStore = useVisualConfigStore();
const activeToast = ref<ToastItem | null>(null);

// Local draft state for previewing changes before applying
const draft = ref({
  mode: 'dark' as ThemeMode,
  selectedWallpaper: 'aurora',
  scale: 100,
  fontId: 'inter',
  fontSize: 16,
  primaryColor: '#243B7A',
  accentColor: '#D4AF37',
  customColor: '#7C3AED',
  transparency: 72,
  corner: 24,
});

// Initialize draft from current store state
const initDraft = () => {
  draft.value = {
    mode: configStore.mode,
    selectedWallpaper: configStore.selectedWallpaper,
    scale: configStore.scale,
    fontId: configStore.fontId,
    fontSize: configStore.fontSize,
    primaryColor: configStore.primaryColor,
    accentColor: configStore.accentColor,
    customColor: configStore.customColor,
    transparency: configStore.transparency,
    corner: configStore.corner,
  };
};

onMounted(() => {
  initDraft();
});

const textColor = computed(() => draft.value.mode === 'dark' ? '#ffffff' : '#0f172a');

// Helper to determine if a color is light (for contrast)
const isColorLight = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
};

// Helper to convert hex to rgb string for style bindings
const hexToRgbString = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

// Helper to show toast
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = {
    id: Date.now(),
    title,
    message,
    type
  };
};

// Actions
const saveConfiguration = () => {
  configStore.setMode(draft.value.mode);
  configStore.setWallpaper(draft.value.selectedWallpaper);
  configStore.setScale(draft.value.scale);
  configStore.setFont(draft.value.fontId);
  configStore.setFontSize(draft.value.fontSize);
  configStore.setPrimaryColor(draft.value.primaryColor);
  configStore.setAccentColor(draft.value.accentColor);
  configStore.setCustomColor(draft.value.customColor);
  configStore.setTransparency(draft.value.transparency);
  configStore.setCorner(draft.value.corner);
  
  configStore.saveToStorage();
  
  triggerToast('Configuración Guardada', 'Tus preferencias visuales se han aplicado correctamente.', 'success');
};

const resetConfiguration = () => {
  configStore.resetToDefaults();
  initDraft();
  triggerToast('Valores Restablecidos', 'Se han aplicado los valores por defecto de Nexora.', 'info');
};

// Helper to check if item is active (for styling)
const isActive = (condition: boolean) => condition;

</script>

<template>
  <div class="min-h-screen overflow-y-auto text-white" :style="{ color: textColor }">
    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
          <AppToast
            :toast="activeToast"
            @close="activeToast = null"
          />
        </div>
      </Transition>
    </Teleport>

    <div class="relative mx-auto max-w-6xl p-4 md:p-6">
      
      <!-- Header Card - Same style as sidebar menu items -->
      <div class="mb-4 rounded-2xl border nxr-surface p-4 md:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Sparkles class="h-5 w-5" />
            </div>
            <div>
              <h1 class="text-lg font-semibold text-white">Preferencias visuales</h1>
              <p class="text-sm text-slate-400">Configura el aspecto general del sistema</p>
            </div>
          </div>
          
          <!-- Action Buttons - Same style as sidebar -->
          <div class="hidden lg:flex gap-2">
            <button 
              @click="saveConfiguration"
              class="flex items-center gap-2 rounded-2xl border border-transparent nxr-btn-primary px-4 py-2.5 text-sm font-medium text-white transition"
            >
              <Save class="h-5 w-5" />
              <span class="hidden sm:inline">Guardar</span>
            </button>
            <button 
              @click="resetConfiguration"
              class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <RotateCcw class="h-5 w-5" />
              <span class="hidden sm:inline">Restablecer</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Grid - Responsive -->
      <div class="grid gap-4 lg:grid-cols-2">
        
        <!-- Tema y Fondo -->
        <div class="rounded-2xl border nxr-surface p-4 md:p-5">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Monitor class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Tema y fondo</h2>
              <p class="text-xs text-slate-400">Modo de interfaz y wallpaper</p>
            </div>
          </div>

          <!-- Modo Oscuro/Claro - Menu style buttons -->
          <div class="mb-4 grid grid-cols-2 gap-2">
            <button
              @click="draft.mode = 'dark'"
              class="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
              :class="!isActive(draft.mode === 'dark') ? 'border-transparent bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10' : ''"
              :style="isActive(draft.mode === 'dark') ? {
                borderColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.25)`,
                backgroundColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.1)`,
                color: 'white'
              } : {}"
            >
              <!-- <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                :style="{ 
                  color: draft.mode === 'light' ? '#000000' : (isActive(draft.mode === 'dark') ? draft.primaryColor : '#94a3b8'),
                  backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
                }">
                <MoonIcon />
              </div> -->

              <div
                class="flex h-10 w-10 items-center justify-center rounded-2xl"
                :style="{ 
                  backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
                }"
              >
                <Moon
                  class="h-5 w-5"
                  :style="{ 
                    color: draft.mode === 'light'
                      ? '#000000'
                      : (isActive(draft.mode === 'dark') ? draft.primaryColor : '#94a3b8')
                  }"
                />
              </div>              
              <div>
                <div class="text-sm font-medium">Oscuro</div>
                <div class="text-xs text-slate-400">Alto contraste</div>
              </div>
            </button>
            <button
              @click="draft.mode = 'light'"
              class="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
              :class="!isActive(draft.mode === 'light') ? 'border-transparent bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10' : ''"
              :style="isActive(draft.mode === 'light') ? {
                borderColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.25)`,
                backgroundColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.1)`,
                color: '#0f172a'
              } : {}"
            >
              <!-- <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                :style="{ 
                  color: draft.mode === 'light' ? '#000000' : '#94a3b8',
                  backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
                }">
                <SunIcon />
              </div> -->
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl"
                  :style="{ 
                    backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
                  }"
                >
                  <Sun
                    class="h-5 w-5"
                    :style="{ color: draft.mode === 'light' ? '#000000' : '#94a3b8' }"
                  />
                </div>              
              <div>
                <div class="text-sm font-medium">Claro</div>
                <div class="text-xs text-slate-400">Entorno suave</div>
              </div>
            </button>
          </div>

          <!-- Wallpapers - Grid -->
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="wallpaper in WALLPAPERS"
              :key="wallpaper.id"
              @click="draft.selectedWallpaper = wallpaper.id"
              class="relative aspect-square overflow-hidden rounded-2xl border-2 transition"
              :class="draft.selectedWallpaper === wallpaper.id ? 'border-white shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'"
              :style="{ background: wallpaperBackground(wallpaper) }"
            >
              <div v-if="draft.selectedWallpaper === wallpaper.id" class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#0f172a]">
                <Check class="h-5 w-5" />
              </div>
              <div class="absolute bottom-1 left-1 rounded-lg px-2 py-0.5 text-xs font-medium text-white bg-black/60" style="color: white !important;">
                {{ wallpaper.name }}
              </div>
            </button>
          </div>
        </div>

        <!-- Escala -->
        <div class="rounded-2xl border nxr-surface p-4 md:p-5">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Layers class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Escala y dimensiones</h2>
              <p class="text-xs text-slate-400">Tamaño de interfaz</p>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Scale -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-white">Escala del entorno</span>
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">{{ draft.scale }}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="120"
                step="5"
                v-model.number="draft.scale"
                class="w-full"
                :style="{ accentColor: draft.primaryColor }"
              />
              <div class="mt-2 flex justify-between text-xs text-slate-500">
                <span>Compacto</span>
                <span>Normal</span>
                <span>Amplio</span>
              </div>
            </div>

            <!-- Corner radius -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-white">Redondeo de esquinas</span>
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">{{ draft.corner }}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="2"
                v-model.number="draft.corner"
                class="w-full"
                :style="{ accentColor: draft.primaryColor }"
              />
            </div>
          </div>
        </div>

        <!-- Tipografía -->
        <div class="rounded-2xl border nxr-surface p-4 md:p-5">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Type class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Tipografía</h2>
              <p class="text-xs text-slate-400">Fuente y tamaño de texto</p>
            </div>
          </div>

          <div class="space-y-3">
            <!-- Font selection - Menu style -->
            <button
              v-for="font in FONTS"
              :key="font.id"
              @click="draft.fontId = font.id"
              class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
              :class="!isActive(draft.fontId === font.id) ? 'border-transparent bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10' : ''"
              :style="isActive(draft.fontId === font.id) ? {
                borderColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.25)`,
                backgroundColor: `rgba(${hexToRgbString(draft.primaryColor)}, 0.1)`,
                color: 'white'
              } : {}"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                :style="{ 
                  color: draft.mode === 'light' ? '#000000' : (isActive(draft.fontId === font.id) ? draft.primaryColor : '#94a3b8'),
                  backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
                }">
                <span class="text-lg" :style="{ fontFamily: font.family }">Aa</span>
              </div>
              <div>
                <div class="text-sm font-medium">{{ font.name }}</div>
                <div class="text-xs text-slate-400" :style="{ fontFamily: font.family }">{{ font.preview }}</div>
              </div>
            </button>

            <!-- Font size -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4 mt-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-white">Tamaño de letra</span>
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">{{ draft.fontSize }}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="20"
                step="1"
                v-model.number="draft.fontSize"
                class="w-full"
                :style="{ accentColor: draft.primaryColor }"
              />
            </div>
          </div>
        </div>

        <!-- Colores -->
        <div class="rounded-2xl border nxr-surface p-4 md:p-5">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Palette class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Colores</h2>
              <p class="text-xs text-slate-400">Personaliza la paleta</p>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Preset colors -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-medium text-white mb-3">Colores predefinidos</div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="color in PRESET_COLORS"
                  :key="color"
                  @click="draft.primaryColor = color"
                  class="h-10 rounded-xl border-2 transition relative flex items-center justify-center"
                  :class="draft.primaryColor === color ? 'border-white shadow-lg scale-105' : 'border-transparent hover:scale-105'"
                  :style="{ background: color }"
                >
                  <svg v-if="draft.primaryColor === color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="h-5 w-5 drop-shadow-md"
                    :class="isColorLight(color) ? 'text-black' : 'text-white'">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Custom colors - Menu style -->
            <div class="grid grid-cols-2 gap-3">
              <button
                @click=""
                class="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition border-transparent bg-white/5 hover:border-white/10 hover:bg-white/10"
              >
                <input 
                  type="color" 
                  v-model="draft.primaryColor" 
                  class="h-8 w-8 rounded-lg border-0 bg-transparent p-0 cursor-pointer"
                />
                <div>
                  <div class="text-xs text-slate-400">Principal</div>
                  <div class="text-sm font-medium text-white">{{ draft.primaryColor }}</div>
                </div>
              </button>
              <button
                @click=""
                class="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition border-transparent bg-white/5 hover:border-white/10 hover:bg-white/10"
              >
                <input 
                  type="color" 
                  v-model="draft.accentColor" 
                  class="h-8 w-8 rounded-lg border-0 bg-transparent p-0 cursor-pointer"
                />
                <div>
                  <div class="text-xs text-slate-400">Acento</div>
                  <div class="text-sm font-medium" :style="{ color: draft.accentColor }">{{ draft.accentColor }}</div>
                </div>
              </button>
            </div>

            <!-- Custom color -->
            <button
              @click=""
              class="flex items-center gap-3 rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/10"
            >
              <input 
                type="color" 
                v-model="draft.customColor" 
                class="h-8 w-8 rounded-lg border-0 bg-transparent p-0 cursor-pointer"
              />
              <div>
                <div class="text-xs text-slate-400">Color adicional personalizado</div>
                <div class="text-sm font-medium" :style="{ color: draft.customColor }">{{ draft.customColor }}</div>
              </div>
              <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium text-white" :style="{ background: draft.customColor }">Tag</span>
            </button>
          </div>
        </div>

        <!-- Transparencia - Full width on mobile, spans 2 cols on large -->
        <div class="rounded-2xl border nxr-surface p-4 md:p-5 lg:col-span-2">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
              :style="{ 
                color: draft.mode === 'light' ? '#000000' : draft.primaryColor,
                backgroundColor: draft.mode === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'
              }">
              <Layers class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Transparencia y superficie</h2>
              <p class="text-xs text-slate-400">Intensidad visual de paneles</p>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-white">Nivel de transparencia</span>
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">{{ draft.transparency }}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="1"
                v-model.number="draft.transparency"
                class="w-full"
                :style="{ accentColor: draft.primaryColor }"
              />
              <div class="mt-3 text-xs text-slate-400">
                Ajusta la opacidad de los paneles y cards. Valores más bajos = mayor transparencia.
              </div>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-medium text-white mb-2">Aplicación sugerida</div>
              <ul class="space-y-1.5 text-xs text-slate-400">
                <li class="flex items-start gap-2">
                  <span class="text-[#d4af37]">•</span>
                  <span>Cards principales: transparencia media para mantener contraste</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-[#d4af37]">•</span>
                  <span>Paneles laterales: mayor opacidad para lectura de tablas</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-[#d4af37]">•</span>
                  <span>Elementos secundarios: usar color adicional personalizado</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <!-- Mobile Actions (Bottom) -->
      <div class="mt-6 flex flex-col gap-3 lg:hidden">
        <button 
          @click="saveConfiguration"
          class="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent nxr-btn-primary px-6 py-4 text-base font-medium text-white transition shadow-lg"
        >
          <Save class="h-6 w-6" />
          <span>Guardar preferencias</span>
        </button>
        <button 
          @click="resetConfiguration"
          class="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10"
        >
          <RotateCcw class="h-6 w-6" />
          <span>Restablecer valores</span>
        </button>
      </div>

    </div>
  </div>
</template>
