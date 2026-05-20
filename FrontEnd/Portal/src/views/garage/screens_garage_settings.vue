<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Car, Users, Wrench, Package, Settings, DollarSign } from 'lucide-vue-next';

const router = useRouter();

const SECTIONS = [
  { icon: Car,        label: 'Catálogos de Vehículos', desc: 'Marcas, modelos, colores, tipos, combustibles y transmisiones', route: '/garage/catalogs' },
  { icon: Users,      label: 'Empleados / Mecánicos',   desc: 'Gestión del equipo de trabajo del taller',                   route: '/garage/employees' },
  { icon: DollarSign, label: 'Tarifas de Mano de Obra', desc: 'Tarifas por hora por empleado con validez temporal',        route: '/garage/labor-rates' },
  { icon: Package,    label: 'Productos y Repuestos',    desc: 'Catálogo de productos utilizados en los servicios',         route: '/garage/products' },
  { icon: Wrench,     label: 'Servicios Configurables',  desc: 'Plantillas de servicios con productos y tarifas predefinidas', route: '/garage/service-templates' },
];
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-2xl">
    <div class="flex items-center gap-3">
      <Settings :size="22" class="text-white/60" />
      <h1 class="text-xl font-semibold text-white">Configuración del Taller</h1>
    </div>

    <div class="flex flex-col gap-3">
      <button
        v-for="sec in SECTIONS"
        :key="sec.route"
        class="flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/10 text-left hover:border-white/25 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        @click="router.push(sec.route)"
      >
        <component :is="sec.icon" :size="22" class="text-[var(--nexora-primary)] shrink-0" />
        <div>
          <p class="text-sm font-semibold text-white">{{ sec.label }}</p>
          <p class="text-xs text-white/40 mt-0.5">{{ sec.desc }}</p>
        </div>
      </button>
    </div>
  </div>
</template>
