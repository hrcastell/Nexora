-- Script para resetear permisos del perfil admin_empresa a un estado más restrictivo
-- Ejecutar este script en cada schema de tenant (hernancius, etc.)
-- Reemplaza {schema_name} con el nombre del schema real

-- El super_admin luego puede ajustar estos permisos manualmente desde la UI

-- 1. Desactivar can_view en transacciones administrativas que NO debe ver admin_empresa
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = FALSE,
    can_create = FALSE,
    can_edit = FALSE,
    can_delete = FALSE,
    can_admin = FALSE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code IN ('modules', 'reports', 'subscriptions', 'commercial');

-- 2. Mantener acceso de solo lectura a companies (para ver su propia empresa)
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = TRUE,
    can_create = FALSE,
    can_edit = FALSE,
    can_delete = FALSE,
    can_admin = FALSE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code = 'companies';

-- 3. Permitir gestión completa de users (administrar usuarios de su empresa)
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = TRUE,
    can_create = TRUE,
    can_edit = TRUE,
    can_delete = TRUE,
    can_admin = TRUE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code = 'users';

-- 4. Permitir gestión completa de profiles (administrar perfiles de su empresa)
--    PERO el frontend ya filtra acceso_total y admin_empresa para non-super_admin
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = TRUE,
    can_create = TRUE,
    can_edit = TRUE,
    can_delete = FALSE,  -- no puede eliminar perfiles de sistema
    can_admin = TRUE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code = 'profiles';

-- 5. Dashboard - solo lectura
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = TRUE,
    can_create = FALSE,
    can_edit = FALSE,
    can_delete = FALSE,
    can_admin = FALSE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code = 'dashboard';

-- 6. Visual config - permitir personalizar
UPDATE {schema_name}.profile_transaction_permissions
SET can_view = TRUE,
    can_create = FALSE,
    can_edit = TRUE,
    can_delete = FALSE,
    can_admin = FALSE,
    updated_at = NOW()
WHERE profile_id = (SELECT id FROM {schema_name}.profiles WHERE code = 'admin_empresa')
  AND transaction_code = 'visual_config';

-- Verificar el resultado
SELECT
    p.code as perfil,
    ptp.transaction_code as transaccion,
    ptp.can_view as ver,
    ptp.can_create as crear,
    ptp.can_edit as editar,
    ptp.can_delete as eliminar,
    ptp.can_admin as admin
FROM {schema_name}.profile_transaction_permissions ptp
JOIN {schema_name}.profiles p ON p.id = ptp.profile_id
WHERE p.code = 'admin_empresa'
ORDER BY ptp.transaction_code;
