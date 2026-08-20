-- MIGRATION: 59_hr_expansion_module_transactions.sql
-- Global public schema transaction seeds. Run once after 58b.
DO $$ DECLARE mod_id INTEGER; BEGIN
 SELECT id INTO mod_id FROM public.module_catalog WHERE code='human_resources';
 IF mod_id IS NULL THEN RAISE EXCEPTION 'human_resources module not found'; END IF;
 INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status) VALUES
 (mod_id,'hr_dashboard','Panel RRHH','Panel de Recursos Humanos','/hr/dashboard','layout-dashboard',0,TRUE,'activo'),
 (mod_id,'hr_my_profile','Mi perfil','Perfil personal del empleado','/hr/my-profile','id-card',6,TRUE,'activo'),
 (mod_id,'hr_request_types','Tipos de solicitud','Administración de tipos','/hr/request-types','list-checks',7,TRUE,'activo'),
 (mod_id,'hr_holidays','Feriados','Calendario de feriados','/hr/holidays','calendar-days',8,TRUE,'activo')
 ON CONFLICT (module_id, code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, route=EXCLUDED.route, icon=EXCLUDED.icon, tab_order=EXCLUDED.tab_order, menu_visible=EXCLUDED.menu_visible, status=EXCLUDED.status;
 UPDATE public.module_transactions SET route='/hr/approvals' WHERE module_id=mod_id AND code='hr_request_approvals';
 UPDATE public.module_transactions SET route=replace(route,'\','/') WHERE module_id=mod_id AND route LIKE '%\%';
 UPDATE public.module_transactions SET route='/hr/employees/:id' WHERE module_id=mod_id AND code='hr_employee_profile';
END $$;
