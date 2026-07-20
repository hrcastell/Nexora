# Human Resources Core — Slice 1 — Directrices para Codex (ejecución manual)

Mismo mecanismo que Inventario: el usuario levanta Codex y le pega cada bloque de abajo. Los batches son secuenciales — no arrancar el siguiente hasta que el anterior esté mergeado a `develop`. Cada batch termina en su propia rama y worktree; Claude revisa antes de destrabar el próximo.

Diseño cerrado (Claude, fases SDD explore→propose→spec→design→tasks), guardado en Engram project `nexora`:
- `sdd/human-resources-core/explore` (#1236, con corrección de rama en #1237)
- `sdd/human-resources-core/proposal` (#1238)
- `sdd/human-resources-core/spec` (#1239)
- `sdd/human-resources-core/design` (#1240)
- `sdd/human-resources-core/tasks` (#1241)

## Reglas generales (aplican a los 6 batches)

- Repo: `C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora`
- Cada batch se trabaja en una rama nueva **basada en `develop`** (que ya tiene completo el Core de Inventario — migraciones 44/45 incluidas). No usar `main` ni `hotfix/dental-core` como base.
- Cada batch termina commiteado en su rama, sin abrir PR ni mergear — eso lo hace Claude/el usuario después de revisar.
- Postgres 10.23 únicamente: nada de `EXECUTE FUNCTION` (usar `EXECUTE PROCEDURE` si hace falta algún trigger), nada de extensiones. Todo migration debe ser pegable a mano en phpPgAdmin.
- Módulo técnico = `human_resources` (sin abreviar) en `module_catalog.code`, en `routeModuleMap.js` y en la categoría de notificación. Prefijo de transacciones = `hr_`.
- Próxima migración libre: **46** (Inventario usó 44 y 45 en `develop`).
- **`employees` se extiende en el lugar donde está hoy** (sección "CORE 1 — GARAGE OPERATIONS" de `tenant_schema.sql` y en la migración de garage) — NO se relocaliza ni se duplica. RRHH pasa a ser el editor autoritativo de los campos nuevos; Taller sigue leyendo `employee_id` sin poder escribir esos campos.
- No tocar tablas/archivos de `dental_core`, `garage_operations`, `financial_core` ni `inventory` salvo donde se indica explícitamente (extensión de `employees` y de `tenant_schema.sql`).
- **Gotcha ya conocido, no te lo olvides**: `BackEnd/controllers/notificationsController.js` tiene su propia lista `VALID_CATEGORIES` hardcodeada, separada del `CHECK` de la migración de notificaciones. Cualquier categoría nueva necesita editar ESE archivo también, no solo la migración SQL.
- **Antes de reportar cualquier batch como terminado**: correr `grep -n "?"` sobre TODOS los archivos que crees o edites en ese batch (no solo los editados) y revisar cada resultado a mano — en los batches de Inventario, varias veces se coló un "?" literal reemplazando tildes/eñes/el separador "·", incluso en archivos recién creados. Los "?" que son parte de un operador ternario (`condicion ? a : b`) son válidos, no los toques.
- Estilo backend/frontend: seguir el patrón `view -> store -> service -> controller`, Pinia, `NxrSlidePanel` para catálogos chicos y para flujos de revisión/decisión (aprobar/rechazar), pantallas completas (full-screen) para el perfil integral del empleado. La cola de aprobaciones va en slide-panel, NO en pantalla completa (es un flujo de revisión corto, no un documento con grilla de líneas como las compras de Inventario).
- Si el diff de un batch supera ~400 líneas, partirlo en sub-ramas apiladas sobre la misma rama base, en orden.

---

## BATCH A — Migraciones DB (bloquea B, C, D, E)

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora (Postgres 10.23, schema-per-tenant).
Crear rama feat/hr-core-a-db desde develop (que ya tiene el Core de Inventario completo).

Implementar el Batch A del Core de RRHH (Slice 1):

1) Crear Database/04_migrations/46_human_resources_core_module.sql con DOS
   secciones, siguiendo el mismo patrón que Database/04_migrations/44_inventory_core_module.sql
   (leerlo como plantilla más fresca que dental, ya tiene el mismo tipo de FK diferida
   que vas a necesitar acá):

   SECCIÓN A (schema public, una sola vez):
   - INSERT en public.module_catalog: code='human_resources', name='Recursos Humanos',
     category='business_core', is_core, menu flags/version, ON CONFLICT (code) DO UPDATE.
   - Bloque DO $$ ... $$ que resuelve mod_id y hace upsert bulk en
     public.module_transactions con estos 5 códigos:
     hr_employees, hr_employee_profile, hr_org_settings, hr_requests, hr_request_approvals
     — con ON CONFLICT (module_id, code) DO UPDATE.

   SECCIÓN B (por tenant, placeholder {schema_name}), en este orden estricto por FKs:

   1. CREATE TABLE IF NOT EXISTS {schema_name}.hr_departments
      Campos: id, code (UNIQUE por schema), name, status ('active'/'inactive' default 'active'),
      created_at, updated_at.
   2. CREATE TABLE IF NOT EXISTS {schema_name}.hr_positions — mismos campos que hr_departments.
   3. CREATE TABLE IF NOT EXISTS {schema_name}.hr_cost_centers — mismos campos.
   4. CREATE TABLE IF NOT EXISTS {schema_name}.hr_work_shifts — mismos campos.
   5. CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_types
      Campos: id, code (UNIQUE), name, description, requires_dates BOOLEAN DEFAULT FALSE,
      status VARCHAR DEFAULT 'active'. Sembrar con INSERT ... ON CONFLICT (code) DO NOTHING:
      ('leave','Vacaciones/Licencia',...), ('permission','Permiso',...), ('general','General',...).
   6. ALTER TABLE {schema_name}.employees ADD COLUMN IF NOT EXISTS ... — 18 columnas,
      cada una en su propio ADD COLUMN IF NOT EXISTS:
      employee_code VARCHAR(30) NULL,
      user_id INTEGER NULL,
      work_email VARCHAR(150) NULL,
      personal_email VARCHAR(150) NULL,
      mobile_phone VARCHAR(50) NULL,
      birth_date DATE NULL,
      hire_date DATE NULL,
      termination_date DATE NULL,
      employment_status VARCHAR(20) NOT NULL DEFAULT 'draft',
      employment_type VARCHAR(20) NULL,
      department_id INTEGER NULL,
      position_id INTEGER NULL,
      supervisor_employee_id INTEGER NULL,
      cost_center_id INTEGER NULL,
      work_shift_id INTEGER NULL,
      privacy_level VARCHAR(20) NULL,
      created_by INTEGER NULL,
      updated_by INTEGER NULL.
      Agregar CHECK constraints (en bloques DO $$ guardados con pg_constraint, mismo
      estilo que la FK diferida de inventario) para:
      - employment_status IN ('draft','active','inactive','on_leave','terminated','suspended')
      - employment_type IN ('full_time','part_time','contractor','intern','temporary')
   7. Bloques DO $$ guardados (chequeando pg_constraint antes de agregar, mismo shape
      que fk_products_preferred_supplier de inventario) para 5 FKs sobre employees:
      - department_id -> hr_departments(id) ON DELETE SET NULL (fk_employees_department)
      - position_id -> hr_positions(id) ON DELETE SET NULL (fk_employees_position)
      - cost_center_id -> hr_cost_centers(id) ON DELETE SET NULL (fk_employees_cost_center)
      - work_shift_id -> hr_work_shifts(id) ON DELETE SET NULL (fk_employees_work_shift)
      - supervisor_employee_id -> employees(id) ON DELETE SET NULL (fk_employees_supervisor,
        es AUTO-referencia a la misma tabla employees)
   8. CREATE TABLE IF NOT EXISTS {schema_name}.hr_requests
      Campos: id, request_type_id INTEGER NOT NULL REFERENCES hr_request_types(id),
      employee_id INTEGER NOT NULL REFERENCES employees(id) (el solicitante),
      title VARCHAR(150), description TEXT, start_date DATE NULL, end_date DATE NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted','supervisor_approved','supervisor_rejected',
        'hr_approved','hr_rejected','annulled')),
      current_step VARCHAR(20) NOT NULL DEFAULT 'supervisor' CHECK (current_step IN
        ('supervisor','hr','done')),
      created_by INTEGER, updated_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP.
   9. CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_approvals
      Campos: id, request_id INTEGER NOT NULL REFERENCES hr_requests(id) ON DELETE CASCADE,
      step VARCHAR(20) NOT NULL CHECK (step IN ('supervisor','hr')),
      decision VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (decision IN
        ('pending','approved','rejected')),
      decided_by INTEGER NULL, decided_at TIMESTAMP NULL, comment TEXT NULL.
   10. CREATE TABLE IF NOT EXISTS {schema_name}.hr_request_status_history
       Campos: id, request_id INTEGER NOT NULL REFERENCES hr_requests(id) ON DELETE CASCADE,
       from_status VARCHAR(30), to_status VARCHAR(30), actor_user_id INTEGER,
       actor_role VARCHAR(30), note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP.
   11. Índices: FKs de todas las tablas nuevas, employees.supervisor_employee_id,
       hr_requests.status, hr_requests.employee_id, hr_requests.current_step.

2) Crear Database/04_migrations/47_notifications_human_resources_category.sql,
   mirando LITERALMENTE Database/04_migrations/45_notifications_inventory_category.sql
   como plantilla, agregando la categoría 'human_resources' en vez de 'inventory'
   (mismo patrón: DROP/re-ADD CHECK constraint + ALTER SET DEFAULT + UPDATE retroactivo).

3) Editar BackEnd/templates/tenant_schema.sql:
   - Edit A: dentro del CREATE TABLE employees existente (bloque "CORE 1 — GARAGE
     OPERATIONS", buscar "employees"), agregar inline las mismas 18 columnas + los
     mismos CHECK de employment_status/employment_type. NO relocalizar la tabla.
   - Edit B: agregar un bloque nuevo demarcado "-- ═══ CORE 5 — HUMAN RESOURCES ═══"
     DESPUÉS del bloque "CORE 4 — INVENTORY" (antes del GRANT final), con los mismos
     CREATE TABLE IF NOT EXISTS de la Sección B de la migración 46 (hr_departments,
     hr_positions, hr_cost_centers, hr_work_shifts, hr_request_types con su seed,
     hr_requests, hr_request_approvals, hr_request_status_history) + todos sus índices +
     los mismos 5 bloques DO $$ de FK diferida sobre employees.
   - NO agregar filas de module_catalog/module_transactions en tenant_schema.sql —
     eso vive solo en la migración 46 Sección A.
   - Verificación: crear un tenant nuevo usando SOLO tenant_schema.sql (sin correr la
     migración 46) y confirmar que las tablas de RRHH y las columnas de employees
     existen igual.

4) Editar BackEnd/controllers/notificationsController.js: agregar 'human_resources'
   al array VALID_CATEGORIES (y a cualquier otro default de categorías hardcodeado
   en ese mismo archivo, como se hizo para 'inventory'). Este paso es fácil de
   olvidar y rompe las notificaciones de RRHH en silencio si falta.

5) Revisión estática final: confirmar que las migraciones 46 y 47 son idempotentes
   (IF NOT EXISTS / ON CONFLICT / bloques guardados con pg_constraint en todos
   lados) y pegables a mano en phpPgAdmin sin error ante una corrida parcial previa.
   Correr grep -n "?" sobre los 3 archivos tocados/creados y revisar resultados.

Si el diff total supera ~400 líneas, dividir en sub-ramas apiladas: una con las
migraciones 46+47, otra con el cambio de tenant_schema.sql + notificationsController.js.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar qué archivos
se crearon/modificaron y el nombre exacto de la rama.
```

---

## BATCH B — Backend: maestros de organización + extensión RRHH de empleados

*Depende de Batch A ya mergeado a `develop`.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/hr-core-b-backend-masters desde develop (con Batch A ya mergeado).

Implementar el Batch B del Core de RRHH (Slice 1):

1) Crear BackEnd/services/hr/employeeResolver.js exportando
   resolveEmployeeId(schema, userId) -> devuelve el id de employees vinculado a ese
   userId, o null si no existe (SELECT id FROM ${schema}.employees WHERE user_id=$1).
   Este helper se va a reusar en el Batch C para resolver quién es el que actúa.

2) Crear BackEnd/controllers/hr/departmentsController.js — patrón de catálogo simple
   (mismo que BackEnd/controllers/inventory/warehousesController.js): list (filtros
   q + status), getById, create (dedupe por code, rechazar duplicado con 409), update,
   toggleStatus.

3) Crear BackEnd/controllers/hr/positionsController.js — mismo patrón, dedupe por code.
   Al desactivar (status=inactive), NO borrar ni bloquear las referencias existentes
   de employees.position_id — solo dejar de ofrecerlo como opción nueva.

4) Crear BackEnd/controllers/hr/costCentersController.js — mismo patrón, dedupe por code.

5) Crear BackEnd/controllers/hr/workShiftsController.js — mismo patrón, dedupe por code.

6) Crear BackEnd/controllers/hr/employeesController.js — este es el editor autoritativo
   de los campos de RRHH sobre employees (el controller de garage
   BackEnd/controllers/garage/employeesController.js NO se toca, sigue existiendo tal
   cual para altas/fotos/lectura desde Taller):
   - list: trae empleados con columnas extendidas + JOIN a nombre de departamento,
     posición y supervisor (nombre del empleado referenciado por supervisor_employee_id).
   - getById: perfil integral (todas las columnas + los mismos JOINs).
   - update: acepta y valida los 18 campos nuevos, incluyendo validación server-side
     de employment_status y employment_type contra los valores permitidos (rechazar
     con 400 si no matchea, sin tocar la fila).

7) Crear BackEnd/routes/hr/hrRoutes.js (mirar BackEnd/routes/inventory/inventoryRoutes.js
   como plantilla): montar rutas CRUD de departments/positions/cost-centers/work-shifts,
   y GET /employees, GET /employees/:id, PUT /employees/:id. Montar el router en
   BackEnd/app.js bajo /api/hr, con el mismo estilo de comentario
   // ── Core 5: Human Resources ── que se usó para inventory.

8) Agregar en BackEnd/config/routeModuleMap.js las entradas de este batch:
   - rutas de hr_departments/positions/cost-centers/work-shifts ->
     { module: 'human_resources', transaction: 'hr_org_settings' }
   - GET/PUT /api/hr/employees, /api/hr/employees/:id ->
     { module: 'human_resources', transaction: 'hr_employees' }
   - GET /api/hr/employees/:id (perfil integral, si es una ruta separada) ->
     { module: 'human_resources', transaction: 'hr_employee_profile' }
   No dejar ninguna ruta de este batch sin mapear.

9) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch y
   revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH C — Backend: motor de solicitudes y aprobaciones

*Depende de Batch B ya mergeado a `develop`.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/hr-core-c-backend-requests desde develop (con Batch A y B mergeados).

Implementar el Batch C del Core de RRHH (Slice 1):

1) Crear BackEnd/controllers/hr/requestsController.js:

   - list: si quien pregunta es supervisor (tiene empleados con
     supervisor_employee_id = su propio employee_id resuelto vía employeeResolver),
     devolver SOLO las solicitudes de sus subordinados en current_step='supervisor'
     y status='submitted'. Si quien pregunta tiene el permiso de transacción
     hr_request_approvals (rol RRHH), devolver TODAS las solicitudes sin filtrar.
     Para la vista "mis solicitudes", filtrar por employee_id = el propio (resuelto
     vía employeeResolver).

   - getById: cabecera + filas de hr_request_approvals + filas de
     hr_request_status_history para esa solicitud.

   - create (enviar solicitud): resolver el employee_id del usuario que llama vía
     employeeResolver; si es null, responder 403 "No tenés un perfil de empleado
     vinculado". Rechazar si el hr_request_types elegido tiene status='inactive'.
     Insertar la fila en hr_requests (status='submitted', current_step='supervisor')
     + una fila en hr_request_status_history. Notificar al supervisor resuelto del
     solicitante (createNotification con category='human_resources').

   - approve/reject/annul (acciones sobre una solicitud existente): TODO dentro de
     una transacción db.getClient() con BEGIN/COMMIT, haciendo
     SELECT * FROM hr_requests WHERE id=$1 FOR UPDATE primero. Validar que la
     transición sea legal según el estado actual (no permitir aprobar dos veces, no
     permitir actuar sobre una solicitud ya en estado terminal). Transiciones exactas:
     * approve en current_step='supervisor': status='supervisor_approved',
       current_step='hr'. Notificar a los usuarios con permiso hr_request_approvals
       (rol RRHH) — en v1 alcanza con notificar a los usuarios con perfil
       admin_empresa/RRHH, no hace falta un sistema de configuración de destinatarios.
     * reject en current_step='supervisor': status='supervisor_rejected',
       current_step='done'. Notificar al empleado solicitante.
     * approve en current_step='hr': status='hr_approved', current_step='done'.
       Notificar al empleado solicitante.
     * reject en current_step='hr': status='hr_rejected', current_step='done'.
       Notificar al empleado solicitante.
     * annul (solo el propio solicitante, y solo si status IN ('submitted',
       'supervisor_approved') y current_step != 'done'): status='annulled',
       current_step='done'. No hace falta notificar a nadie más que registrar el
       historial.
     En cada transición: insertar la fila correspondiente en hr_request_approvals
     (decision='approved'/'rejected', decided_by, decided_at, comment opcional) e
     insertar una fila en hr_request_status_history (from_status, to_status,
     actor_user_id, actor_role, note). Todo esto atómico en la misma transacción
     junto con la notificación (la notificación puede ir después del COMMIT, igual
     que se hizo con el stock bajo en Inventario, para no arriesgar el rollback de
     la transacción principal por un error de notificación).

2) Extender BackEnd/routes/hr/hrRoutes.js con: GET /requests, GET /requests/:id,
   POST /requests, POST /requests/:id/approve, POST /requests/:id/reject,
   POST /requests/:id/annul.

3) Agregar en BackEnd/config/routeModuleMap.js:
   - GET/POST /api/hr/requests, GET /api/hr/requests/:id ->
     { module: 'human_resources', transaction: 'hr_requests' }
   - POST /api/hr/requests/:id/approve|reject|annul ->
     { module: 'human_resources', transaction: 'hr_request_approvals' }

4) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch y
   revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH D1 — Frontend: organización + empleados

*Depende de Batch B ya mergeado a `develop` (no necesita C todavía).*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/hr-core-d1-frontend-masters-employees desde develop (con A, B y C
ya mergeados — usar C también como base aunque D1 solo consuma B, para no tener
que rebasear después).

Implementar D1 del Core de RRHH (Slice 1):

1) Crear los services de FrontEnd/Portal/src/services/ para departments, positions,
   costCenters, workShifts y employees de RRHH (mirar
   FrontEnd/Portal/src/services/inventorySuppliersService.ts como plantilla de
   wrapper axios simple).

2) Crear los stores de Pinia correspondientes en FrontEnd/Portal/src/stores/
   (mirar FrontEnd/Portal/src/stores/inventorySuppliers.ts).

3) Crear FrontEnd/Portal/src/views/hr/screens_hr_org_settings.vue — pantalla con
   PESTAÑAS: Departamentos / Posiciones / Centros de costo / Turnos. Cada pestaña
   es un catálogo simple: lista + filtros + NxrSlidePanel de alta/edición (mismo
   patrón que screens_inventory_suppliers.vue), gateada en la transacción
   hr_org_settings.

4) Crear FrontEnd/Portal/src/views/hr/screens_hr_employees.vue — lista de empleados
   con filtros por departamento/posición/estado, gateada en hr_employees.

5) Crear FrontEnd/Portal/src/views/hr/screens_hr_employee_profile.vue — perfil
   integral del empleado en PANTALLA COMPLETA (no slide-panel, son muchos campos:
   datos personales, cadena de supervisión, departamento/posición/centro de
   costo/turno, estado laboral), editable solo por quien tenga hr_employee_profile.

6) Agregar entradas de router + visibilidad de menú/transacción para estas 3
   pantallas (route meta requiresModule/requiresTransaction gateado en
   hr_org_settings / hr_employees / hr_employee_profile).

7) Pasada responsive: en mobile, tarjetas en vez de tablas, formularios a una
   columna, sin scroll horizontal (regla del proyecto).

8) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch y
   revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH D2 — Frontend: solicitudes y aprobaciones

*Depende de Batch D1 ya mergeado a `develop`, y de Batch C (necesita los endpoints).*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/hr-core-d2-frontend-requests desde develop (con A, B, C y D1 ya
mergeados).

Implementar D2 del Core de RRHH (Slice 1):

1) Crear FrontEnd/Portal/src/services/hrRequestsService.ts — wrappers para
   list/getById/create/approve/reject/annul del Batch C.

2) Crear FrontEnd/Portal/src/stores/hrRequests.ts — store con el estado de "mis
   solicitudes" y de la "cola de aprobaciones".

3) Crear FrontEnd/Portal/src/views/hr/screens_hr_requests.vue — "Mis solicitudes":
   lista de las propias + botón para crear una nueva vía NxrSlidePanel (tipo,
   fechas, descripción — formulario chico, no es un documento con grilla de
   líneas como las compras de Inventario). Gateada en hr_requests.

4) Crear FrontEnd/Portal/src/views/hr/screens_hr_request_approvals.vue — cola de
   aprobación (inbox) para supervisores y RRHH: lista de solicitudes pendientes de
   su paso; cada fila abre un NxrSlidePanel de detalle (cabecera + historial +
   botones Aprobar/Rechazar). Slide-panel, NO pantalla completa — es un flujo de
   revisión corto. Gateada en hr_request_approvals.

5) Agregar entradas de router + visibilidad de menú/transacción para estas 2
   pantallas.

6) Pasada responsive (desktop/tablet/mobile).

7) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch y
   revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado y reportar archivos y rama.
```

---

## BATCH E — Notificaciones (preferencias) + pruebas de aceptación manuales

*Depende de Batch A, C y D2 ya mergeados a `develop`. Cierra el Slice 1 de RRHH.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/hr-core-e-notifications-acceptance desde develop (con A, B, C, D1
y D2 ya mergeados).

Implementar el Batch E del Core de RRHH (Slice 1):

1) Editar FrontEnd/Portal/src/views/admin/screens_notification_preferences.vue:
   agregar un toggle para la categoría 'human_resources', igual que el toggle de
   'inventory' que ya existe ahí.

2) Editar FrontEnd/Portal/src/views/admin/screens_notifications_center.vue:
   agregar 'human_resources' a las opciones de filtro por categoría, respetando el
   estilo (con o sin tilde) que ya tienen las demás entradas de esa lista puntual.

3) Correr manualmente y dejar marcados en el reporte final estos casos de
   aceptación del Slice 1 (no los de asistencia/disciplina/nómina, esos son de
   slices futuros):
   - crear empleado con departamento/posición/supervisor asignado, queda en
     employment_status='draft' por defecto
   - actualizar un empleado con employment_status inválido es rechazado, sin
     modificar la fila
   - las referencias existentes de Taller (work_orders.assigned_employee_id) siguen
     funcionando después del ALTER de employees
   - crear un departamento con code duplicado es rechazado
   - desactivar una posición en uso dejar de ofrecerla como opción nueva pero no
     rompe la referencia del empleado que ya la tenía
   - un usuario de Taller sin permiso hr_employees no puede editar campos de RRHH
     de un empleado (403)
   - enviar una solicitud con un tipo de solicitud inactivo es rechazado
   - flujo completo: supervisor aprueba -> RRHH aprueba -> queda en hr_approved,
     existen las dos filas de aprobación
   - supervisor rechaza y la solicitud nunca llega a RRHH
   - el empleado puede anular su propia solicitud mientras esté pendiente o
     aprobada por el supervisor, pero no después de la decisión de RRHH
   - un supervisor no ve las solicitudes de los subordinados de otro supervisor
   - un usuario con permiso RRHH ve todas las solicitudes sin filtrar
   - una notificación con category='human_resources' pasa la validación y se
     persiste
   - una compañía nueva creada después de este batch recibe el schema completo de
     RRHH solo con tenant_schema.sql, sin correr ninguna migración adicional

4) Correr grep -n "?" sobre los 2 archivos editados de este batch.

Al terminar: NO abrir PR. Dejar todo commiteado y reportar: archivos modificados,
resultado de cada caso de prueba (pasa/no pasa), y el nombre de la rama.
```

---

## Después de cada batch

Antes de arrancar el siguiente batch:
1. Claude revisa el diff de la rama contra este documento y contra `sdd/human-resources-core/design` en Engram.
2. Correr `npm run dev`/`npm run build` (backend y frontend) para confirmar que no rompe nada existente.
3. Mergear a `develop` (fast-forward local) recién ahí.
4. Recién entonces levantar Codex con el prompt del batch siguiente.

Al cerrar el Batch E, este Slice 1 de RRHH queda terminado y el plan maestro
(`~/.claude/plans/en-la-carpeta-plan-generic-sutherland.md`) pasa al core de
Tesorería/Cobranza, el último de los tres.
