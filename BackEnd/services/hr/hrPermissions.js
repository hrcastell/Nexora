const db = require('../../config/db');
async function hasTransaction(schema,userId,code,actions=['can_view'],isSuperAdmin=false) {
 if (isSuperAdmin) return true;
 const columns=actions.filter((action)=>['can_view','can_create','can_edit','can_delete','can_approve','can_export','can_admin'].includes(action));
 if(!columns.length)return false;
 const result=await db.query(`SELECT COALESCE(bool_or(${columns.map((column)=>`ptp.${column}`).join(' OR ')}), FALSE) AS allowed FROM ${schema}.user_tenant_profiles utp JOIN ${schema}.profile_transaction_permissions ptp ON ptp.profile_id=utp.profile_id WHERE utp.user_id=$1 AND ptp.transaction_code=$2`,[userId,code]);
 return result.rows[0]?.allowed===true;
}
module.exports={hasTransaction};
