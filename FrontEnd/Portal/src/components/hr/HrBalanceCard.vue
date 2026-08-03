<script setup lang="ts">
import type { HrBalance } from '../../types/hr';
const props = defineProps<{ balance: HrBalance; used: number; label: string | undefined; compact: boolean | undefined }>();
const labels: Record<string,string>={vacation_days:'Vacaciones',permission_hours:'Horas de permiso'};
const number=(value:number)=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(Number(value||0));
const progress=()=>props.balance.entitlement>0?Math.min(100,(props.used/props.balance.entitlement)*100):0;
</script><template><article class="rounded-xl border border-white/10 bg-white/5 p-4 text-white" :class="{'p-3':props.compact}"><p class="text-sm text-slate-300">{{props.label||labels[props.balance.balance_code]||props.balance.balance_code}}</p><p class="mt-2 text-sm">Derecho {{number(props.balance.entitlement)}} / Usado {{number(props.used)}}</p><div class="mt-2 h-2 overflow-hidden rounded bg-white/10"><div class="h-full bg-cyan-400" :style="{width:`${progress()}%`}" /></div><p class="mt-2 text-2xl font-semibold">Disponible {{number(props.balance.available)}}</p></article></template>
