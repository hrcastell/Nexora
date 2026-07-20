# Treasury/Collections Core — Slice 1 — Directrices para Codex (ejecución manual)

Mismo mecanismo que Inventario y RRHH: el usuario levanta Codex y le pega cada bloque de abajo. Los batches A→I son mayormente secuenciales, con dos ventanas de paralelismo: **B y C** se pueden trabajar en paralelo (ambos solo dependen de A), y **F y G** también (F depende de B+C, G depende de D). Cada batch termina en su propia rama/worktree; Claude revisa antes de destrabar el siguiente.

Diseño cerrado (Claude, fases SDD explore→propose→spec→design→tasks), guardado en Engram project `nexora`:
- `sdd/treasury-collections-core/explore` (#1283)
- `sdd/treasury-collections-core/proposal` (#1284)
- `sdd/treasury-collections-core/spec` (#1285)
- `sdd/treasury-collections-core/design` (#1286)
- `sdd/treasury-collections-core/tasks` (#1287)

**Nota importante de nomenclatura**: `Plan/nexora-treasury-collections-core-plan..md` (el plan de dominio original) usa el prefijo `financial_*` para las tablas. Eso quedó **superado** por la decisión de diseño SDD: todas las tablas usan prefijo **`treasury_`** (evita confundirse con el módulo `financial_core` personal que ya existe y no tiene nada que ver). Si algo de este documento contradice al plan de dominio en nomenclatura, este documento manda.

## Alcance del Slice 1 (confirmado con el usuario)

Tesorería funciona **standalone** en este slice: maestros + caja + documentos CxC/CxP cargados a mano + recibos/pagos aplicados. Taller y Dental **no se tocan** — siguen usando sus flujos de pago actuales sin cambios (Taller con `work_order_payments`, que permite DELETE duro; Dental con `dental_payments` 1:1 al cobro). Los adaptadores que conectan esos flujos al core central de Tesorería quedan para un slice futuro. Bancos, conciliación bancaria y gestión de mora/cobranza también quedan para slices futuros.

## Reglas generales (aplican a los 9 batches)

- Repo: `C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora`
- Cada batch se trabaja en una rama nueva **basada en `develop`** (que ya tiene Inventario completo + RRHH completo — migraciones 44-47 incluidas). No usar `main` ni `hotfix/dental-core` como base.
- Cada batch termina commiteado en su rama, sin abrir PR ni mergear.
- Postgres 10.23 únicamente: `EXECUTE PROCEDURE` (no `EXECUTE FUNCTION`) para triggers, nada de extensiones. Todo migration debe ser pegable a mano en phpPgAdmin.
- Módulo técnico = `treasury_collections` en `module_catalog.code`, `routeModuleMap.js` y categoría de notificación. Prefijo de tablas = `treasury_`. Prefijo de transacciones = `treasury_`.
- Próxima migración libre: **48** (RRHH usó 46 y 47).
- **NO tocar** `garage_operations`, `dental_core`, `inventory` ni `financial_core` (el módulo personal, no confundir con las tablas nuevas `treasury_*`) — cero archivos de esos cores en el diff de ningún batch de este core.
- **Gotcha ya conocido, se repitió dos veces (Inventario y RRHH), no te lo olvides esta tercera vez**: `BackEnd/controllers/notificationsController.js` tiene DOS lugares hardcodeados que hay que tocar — el array `VALID_CATEGORIES` (cerca de la línea 5) Y el JSON de categorías por defecto más abajo (cerca de la línea 239, dentro de `getPreferences`/`savePreferences`). Si solo tocás uno de los dos, las notificaciones de Tesorería van a fallar en silencio para usuarios nuevos.
- **Antes de reportar cualquier batch como terminado**: correr `grep -n "?"` sobre TODOS los archivos que crees o edites en ese batch y revisar cada resultado a mano (los `?` de operadores ternarios son válidos, no los toques). Este chequeo evitó corrupción de tildes/eñes en los últimos batches de RRHH, seguí haciéndolo.
- Mensajes de error visibles para el usuario **en español**, consistente con el resto del backend (`Ya existe...`, `No fue posible...`, `Operación no permitida en modo solo lectura`, etc.) — no repetir el desliz al inglés que pasó en el Batch B de RRHH.
- Estilo backend/frontend: `view -> store -> service -> controller`, Pinia, `NxrSlidePanel` para catálogos chicos y flujos de revisión corta, pantallas completas (full-screen) para documentos con grilla de líneas (recibos/pagos, CxC/CxP).
- Si el diff de un batch supera ~400-450 líneas, partirlo en sub-ramas apiladas sobre la misma rama base, en orden.

---

## BATCH A — Migraciones DB (bloquea todo lo demás)

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora (Postgres 10.23, schema-per-tenant).
Crear rama feat/treasury-core-a-db desde develop (que ya tiene Inventario y RRHH completos).

Implementar el Batch A del Core de Tesorería/Cobranza (Slice 1):

1) Crear Database/04_migrations/48_treasury_collections_core_module.sql con DOS
   secciones, mirando Database/04_migrations/46_human_resources_core_module.sql
   como plantilla más fresca:

   SECCIÓN A (schema public, una sola vez):
   - INSERT en public.module_catalog: code='treasury_collections',
     name='Tesorería y Cobranza', category='business_core', menu_order_default=60,
     is_core, menu flags/version, ON CONFLICT (code) DO UPDATE.
   - Bloque DO $$ ... $$ que resuelve mod_id y hace upsert bulk en
     public.module_transactions con estos 7 códigos:
     treasury_dashboard, treasury_settings, treasury_cash_sessions,
     treasury_receivables, treasury_payables, treasury_receipts,
     treasury_disbursements — con ON CONFLICT (module_id, code) DO UPDATE.

   SECCIÓN B (por tenant, placeholder {schema_name}), en este orden por FKs:

   1. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_counterparties
      Campos: id, tenant_id, counterparty_type VARCHAR CHECK IN
      ('customer','supplier','both'), customer_id INTEGER NULL (SIN FK — no
      referenciar customers de Taller, columna reservada para un slice futuro),
      supplier_id INTEGER NULL (SIN FK — no referenciar suppliers de Inventario,
      misma razón), name_snapshot VARCHAR NOT NULL, document_type VARCHAR,
      document_number VARCHAR, phone VARCHAR, email VARCHAR,
      status VARCHAR DEFAULT 'active', created_at, updated_at.
      CONSTRAINT UNIQUE (tenant_id, document_number).

   2. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_payment_terms
      Campos: id, tenant_id, code (UNIQUE por schema), name,
      term_type VARCHAR CHECK IN ('cash','credit','installments'),
      days_due INTEGER DEFAULT 0, installments_count INTEGER DEFAULT 1,
      grace_days INTEGER DEFAULT 0, status VARCHAR DEFAULT 'active',
      created_at, updated_at.

   3. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_sequences
      Campos: id, tenant_id, document_type VARCHAR, seq_year INTEGER,
      last_number INTEGER DEFAULT 0, prefix VARCHAR, status VARCHAR DEFAULT
      'active'. CONSTRAINT UNIQUE (tenant_id, document_type, seq_year).
      (Es una tabla LOCAL de Tesorería, NO la misma que usa Inventario — no
      reutilizar document_sequences de inventory.)

   4. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_registers
      Campos: id, tenant_id, code (UNIQUE por schema), name, location,
      status VARCHAR DEFAULT 'active', created_at, updated_at.

   5. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_sessions
      Campos: id, tenant_id,
      cash_register_id INTEGER NOT NULL REFERENCES treasury_cash_registers(id)
        ON DELETE RESTRICT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, opening_amount NUMERIC(14,2)
      DEFAULT 0, closed_at TIMESTAMP NULL, expected_amount NUMERIC(14,2) NULL,
      counted_amount NUMERIC(14,2) NULL, difference_amount NUMERIC(14,2) NULL,
      status VARCHAR CHECK IN ('open','closed') DEFAULT 'open'.

   6. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_cash_movements
      (ledger append-only, mismo patrón que stock_movements de Inventario)
      Campos: id, tenant_id,
      cash_session_id INTEGER NOT NULL REFERENCES treasury_cash_sessions(id)
        ON DELETE RESTRICT,
      movement_type VARCHAR CHECK IN ('sale_in','payment_out','deposit_out',
        'withdrawal_out','adjustment_in','adjustment_out'),
      reference_table VARCHAR, reference_id INTEGER, amount NUMERIC(14,2),
      currency VARCHAR DEFAULT 'CLP', signed_amount NUMERIC(14,2) NOT NULL,
      notes TEXT, created_by INTEGER, created_at TIMESTAMP DEFAULT
      CURRENT_TIMESTAMP.
      Trigger de inmutabilidad (copiar EXACTO el patrón de
      trg_stock_movements_immutable de Inventario, sintaxis PG10
      EXECUTE PROCEDURE, no EXECUTE FUNCTION):

      CREATE OR REPLACE FUNCTION {schema_name}.trg_treasury_cash_movements_immutable()
      RETURNS trigger AS $$
      BEGIN
          RAISE EXCEPTION 'treasury_cash_movements is append-only (no UPDATE/DELETE)';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS treasury_cash_movements_no_mutate ON {schema_name}.treasury_cash_movements;

      CREATE TRIGGER treasury_cash_movements_no_mutate
      BEFORE UPDATE OR DELETE ON {schema_name}.treasury_cash_movements
      FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_treasury_cash_movements_immutable();

   7. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_documents
      (cabecera unificada de CxC/CxP)
      Campos: id, tenant_id,
      document_type VARCHAR CHECK IN ('sale_invoice','sale_note',
        'purchase_invoice','debit_note','credit_note','installment_plan',
        'internal_charge'),
      direction VARCHAR CHECK IN ('receivable','payable'),
      internal_number VARCHAR NOT NULL, external_number VARCHAR NULL,
      counterparty_id INTEGER NOT NULL REFERENCES treasury_counterparties(id)
        ON DELETE RESTRICT,
      origin_core VARCHAR NULL, origin_table VARCHAR NULL, origin_id INTEGER NULL
        (los 3 quedan NULL en este slice, son para integraciones futuras),
      issue_date DATE NOT NULL, due_date DATE NULL, currency VARCHAR DEFAULT 'CLP',
      subtotal NUMERIC(14,2) DEFAULT 0, tax_total NUMERIC(14,2) DEFAULT 0,
      discount_total NUMERIC(14,2) DEFAULT 0, total_amount NUMERIC(14,2) NOT NULL,
      balance_amount NUMERIC(14,2) NOT NULL,
      status VARCHAR CHECK IN ('draft','open','partially_applied','settled','void')
        DEFAULT 'open',
      created_by INTEGER, created_at, updated_at.
      CONSTRAINT UNIQUE (tenant_id, internal_number).

   8. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_document_lines
      Campos: id, tenant_id,
      treasury_document_id INTEGER NOT NULL REFERENCES treasury_documents(id)
        ON DELETE CASCADE,
      line_number INTEGER, description TEXT, quantity NUMERIC(12,2),
      unit_price NUMERIC(14,4), line_total NUMERIC(14,2).

   9. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_installments
      Campos: id, tenant_id,
      treasury_document_id INTEGER NOT NULL REFERENCES treasury_documents(id)
        ON DELETE CASCADE,
      installment_number INTEGER, due_date DATE, amount NUMERIC(14,2),
      balance_amount NUMERIC(14,2),
      status VARCHAR CHECK IN ('pending','partially_applied','settled')
        DEFAULT 'pending'.

   10. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipts
       Campos: id, tenant_id, receipt_number VARCHAR NOT NULL,
       counterparty_id INTEGER NOT NULL REFERENCES treasury_counterparties(id)
         ON DELETE RESTRICT,
       receipt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       cash_session_id INTEGER NULL REFERENCES treasury_cash_sessions(id)
         ON DELETE SET NULL,
       payment_method VARCHAR, total_amount NUMERIC(14,2) NOT NULL,
       status VARCHAR DEFAULT 'active', created_by INTEGER, created_at.
       CONSTRAINT UNIQUE (tenant_id, receipt_number).

   11. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_receipt_applications
       Campos: id, tenant_id,
       receipt_id INTEGER NOT NULL REFERENCES treasury_receipts(id) ON DELETE CASCADE,
       treasury_document_id INTEGER NOT NULL REFERENCES treasury_documents(id)
         ON DELETE RESTRICT,
       installment_id INTEGER NULL REFERENCES treasury_installments(id)
         ON DELETE RESTRICT,
       applied_amount NUMERIC(14,2) NOT NULL.

   12. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursements — igual
       forma que treasury_receipts (receipt_number -> disbursement_number,
       payment_date en vez de receipt_date), dirección payable.

   13. CREATE TABLE IF NOT EXISTS {schema_name}.treasury_disbursement_applications
       — igual forma que treasury_receipt_applications, apuntando a
       disbursement_id en vez de receipt_id.

   14. Índices: todas las FK de las tablas anteriores,
       treasury_counterparties.document_number, treasury_documents.status,
       treasury_documents.direction, treasury_documents.counterparty_id,
       treasury_installments.status, treasury_cash_sessions.status,
       treasury_cash_sessions.cash_register_id.

2) Crear Database/04_migrations/49_notifications_treasury_collections_category.sql,
   mirando Database/04_migrations/47_notifications_human_resources_category.sql
   como plantilla, agregando la categoría 'treasury_collections' en vez de
   'human_resources' (mismo patrón: DROP/re-ADD CHECK + ALTER SET DEFAULT +
   UPDATE retroactivo).

3) Editar BackEnd/templates/tenant_schema.sql: agregar un bloque nuevo demarcado
   "-- ═══ CORE 6 — TREASURY ═══" DESPUÉS del bloque "CORE 5 — HUMAN RESOURCES"
   (antes del GRANT final), con los mismos CREATE TABLE IF NOT EXISTS de toda
   la Sección B de la migración 48 (los 13 puntos de arriba) + todos sus
   índices + el trigger de inmutabilidad. NO agregar filas de
   module_catalog/module_transactions acá — eso vive solo en la migración 48
   Sección A.
   Verificación: crear un tenant nuevo usando SOLO tenant_schema.sql (sin correr
   la migración 48) y confirmar que las 13 tablas de tesorería existen igual.

4) Editar BackEnd/controllers/notificationsController.js: agregar
   'treasury_collections' en LOS DOS lugares — el array VALID_CATEGORIES cerca
   del inicio del archivo, Y el JSON de categorías por defecto más abajo (en
   getPreferences y savePreferences). Confirmá los dos antes de dar por
   terminado este punto — es el gotcha que ya se repitió dos veces.

5) Revisión estática final: confirmar que las migraciones 48 y 49 son
   idempotentes (IF NOT EXISTS / ON CONFLICT / UNIQUE constraints en todos
   lados) y pegables a mano en phpPgAdmin sin error ante una corrida parcial
   previa. Correr grep -n "?" sobre los 3 archivos tocados y revisar resultados.

Si el diff total supera ~450 líneas, dividir en sub-ramas apiladas: una con las
migraciones 48+49, otra con tenant_schema.sql + notificationsController.js.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar qué
archivos se crearon/modificaron y el nombre exacto de la rama.
```

---

## BATCH B — Backend: maestros (contrapartes, condiciones de pago, cajas)

*Depende de Batch A ya mergeado a `develop`. Se puede trabajar en paralelo con el Batch C.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-b-backend-masters desde develop (con Batch A
ya mergeado).

Implementar el Batch B del Core de Tesorería (Slice 1):

1) Crear BackEnd/services/treasury/sequenceService.js — copia LOCAL del patrón
   de BackEnd/services/inventory/sequenceService.js (NO lo reutilices
   importándolo, hacé una copia propia de Tesorería para no acoplar el orden
   de migraciones de los dos cores). Exportar una función que genere el
   próximo número correlativo por (schema, documentType), usando
   SELECT ... FOR UPDATE sobre treasury_document_sequences (con reset anual
   vía seq_year, igual lógica que la de Inventario), devolviendo el número
   formateado con prefijo y padding.

2) Crear BackEnd/controllers/treasury/counterpartiesController.js — patrón de
   catálogo simple (mirá BackEnd/controllers/inventory/suppliersController.js
   o el factory de BackEnd/controllers/hr/catalogControllerFactory.js, el que
   te resulte más directo de adaptar): list (filtros q/type/status), getById,
   create (rechazar document_number duplicado por tenant con 409), update,
   toggleStatus. Mensajes de error en español.

3) Crear BackEnd/controllers/treasury/paymentTermsController.js — mismo
   patrón de catálogo simple, dedupe por code.

4) Crear BackEnd/controllers/treasury/cashRegistersController.js — mismo
   patrón, dedupe por code. El list por defecto excluye los desactivados
   (status != 'active' fuera del listado salvo que se pida status=all).

5) Crear BackEnd/routes/treasury/treasuryRoutes.js (mirar
   BackEnd/routes/hr/hrRoutes.js como plantilla): montar rutas CRUD de
   counterparties/payment-terms/cash-registers. Montar el router en
   BackEnd/app.js bajo /api/treasury con el comentario
   // Core 6: Treasury and Collections.

6) Agregar en BackEnd/config/routeModuleMap.js las entradas de este batch,
   todas -> { module: 'treasury_collections', transaction: 'treasury_settings' }.
   No dejar ninguna ruta sin mapear.

7) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH C — Backend: sesiones de caja

*Depende de Batch A ya mergeado a `develop`. Se puede trabajar en paralelo con el Batch B — ambos tocan `treasuryRoutes.js`/`routeModuleMap.js`, así que si Codex los hace en paralelo, el que termine segundo debe rebasear sobre el primero antes de mergear.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-c-backend-cash-sessions desde develop (con
Batch A ya mergeado; si el Batch B ya está mergeado también, arrancar desde
ahí para evitar conflictos después).

Implementar el Batch C del Core de Tesorería (Slice 1):

1) Crear BackEnd/controllers/treasury/cashSessionsController.js:

   - open: dentro de una transacción db.getClient() BEGIN/COMMIT, rechazar si
     la bodega... digo, la caja (cash_register_id) ya tiene una sesión con
     status='open' (chequear con SELECT antes de insertar). Insertar la sesión
     nueva con status='open', opened_at=NOW(), opening_amount del body.

   - recordMovement: requiere que la caja tenga una sesión abierta (si no,
     rechazar con 409). Insertar una fila append-only en
     treasury_cash_movements (el trigger de la migración 48 va a bloquear
     cualquier intento posterior de UPDATE/DELETE).

   - close: SELECT ... FOR UPDATE sobre la sesión; calcular
     expected_amount = opening_amount + SUM(signed_amount) de sus movimientos;
     difference_amount = counted_amount (del body) - expected_amount; setear
     status='closed', closed_at=NOW(). Si difference_amount != 0, emitir una
     notificación (createNotification, category='treasury_collections') avisando
     la diferencia. Todo esto atómico en una sola transacción.

   - list/getById: listado de sesiones (con datos de caja y cajero) y detalle
     con sus movimientos.

2) Extender BackEnd/routes/treasury/treasuryRoutes.js con las rutas de sesiones
   de caja: abrir, registrar movimiento, cerrar, listar, obtener detalle.

3) Agregar en BackEnd/config/routeModuleMap.js las rutas de este batch ->
   { module: 'treasury_collections', transaction: 'treasury_cash_sessions' }.

4) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH D — Backend: documentos financieros (CxC/CxP)

*Depende de Batch A y Batch B ya mergeados a `develop` (necesita las contrapartes y el `sequenceService.js` de Tesorería).*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-d-backend-documents desde develop (con Batch A,
B y C ya mergeados).

Implementar el Batch D del Core de Tesorería (Slice 1):

1) Crear BackEnd/controllers/treasury/documentsController.js — CRUD unificado
   de CxC/CxP usando el campo direction ('receivable'/'payable') para
   distinguir:
   - create: SOLO carga manual en este slice (no hay auto-alimentación desde
     otros cores todavía). Resolver el correlativo vía
     sequenceService.getNextNumber. Al crear, balance_amount = total_amount y
     status='open'.
   - update: rechazar cualquier intento de modificar total_amount
     directamente después de creado — ese campo es inmutable, solo
     balance_amount cambia y únicamente a través de aplicaciones de
     recibos/pagos (Batch E). Los demás campos de cabecera (fechas, notas,
     etc.) sí son editables.
   - list/getById: filtrable por el query param direction. getById incluye
     las líneas (treasury_document_lines) y cuotas (treasury_installments) si
     existen.
   - Sub-recursos opcionales: crear/listar treasury_document_lines y
     treasury_installments asociadas a un documento.

2) Extender BackEnd/routes/treasury/treasuryRoutes.js con DOS grupos de rutas
   que apuntan al MISMO controller pero con el direction validado/fijado del
   lado del servidor según el grupo:
   - /api/treasury/receivables (fuerza direction='receivable')
   - /api/treasury/payables (fuerza direction='payable')

3) Agregar en BackEnd/config/routeModuleMap.js:
   - rutas de /treasury/receivables -> { module: 'treasury_collections',
     transaction: 'treasury_receivables' }
   - rutas de /treasury/payables -> { module: 'treasury_collections',
     transaction: 'treasury_payables' }
   Confirmar que un usuario con permiso SOLO de treasury_receivables no puede
   pegarle a las rutas de payables y viceversa, aunque compartan controller y
   tabla.

4) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH E — Backend: recibos y pagos aplicados

*Depende de Batch A y Batch D ya mergeados a `develop` (las aplicaciones apuntan a `treasury_documents`). No depende del Batch C.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-e-backend-receipts-disbursements desde develop
(con Batch A, B, C y D ya mergeados).

Implementar el Batch E del Core de Tesorería (Slice 1):

1) Crear BackEnd/controllers/treasury/receiptsController.js:
   - create: cabecera del recibo (contraparte, fecha, cash_session_id opcional,
     forma de pago, total_amount).
   - apply: dentro de UNA transacción db.getClient():
     * validar que SUM(applied_amount de todas las aplicaciones del body) no
       supere receipt.total_amount.
     * para cada aplicación, validar que applied_amount no supere el
       balance_amount del documento o cuota destino.
     * descontar balance_amount (NUNCA total_amount) del treasury_document o
       treasury_installment correspondiente.
     * recalcular el status del documento: balance_amount == total_amount ->
       'open'; 0 < balance_amount < total_amount -> 'partially_applied';
       balance_amount == 0 -> 'settled'.
     * insertar las filas correspondientes en treasury_receipt_applications.
   - list/getById.

2) Crear BackEnd/controllers/treasury/disbursementsController.js — mismo
   patrón que receiptsController.js pero para treasury_disbursements /
   treasury_disbursement_applications, dirección payable.

3) Extender BackEnd/routes/treasury/treasuryRoutes.js con las rutas de
   recibos (crear/aplicar/listar/detalle) y pagos emitidos
   (crear/aplicar/listar/detalle).

4) Agregar en BackEnd/config/routeModuleMap.js:
   - rutas de recibos -> { module: 'treasury_collections', transaction: 'treasury_receipts' }
   - rutas de pagos emitidos -> { module: 'treasury_collections', transaction: 'treasury_disbursements' }

5) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH F — Frontend: configuración + sesiones de caja

*Depende de Batch B y Batch C ya mergeados a `develop`. Se puede trabajar en paralelo con el Batch G.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-f-frontend-settings-cash desde develop (con
Batch A, B, C, D y E ya mergeados).

Implementar el Batch F del Core de Tesorería (Slice 1):

1) Crear los services de FrontEnd/Portal/src/services/ para contrapartes,
   condiciones de pago, cajas y sesiones de caja (mirar
   FrontEnd/Portal/src/services/inventorySuppliersService.ts o los servicios
   de RRHH como plantilla).

2) Crear los stores de Pinia correspondientes en FrontEnd/Portal/src/stores/.

3) Crear FrontEnd/Portal/src/views/treasury/screens_treasury_settings.vue —
   pantalla con PESTAÑAS: Contrapartes / Condiciones de pago / Cajas. Cada
   pestaña es un catálogo simple: lista + filtros + NxrSlidePanel de
   alta/edición, mismo patrón que screens_hr_org_settings.vue. Gateada en la
   transacción treasury_settings.

4) Crear FrontEnd/Portal/src/views/treasury/screens_treasury_cash_sessions.vue
   — acciones de abrir/cerrar sesión de caja + lista de movimientos de la
   sesión activa/seleccionada. Al cerrar, mostrar el resumen esperado vs
   contado y la diferencia. Gateada en treasury_cash_sessions.

5) Agregar entradas de router + visibilidad de menú/transacción para ambas
   pantallas.

6) Pasada responsive (desktop/tablet/mobile — tarjetas en vez de tablas en
   mobile, formularios a una columna).

7) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH G — Frontend: cuentas por cobrar y por pagar

*Depende de Batch D ya mergeado a `develop`. Se puede trabajar en paralelo con el Batch F.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-g-frontend-documents desde develop (con Batch A,
B, C, D y E ya mergeados).

Implementar el Batch G del Core de Tesorería (Slice 1):

1) Crear FrontEnd/Portal/src/services/treasuryDocumentsService.ts —
   parametrizado por direction, wrapper de los endpoints del Batch D.

2) Crear FrontEnd/Portal/src/stores/treasuryDocuments.ts — store filtrable
   por dirección.

3) Crear FrontEnd/Portal/src/views/treasury/screens_treasury_receivables.vue
   y screens_treasury_payables.vue — pantallas COMPLETAS master-detail (no
   modal chico), mismo patrón que screens_inventory_purchase_documents.vue:
   header con contraparte/fechas/condición de pago, grilla de líneas, footer
   con totales. Si te resulta más prolijo, podés compartir un componente base
   entre las dos pantallas (misma tabla subyacente, distinto direction), pero
   cada una tiene que quedar como una ruta separada gateada en su propia
   transacción (treasury_receivables / treasury_payables respectivamente) —
   los permisos tienen que poder otorgarse de forma independiente.

4) Agregar entradas de router + visibilidad de menú/transacción para ambas
   pantallas.

5) Pasada responsive.

6) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH H — Frontend: recibos y pagos aplicados

*Depende de Batch E y Batch G ya mergeados a `develop` (la UI de aplicación necesita listar documentos abiertos del Batch G).*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-h-frontend-receipts-disbursements desde develop
(con A, B, C, D, E, F y G ya mergeados).

Implementar el Batch H del Core de Tesorería (Slice 1):

1) Crear FrontEnd/Portal/src/services/treasuryReceiptsService.ts y
   treasuryDisbursementsService.ts — wrappers de crear/aplicar/listar/detalle
   del Batch E.

2) Crear los stores de Pinia correspondientes.

3) Crear FrontEnd/Portal/src/views/treasury/screens_treasury_receipts.vue y
   screens_treasury_disbursements.vue — pantalla completa con lista + un
   slide-panel de aplicación: al aplicar un recibo/pago, mostrar los
   documentos abiertos (balance_amount > 0) de la contraparte elegida
   (usando el service del Batch G), permitir distribuir el monto entre uno o
   varios documentos/cuotas, y enviar la aplicación.

4) Agregar entradas de router + visibilidad de menú/transacción para ambas
   pantallas.

5) Pasada responsive.

6) Correr grep -n "?" sobre todos los archivos nuevos/editados de este batch
   y revisar resultados antes de terminar.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH I — Notificaciones (preferencias) + pruebas de aceptación manuales

*Depende de que A, C, D, E, F, G y H ya estén mergeados a `develop`. Cierra el Slice 1 de Tesorería y el plan maestro completo.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feat/treasury-core-i-notifications-acceptance desde develop (con
todos los batches anteriores ya mergeados).

Implementar el Batch I del Core de Tesorería (Slice 1):

1) Editar FrontEnd/Portal/src/views/admin/screens_notification_preferences.vue:
   agregar un toggle para la categoría 'treasury_collections', igual que los
   de 'inventory' y 'human_resources' que ya existen.

2) Editar FrontEnd/Portal/src/views/admin/screens_notifications_center.vue:
   agregar 'treasury_collections' a las opciones de filtro por categoría.

3) Correr manualmente y dejar marcados en el reporte final estos casos de
   aceptación del Slice 1:
   - el módulo activado muestra las 7 transacciones en GET /api/menu según
     el perfil del usuario
   - el módulo desactivado oculta el menú y bloquea /api/treasury/* según el
     modo de MODULE_GUARD configurado
   - alta de contraparte funciona; document_number duplicado es rechazado
   - asignar una condición de pago a un documento le calcula el vencimiento
     por defecto salvo que se lo pise a mano
   - crear documentos concurrentemente del mismo tipo genera correlativos
     distintos, sin duplicados
   - el listado de cajas excluye las desactivadas por defecto
   - abrir una sesión en una caja que ya tiene una sesión abierta es rechazado
   - cerrar una sesión con contado != esperado registra la diferencia con
     signo correcto y queda en status closed
   - registrar un movimiento sin sesión abierta es rechazado
   - intentar un UPDATE o DELETE directo sobre un treasury_cash_movement es
     bloqueado por el trigger
   - crear un documento por cobrar/pagar manual deja balance_amount =
     total_amount y status = open
   - intentar modificar total_amount después de creado es rechazado
   - un plan de cuotas: pagar una cuota completa solo la salda a ella, el
     balance del documento baja proporcionalmente
   - aplicación de un recibo a múltiples documentos (300 completo + 200
     parcial contra un recibo de 500) reparte bien los montos
   - un pago emitido aplicado completo a una cuenta por pagar de 200 la deja
     en balance_amount = 0
   - Taller funcionando solo, con Tesorería apagada: work_order_payments
     sigue igual que antes (incluido el DELETE duro)
   - Dental funcionando solo, con Tesorería apagada: dental_charges/
     dental_payments/dental_installments sigue igual que antes
   - Taller con Tesorería activa pero sin adaptador: los pagos de órdenes de
     trabajo no se ven afectados, no hay alimentación automática hacia
     treasury_documents
   - Dental con Tesorería activa pero sin adaptador: mismo caso, sin efecto
   - una notificación con category='treasury_collections' pasa la validación
     Y aparece en las preferencias por defecto de un usuario nuevo sin que
     tenga que activarla a mano (confirmar los DOS lugares del Batch A)
   - una compañía nueva creada después de este batch recibe las 13 tablas de
     Tesorería solo con tenant_schema.sql, sin correr ninguna migración
     adicional
   - todas las rutas /api/treasury/* tienen su entrada en routeModuleMap.js

4) Correr grep -n "?" sobre los 2 archivos editados de este batch.

Al terminar: NO abrir PR. Dejar todo commiteado y reportar: archivos
modificados, resultado de cada caso de prueba (pasa/no pasa), y el nombre de
la rama.
```

---

## Después de cada batch

Antes de arrancar el siguiente batch (o el par paralelo siguiente):
1. Claude revisa el diff de la rama contra este documento y contra
   `sdd/treasury-collections-core/design` en Engram.
2. Correr `npm run dev`/`npm run build` (backend y frontend) para confirmar
   que no rompe nada existente.
3. Mergear a `develop` (fast-forward o merge local) recién ahí.
4. Recién entonces levantar Codex con el prompt del batch siguiente (o del
   par paralelo B+C / F+G, según corresponda).

Al cerrar el Batch I, el Slice 1 de Tesorería/Cobranza queda terminado — y con
eso, los 3 cores del plan maestro
(`~/.claude/plans/en-la-carpeta-plan-generic-sutherland.md`) están completos
en su primer slice. Los slices futuros (transferencias/conteos de Inventario,
asistencia/disciplina/nómina de RRHH, bancos/conciliación/mora de Tesorería,
y los adaptadores Taller↔Tesorería y Dental↔Tesorería) quedan como trabajo
posterior, fuera de este plan de integración inicial.
