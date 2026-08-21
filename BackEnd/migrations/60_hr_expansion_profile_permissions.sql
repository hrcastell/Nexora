-- MIGRATION: 60_hr_expansion_profile_permissions.sql
-- Run per tenant after migration 59. Replace {schema_name}.
DO $$ DECLARE v_profile_id INTEGER; v_tx_code VARCHAR; BEGIN
 FOREACH v_tx_code IN ARRAY ARRAY['hr_dashboard','hr_my_profile','hr_request_types','hr_holidays'] LOOP
  FOR v_profile_id IN SELECT id FROM {schema_name}.profiles WHERE code IN ('acceso_total','admin_empresa') LOOP
   INSERT INTO {schema_name}.profile_transaction_permissions (profile_id,transaction_code,can_view,can_create,can_edit,can_delete,can_approve,can_export,can_admin)
   VALUES (v_profile_id,v_tx_code,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE) ON CONFLICT (profile_id,transaction_code) DO NOTHING;
  END LOOP;
 END LOOP;
END $$;