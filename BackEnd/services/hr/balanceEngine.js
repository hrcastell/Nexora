const db = require('../../config/db');

function dateOnly(value) {
    if (!(value instanceof Date)) return String(value).slice(0, 10);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function toIso(value) {
    if (!(value instanceof Date)) return String(value).slice(0, 10);
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function anniversary(year, hireDate) {
    const month = hireDate.getUTCMonth(); const day = hireDate.getUTCDate();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}
function resolvePeriod(hireDate, today = new Date()) {
    if (!hireDate) {
        const error = new Error('El empleado no tiene fecha de ingreso registrada');
        error.statusCode = 400;
        throw error;
    }
    const hire = new Date(`${dateOnly(hireDate)}T00:00:00Z`);
    if (Number.isNaN(hire.getTime())) {
        const error = new Error('Fecha de ingreso inválida');
        error.statusCode = 400;
        throw error;
    }
    const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    let start = anniversary(current.getUTCFullYear(), hire);
    if (start > current) start = anniversary(current.getUTCFullYear() - 1, hire);
    const end = new Date(anniversary(start.getUTCFullYear() + 1, hire)); end.setUTCDate(end.getUTCDate() - 1);
    return { start: toIso(start), end: toIso(end) };
}
function countBusinessDays(startDate, endDate, holidaySet) {
    if (!startDate || !endDate || startDate > endDate) return 0;
    holidaySet = holidaySet || [];
    const holidays = holidaySet instanceof Set ? null : holidaySet;
    let count = 0;
    for (let day = new Date(`${startDate}T00:00:00Z`); day <= new Date(`${endDate}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
        if ([0, 6].includes(day.getUTCDay())) continue;
        const iso = toIso(day); const monthDay = iso.slice(5);
        const holiday = holidaySet instanceof Set ? holidaySet.has(iso) : holidays.some((row) => {
            if (row.status === 'inactive' || row.is_working_day === true) return false;
            const start = dateOnly(row.holiday_date);
            const end = dateOnly(row.end_date || row.holiday_date);
            if (!row.is_recurring) return iso >= start && iso <= end;
            const startDay = start.slice(5); const endDay = end.slice(5);
            return startDay <= endDay
                ? monthDay >= startDay && monthDay <= endDay
                : monthDay >= startDay || monthDay <= endDay;
        });
        if (!holiday) count += 1;
    }
    return count;
}
async function ensureAccrual(client, schema, balance, period, userId = null, today = new Date()) {
    const cap = balance.accrual_cap == null ? Infinity : Number(balance.accrual_cap);
    const base = Math.min(Number(balance.base_entitlement), cap);
    const insert = async (seq, quantity, notes) => client.query(`INSERT INTO ${schema}.hr_balance_movements (leave_balance_id,employee_id,balance_code,movement_type,signed_quantity,period_start,period_end,accrual_seq,notes,created_by) VALUES ($1,$2,$3,'accrual',$4,$5,$6,$7,$8,$9) ON CONFLICT (leave_balance_id,period_start,accrual_seq) WHERE movement_type='accrual' DO NOTHING RETURNING signed_quantity`, [balance.id,balance.employee_id,balance.balance_code,quantity,period.start,period.end,seq,notes,userId]);
    const persisted = await client.query(`SELECT accrual_seq, signed_quantity FROM ${schema}.hr_balance_movements WHERE leave_balance_id=$1 AND movement_type='accrual' AND period_start=$2 AND period_end=$3 ORDER BY accrual_seq`, [balance.id,period.start,period.end]);
    const existing = new Map(persisted.rows.map((row) => [Number(row.accrual_seq), Number(row.signed_quantity)]));
    let accrued = [...existing.values()].reduce((total, quantity) => total + quantity, 0);
    const refreshAccrued = async () => { const result = await client.query(`SELECT COALESCE(SUM(signed_quantity),0) AS accrued FROM ${schema}.hr_balance_movements WHERE leave_balance_id=$1 AND movement_type='accrual' AND period_start=$2 AND period_end=$3`, [balance.id,period.start,period.end]); accrued=Number(result.rows[0].accrued); };
    if (!existing.has(0) && base > 0) { const result = await insert(0, base, 'Base entitlement'); if (result.rowCount) accrued += Number(result.rows[0].signed_quantity); else await refreshAccrued(); }
    if (!balance.accrual_enabled || Number(balance.accrual_per_month) <= 0) return;
    const start = new Date(`${period.start}T00:00:00Z`); const current = new Date(`${toIso(today)}T00:00:00Z`);
    let months = (current.getUTCFullYear()-start.getUTCFullYear())*12 + current.getUTCMonth()-start.getUTCMonth();
    const due=(month)=>{const year=start.getUTCFullYear()+Math.floor((start.getUTCMonth()+month)/12);const monthIndex=(start.getUTCMonth()+month)%12;return new Date(Date.UTC(year,monthIndex,Math.min(start.getUTCDate(),new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate())));}; if (current < due(months)) months -= 1;
    for (let seq=1; seq<=Math.max(0,months); seq+=1) { if (existing.has(seq)) continue; const quantity=Math.max(0,Math.min(Number(balance.accrual_per_month),cap-accrued)); if (quantity>0) { const result=await insert(seq,quantity,`Automatic accrual ${seq}`); if(result.rowCount) accrued+=Number(result.rows[0].signed_quantity); else await refreshAccrued(); } }
}
async function getAvailableBalance(client, schema, balanceId, period) {
    const result = await client.query(`SELECT b.*, COALESCE(SUM(m.signed_quantity),0) AS movements_total,
       COALESCE(SUM(m.signed_quantity),0) AS available,
       COALESCE(SUM(m.signed_quantity) FILTER (WHERE m.movement_type='accrual' AND m.accrual_seq > 0),0) AS accrued,
       COALESCE(SUM(m.signed_quantity) FILTER (WHERE m.movement_type IN ('reservation','reservation_release')),0) * -1 AS reserved,
       COALESCE(SUM(m.signed_quantity) FILTER (WHERE m.movement_type IN ('consumption','consumption_reversal')),0) * -1 AS consumed,
       COALESCE(SUM(m.signed_quantity) FILTER (WHERE m.movement_type='accrual' AND m.accrual_seq=0),0) AS entitlement
       FROM ${schema}.hr_leave_balances b LEFT JOIN ${schema}.hr_balance_movements m ON m.leave_balance_id=b.id AND m.period_start=$2 AND m.period_end=$3
       WHERE b.id=$1 GROUP BY b.id`, [balanceId, period.start, period.end]);
    return result.rows[0] || null;
}
async function movement(client, schema, balance, period, type, quantity, requestId, userId, note = null) {
    const signed = ['reservation','consumption'].includes(type) ? -Math.abs(quantity) : Math.abs(quantity);
    const result = await client.query(`INSERT INTO ${schema}.hr_balance_movements (leave_balance_id,employee_id,balance_code,request_id,movement_type,signed_quantity,period_start,period_end,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [balance.id, balance.employee_id, balance.balance_code, requestId || null, type, signed, period.start, period.end, note, userId]);
    return result.rows[0];
}
const reserve = (c,s,b,p,q,r,u,n) => movement(c,s,b,p,'reservation',q,r,u,n);
const release = (c,s,b,p,q,r,u,n) => movement(c,s,b,p,'reservation_release',q,r,u,n);
const consume = (c,s,b,p,q,r,u,n) => movement(c,s,b,p,'consumption',q,r,u,n);
const reverse = (c,s,b,p,q,r,u,n) => movement(c,s,b,p,'consumption_reversal',q,r,u,n);
module.exports = { dateOnly, resolvePeriod, countBusinessDays, ensureAccrual, getAvailableBalance, reserve, release, consume, reverse };
