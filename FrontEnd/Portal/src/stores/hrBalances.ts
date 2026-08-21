import { defineStore } from 'pinia';
import { ref } from 'vue';
import { hrBalancesService } from '../services/hrBalances';
import type { HrBalance, HrBalanceConfig, HrBalanceMovement } from '../types/hr';
export const useHrBalancesStore = defineStore('hrBalances', () => {
 const items=ref<HrBalance[]>([]), current=ref<HrBalance[]|null>(null), loading=ref(false), error=ref<string|null>(null), movements=ref<HrBalanceMovement[]>([]);
 async function load(){loading.value=true;error.value=null;try{items.value=(await hrBalancesService.mine()).data;return items.value;}catch(cause:any){error.value=cause?.response?.data?.error||'Error al cargar saldos';throw cause;}finally{loading.value=false;}}
 async function loadOne(employeeId:number){loading.value=true;error.value=null;try{const rows=(await hrBalancesService.byEmployee(employeeId)).data;current.value=rows;return current.value;}catch(cause:any){error.value=cause?.response?.data?.error||'Error al cargar saldo';throw cause;}finally{loading.value=false;}}
 async function update(employeeId:number,code:string,data:HrBalanceConfig){const balance=(await hrBalancesService.update(employeeId,code,data)).data;items.value=items.value.map(item=>item.balance_code===code?{...item,...balance}:item);if(current.value)current.value=current.value.map(item=>item.balance_code===code?{...item,...balance}:item);return balance;}
 async function loadMovements(employeeId:number,balanceCode:string,period:'current'|'all'='current'){movements.value=(await hrBalancesService.movements(employeeId,balanceCode,period)).data;return movements.value;}
 return {items,current,loading,error,movements,load,loadOne,update,loadMovements};
});
