# Inventory Core — Slice 1 — Directrices para Codex (ejecución manual)

Cambio de enfoque: en vez de que Claude delegue a Codex vía sub-agente en esta sesión, el usuario levanta Codex directamente (`codex` CLI o su cliente habitual) y le pega cada bloque de abajo como prompt. Los 5 batches son secuenciales — no arrancar el batch N+1 hasta que el batch N esté mergeado a `develop`.

Diseño ya cerrado (Claude, fases SDD explore→propose→spec→design→tasks), guardado en Engram project `nexora`:
- `sdd/inventory-core/explore` (#1204)
- `sdd/inventory-core/proposal` (#1205)
- `sdd/inventory-core/spec` (#1206)
- `sdd/inventory-core/design` (#1207)
- `sdd/inventory-core/tasks` (#1208)

Si Codex tiene el MCP de Engram configurado, puede leer esos IDs directamente. Si no, cada prompt de abajo es autocontenido — no depende de que Codex tenga acceso a Engram.

## Reglas generales (aplican a los 5 batches)

- Repo: `C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora`
- Cada batch se trabaja en una rama nueva **basada en `develop`** (no en `main`, no en `hotfix/dental-core`). Rama sugerida: `feature/inventory-core-batch-a`, `-batch-b`, etc.
- Cada batch termina en un commit (o varios, si el propio batch se divide en sub-PRs por tamaño) sobre esa rama. **No mergear ni abrir PR sin que el usuario/Claude lo revise primero.**
- Postgres 10.23 únicamente: nada de `EXECUTE FUNCTION` (usar `EXECUTE PROCEDURE`), nada de extensiones, nada más allá de PG10. Todo migration debe ser pegable a mano en phpPgAdmin.
- Módulo técnico = `inventory` (no `inventory_core`) en `module_catalog.code`, en `routeModuleMap.js` y en la categoría de notificación.
- No tocar tablas/archivos de `dental_core`, `garage_operations` ni `financial_core` salvo donde se indica explícitamente (extensión de `products` y de `tenant_schema.sql`).
- Estilo SQL: copiar literalmente la estructura de comentarios/banners/`ON CONFLICT DO UPDATE` de `Database/04_migrations/20_dental_core_module.sql` y `Database/04_migrations/31_notifications_dental_category.sql`.
- Estilo backend/frontend: seguir el patrón `view -> store -> service -> controller`, Pinia, `NxrSlidePanel` para catálogos chicos, pantallas master-detail completas para documentos (compras, recepciones) — NO modal chico para documentos.
- Si el diff de un batch supera ~400 líneas, partirlo en sub-PRs apilados (ej. Batch A → A1 migraciones, A2 tenant_schema.sql; Batch D → D1, D2) sobre la misma rama base, en orden.

---

## BATCH A — Migraciones DB + tenant_schema.sql (bloquea B, C, D, E)

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora (Postgres 10.23, schema-per-tenant).
Crear rama feature/inventory-core-batch-a desde develop.

Implementar el Batch A del Core de Inventario (Slice 1):

1) Crear Database/04_migrations/44_inventory_core_module.sql con DOS secciones,
   siguiendo EXACTAMENTE el patrón de Database/04_migrations/20_dental_core_module.sql
   (leerlo primero como plantilla):

   SECCIÓN A (schema public, se corre una sola vez):
   - INSERT en public.module_catalog: code='inventory', name='Inventario',
     category='business_core', is_core, menu flags/version — igual shape que
     el insert de dental_core — con ON CONFLICT (code) DO UPDATE.
   - Bloque DO $$ ... $$ que resuelve mod_id y hace upsert bulk en
     public.module_transactions con estos 5 códigos:
     inventory_suppliers, inventory_warehouses, inventory_purchase_documents,
     inventory_receipts, inventory_stock — con ON CONFLICT (module_id, code) DO UPDATE.

   SECCIÓN B (por tenant, placeholder {schema_name}), en este orden estricto por FKs:
   1. CREATE TABLE IF NOT EXISTS {schema_name}.suppliers (crear PRIMERO, es target de FK)
      Campos: id, name, normalized_name, document_type, document_number, phone, mobile,
      email, country, region_state, city, commune_district, address, contact_name,
      payment_term_days INTEGER DEFAULT 0, notes, status, created_at, updated_at.
   2. CREATE TABLE IF NOT EXISTS {schema_name}.warehouses
      Campos: id, code, name, warehouse_type (main/store/transit/external), country,
      region_state, city, commune_district, address, manager_name, phone, notes,
      status, created_at, updated_at.
   3. CREATE TABLE IF NOT EXISTS {schema_name}.document_sequences
      Campos: id, document_type (purchase_order/purchase_invoice/dispatch_order/stock_count),
      prefix, current_number, padding, reset_policy (yearly/never), status, created_at,
      updated_at, MÁS una columna seq_year INTEGER (necesaria para reset anual determinístico,
      no está en el plan de dominio original pero SÍ en el diseño — no omitir).
   4. ALTER TABLE {schema_name}.products ADD COLUMN IF NOT EXISTS ... — 14 columnas,
      cada una en su propio ADD COLUMN IF NOT EXISTS (para que reruns parciales sean seguros):
      inventory_enabled BOOLEAN DEFAULT FALSE,
      track_serial BOOLEAN DEFAULT FALSE,
      track_batch BOOLEAN DEFAULT FALSE,
      allow_negative_stock BOOLEAN DEFAULT FALSE,
      reorder_point NUMERIC(12,2) DEFAULT 0,
      max_stock NUMERIC(12,2) NULL,
      preferred_supplier_id INTEGER NULL,
      purchase_unit VARCHAR(30) NULL,
      sale_unit VARCHAR(30) NULL,
      conversion_factor NUMERIC(12,4) DEFAULT 1,
      average_cost NUMERIC(14,4) DEFAULT 0,
      last_purchase_cost NUMERIC(14,4) DEFAULT 0,
      requires_expiration BOOLEAN DEFAULT FALSE,
      storage_notes TEXT NULL.
   5. Bloque DO $$ ... $$ guardado (chequear pg_constraint antes de agregar) que crea:
        ALTER TABLE {schema_name}.products
          ADD CONSTRAINT fk_products_preferred_supplier
          FOREIGN KEY (preferred_supplier_id)
          REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL;
      Exacto shape:
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'fk_products_preferred_supplier'
                AND conrelid = '{schema_name}.products'::regclass
          ) THEN
              ALTER TABLE {schema_name}.products
                  ADD CONSTRAINT fk_products_preferred_supplier
                  FOREIGN KEY (preferred_supplier_id)
                  REFERENCES {schema_name}.suppliers(id) ON DELETE SET NULL;
          END IF;
      END;
      $$;
   6. CREATE TABLE IF NOT EXISTS {schema_name}.purchase_documents
      Campos: id, document_type (purchase_order/purchase_invoice), internal_number,
      supplier_document_number NULL, supplier_id, issue_date, expected_reception_date NULL,
      due_date NULL, payment_condition (cash/credit), payment_term_days, currency,
      subtotal, discount_total, tax_total, total,
      status (draft/issued/partially_received/received/cancelled), notes, created_by,
      created_at, updated_at.
   7. CREATE TABLE IF NOT EXISTS {schema_name}.purchase_document_lines
      Campos: id, purchase_document_id, product_id, product_name_snapshot, sku_snapshot,
      quantity, received_quantity DEFAULT 0, pending_quantity, unit, unit_cost,
      discount_percent, tax_percent, line_total, notes.
   8. CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipts
      Campos: id, receipt_number, purchase_document_id, warehouse_id, reception_date,
      supplier_id, status (draft/confirmed/cancelled), notes, created_by, created_at.
   9. CREATE TABLE IF NOT EXISTS {schema_name}.stock_receipt_lines
      Campos: id, stock_receipt_id, purchase_document_line_id, product_id,
      quantity_received, unit_cost, unit, batch_number NULL, serial_number NULL,
      expiration_date NULL.
   10. CREATE TABLE IF NOT EXISTS {schema_name}.stock_movements (ledger append-only)
      Campos: id, movement_type (receipt/transfer_out/transfer_in/adjustment_in/
      adjustment_out/consumption/reversal), product_id, warehouse_id,
      related_warehouse_id NULL, reference_table, reference_id, reference_number,
      quantity, unit_cost, total_cost, movement_date, signed_quantity, notes,
      created_by, created_at.
   11. Índices: FKs de todas las tablas anteriores, columnas de status, y un índice
       compuesto (product_id, warehouse_id) en stock_movements.
   12. Trigger de inmutabilidad en stock_movements (sintaxis PG10, EXECUTE PROCEDURE,
       NO EXECUTE FUNCTION):

      CREATE OR REPLACE FUNCTION {schema_name}.trg_stock_movements_immutable()
      RETURNS trigger AS $$
      BEGIN
          RAISE EXCEPTION 'stock_movements is append-only (no UPDATE/DELETE)';
      END; $$ LANGUAGE plpgsql;

      CREATE TRIGGER stock_movements_no_mutate
      BEFORE UPDATE OR DELETE ON {schema_name}.stock_movements
      FOR EACH ROW EXECUTE PROCEDURE {schema_name}.trg_stock_movements_immutable();

2) Crear Database/04_migrations/45_notifications_inventory_category.sql,
   mirando LITERALMENTE Database/04_migrations/31_notifications_dental_category.sql
   como plantilla, pero agregando la categoría 'inventory' en vez de 'dental':
   - DROP/re-ADD el CHECK constraint de public.notifications.category agregando 'inventory'.
   - ALTER ... SET DEFAULT en notification_preferences.categories agregando "inventory":true.
   - UPDATE retroactivo agregando "inventory":true a las preferencias que no lo tengan.

3) Editar BackEnd/templates/tenant_schema.sql (ESTE PASO ES OBLIGATORIO, es el de
   mayor riesgo de fallo silencioso — sin él, las compañías nuevas nacen SIN estas tablas):
   - Edit A: dentro del CREATE TABLE products existente (bloque "CORE 1 — GARAGE
     OPERATIONS", ~líneas 351-365), agregar inline las mismas 14 columnas de inventario.
   - Edit B: agregar un bloque nuevo demarcado "-- ═══ CORE 4 — INVENTORY ═══" DESPUÉS
     de la sección dental (antes del GRANT final), con los mismos CREATE TABLE IF NOT
     EXISTS de la Sección B de la migración 44 (suppliers, warehouses, document_sequences
     con seq_year, purchase_documents, purchase_document_lines, stock_receipts,
     stock_receipt_lines, stock_movements con su trigger) + todos sus índices + el mismo
     bloque DO $$ de la FK diferida de preferred_supplier_id.
   - NO agregar filas de module_catalog/module_transactions en tenant_schema.sql — eso
     vive solo en la migración 44 Sección A (schema public).
   - Verificación: crear un tenant nuevo usando SOLO tenant_schema.sql (sin correr la
     migración 44) y confirmar que las tablas de inventario y las columnas de products
     existen igual.

4) Revisión estática final: confirmar que las migraciones 44 y 45 son idempotentes
   (IF NOT EXISTS / ON CONFLICT en todos lados) para poder re-ejecutarlas a mano en
   phpPgAdmin sin error ante una corrida parcial previa, y que no hay sintaxis PG11+.

Si el diff total supera ~400 líneas, dividir en 2 commits/sub-ramas apiladas sobre
feature/inventory-core-batch-a: una con las migraciones 44+45, otra con el cambio de
tenant_schema.sql. Documentar en el mensaje de commit si se dividió y por qué.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar qué archivos
se crearon/modificaron y el nombre exacto de la rama.
```

---

## BATCH B — Backend: maestros (proveedores, bodegas, extensión de productos, correlativos)

*Depende de Batch A ya mergeado a `develop`.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feature/inventory-core-batch-b desde develop (ya con el Batch A mergeado).

Implementar el Batch B del Core de Inventario (Slice 1):

1) Crear BackEnd/services/inventory/sequenceService.js exportando
   allocateNumber(client, schema, documentType). Este helper corre DENTRO de la
   transacción del que lo llama (recibe el client pg, no abre la suya) — mirar
   BackEnd/controllers/garage/workOrdersController.js como precedente de
   db.getClient() + BEGIN + SELECT ... FOR UPDATE.

   Lógica exacta:
   -- dentro del BEGIN del caller
   SELECT id, prefix, current_number, padding, reset_policy,
          EXTRACT(YEAR FROM CURRENT_DATE)::int AS cur_year, seq_year
     FROM ${schema}.document_sequences
    WHERE document_type = $1 FOR UPDATE;
   -- si reset_policy='yearly' Y seq_year <> cur_year: next := 1, seq_year := cur_year
   -- si no: next := current_number + 1
   UPDATE ${schema}.document_sequences
      SET current_number = $next, seq_year = $cur_year, updated_at = NOW()
    WHERE id = $id RETURNING current_number;
   -- formato final: prefix || '-' || cur_year || '-' || lpad(next::text, padding, '0')
   --   => 'OC-2026-000001'

   Si no existe la fila document_type para el tenant, sembrarla primero
   (INSERT ... ON CONFLICT DO NOTHING) con defaults: prefijos OC/FC/OD/CI,
   padding=6, reset_policy='yearly'.

2) Crear BackEnd/controllers/inventory/suppliersController.js — patrón de catálogo
   simple: list (filtros q + status + normalized_name ILIKE), getById, create
   (dedupe por normalized_name usando normalizeCatalogText de
   BackEnd/utils/normalizeText.js), update, toggleStatus. Mirar
   BackEnd/controllers/garage/catalogsController.js como precedente de patrón.

3) Crear BackEnd/controllers/inventory/warehousesController.js — mismo patrón de
   catálogo simple, pero el dedupe es por code (único), no por nombre.

4) Extender BackEnd/controllers/garage/productsController.js (create y update)
   para aceptar y persistir los 14 campos nuevos de inventario. NO crear un
   controller de productos aparte — products sigue siendo maestro compartido.
   (La validación de "producto sin inventory_enabled no puede ir en línea de
   compra" se hace en el Batch C, no acá — este task es solo el CRUD extendido.)

5) Crear BackEnd/routes/inventory/inventoryRoutes.js mirando la estructura de
   BackEnd/routes/garage/garageRoutes.js. En este batch montar SOLO las rutas de
   suppliers y warehouses (las de purchase-documents/receipts/stock van en el
   Batch C). Montar el router en BackEnd/app.js bajo /api/inventory.

6) Agregar en BackEnd/config/routeModuleMap.js las entradas de este batch:
   - GET/POST /api/inventory/suppliers, GET/PUT/PATCH /api/inventory/suppliers/:id
     -> { module: 'inventory', transaction: 'inventory_suppliers' }
   - mismas rutas para warehouses -> { module: 'inventory', transaction: 'inventory_warehouses' }
   No dejar ninguna ruta de este batch sin mapear (si queda sin mapear, el module
   guard la deja en default-permit, que es un hueco de seguridad).

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH C — Backend: documentos de compra + recepciones + ledger + stock

*Depende de Batch B ya mergeado a `develop`.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feature/inventory-core-batch-c desde develop (ya con Batch A y B mergeados).

Implementar el Batch C del Core de Inventario (Slice 1):

1) Crear BackEnd/controllers/inventory/purchaseDocumentsController.js — patrón
   master-detail: list, getById con líneas, create (cabecera+líneas dentro de
   db.getClient() BEGIN/COMMIT llamando a sequenceService.allocateNumber), update
   en estado draft, changeStatus con transición
   draft -> issued -> partially_received|received, y cancelled desde draft/issued.
   Reglas a validar:
   - transición a 'issued' requiere al menos 1 línea válida (producto, quantity>0,
     unit_cost>=0).
   - rechazar líneas que referencien productos con inventory_enabled=false.

2) Crear BackEnd/controllers/inventory/stockReceiptsController.js — master-detail;
   acción confirm dentro de UNA transacción:
   - insertar stock_receipt_lines
   - insertar un movimiento stock_movements tipo 'receipt' por cada línea, con
     signed_quantity POSITIVO (mapa de signos: receipt/transfer_in/adjustment_in
     => +quantity; transfer_out/adjustment_out/consumption => -quantity; reversal
     => signo opuesto al movimiento que revierte)
   - actualizar purchase_document_lines.received_quantity / pending_quantity
   - actualizar purchase_documents.status a partially_received (si pending>0) o
     received (si pending=0)
   - recalcular products.average_cost con promedio ponderado (a nivel compañía,
     NO por bodega, en esta v1), guardando contra división por cero:
     new_avg = (old_on_hand*old_avg + qty_received*unit_cost) / (old_on_hand + qty_received)
   - actualizar products.last_purchase_cost = unit_cost

3) Notificación de stock bajo: dentro de stockReceiptsController.confirm, después
   de postear los movimientos, para cada producto recibido calcular el on_hand del
   par (product_id, warehouse_id):
     SELECT SUM(signed_quantity) FROM ${schema}.stock_movements
      WHERE product_id=? AND warehouse_id=?
   Si on_hand <= products.reorder_point (y reorder_point > 0), llamar a
   createNotification({ ..., category: 'inventory' }) desde
   BackEnd/utils/notifications.js con un type descriptivo de stock bajo.

4) Crear BackEnd/controllers/inventory/stockController.js — solo lectura:
   getStockByProduct, getStockByWarehouse, ambos vía SUM(signed_quantity)
   agrupado según corresponda.

5) Crear BackEnd/services/inventory/consumptionService.js — SOLO el contrato
   (stub), todavía no se conecta a Taller (eso es Slice 3, fuera de este batch).
   Exportar estas 3 funciones con JSDoc documentando el shape exacto:
     getAvailability(client|null, schema, { productId, warehouseId })
       -> { onHand, allowNegative }
     consumeStock(client, schema, { productId, warehouseId, quantity, unitCost,
       referenceTable, referenceId, referenceNumber, userId }) -> { movementId }
     reverseConsumption(client, schema, { originalMovementId, userId })
       -> { reversalMovementId }
   Todas reciben el client pg del caller (para que el consumo de Taller y el
   movimiento de inventario commiteen en la misma transacción cuando se conecten).

6) Extender BackEnd/routes/inventory/inventoryRoutes.js (creado en Batch B) con:
   CRUD de purchase-documents + PATCH /:id/status, CRUD de stock-receipts +
   POST /:id/confirm, GET /stock-by-product, GET /stock-by-warehouse.

7) Agregar en BackEnd/config/routeModuleMap.js las entradas restantes:
   - rutas de purchase-documents -> { module:'inventory', transaction:'inventory_purchase_documents' }
   - rutas de stock-receipts -> { module:'inventory', transaction:'inventory_receipts' }
   - GET /api/inventory/stock-by-product y GET /api/inventory/stock-by-warehouse
     -> { module:'inventory', transaction:'inventory_stock' } (fácil de olvidar
     por ser solo GET de lectura — no dejarlas sin mapear).

Si el diff supera ~400 líneas, dividir en sub-ramas apiladas: C1 = purchase
documents, C2 = receipts + stock + notificación.

Al terminar: NO abrir PR. Dejar todo commiteado en la rama y reportar archivos
creados/modificados y el nombre de la rama.
```

---

## BATCH D — Frontend (productos, proveedores, bodegas, compras, recepciones)

*Depende de Batch B (maestros) y Batch C (documentos) ya mergeados a `develop`. Si el diff es grande, partir en D1 (maestros) y D2 (documentos) como sub-ramas apiladas.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feature/inventory-core-batch-d1 desde develop (con Batch A/B/C mergeados).

Implementar D1 del Core de Inventario (Slice 1) — maestros:

1) Extender FrontEnd/Portal/src/views/garage/screens_garage_products.vue (+ su
   store en src/stores/ + su service en src/services/): convertir el
   NxrSlidePanel actual (tamaño lg/xl) en un panel con PESTAÑAS: General /
   Inventario / Abastecimiento, según la agrupación de campos de
   Plan/nexora-inventory-core-plan.md sección "Formulario de producto". Agregar
   los 14 campos de inventario al form, al store y al payload del service.

2) Crear FrontEnd/Portal/src/views/inventory/screens_inventory_suppliers.vue +
   store + service — mismo patrón que la pantalla de productos: lista + filtros +
   NxrSlidePanel de alta/edición (catálogo simple).

3) Crear FrontEnd/Portal/src/views/inventory/screens_inventory_warehouses.vue +
   store + service — mismo patrón catálogo simple + slide panel, dedupe por code.

4) Agregar entradas de router + visibilidad de menú/transacción para estas 3
   pantallas (route meta requiresModule/requiresTransaction, gateado en las
   transacciones inventory_suppliers / inventory_warehouses, igual que las rutas
   existentes de garage/dental).

Al terminar: NO abrir PR. Dejar todo commiteado y reportar archivos y rama.
```

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feature/inventory-core-batch-d2 desde develop (encadenada después de
que feature/inventory-core-batch-d1 esté mergeada).

Implementar D2 del Core de Inventario (Slice 1) — documentos:

1) Crear FrontEnd/Portal/src/views/inventory/screens_inventory_purchase_documents.vue
   + store + service — pantalla COMPLETA master-detail (NO modal chico, es
   requisito explícito del plan de dominio): header fijo arriba (correlativo,
   proveedor, fechas, condición de pago), grilla de líneas editable, totales en
   footer sticky. Ruta de detalle para crear/editar. Conectar a los endpoints del
   Batch C incluyendo las transiciones de estado (emitir/cancelar).

2) Crear FrontEnd/Portal/src/views/inventory/screens_inventory_receptions.vue +
   store + service — pantalla completa: header (documento origen, bodega, fecha)
   + grilla de líneas recibidas + acciones confirmar/imprimir. Conectar al
   endpoint confirm de stock-receipts del Batch C.

3) Agregar entradas de router + visibilidad de menú/transacción para estas 2
   pantallas (gateado en inventory_purchase_documents / inventory_receipts).

Al terminar: NO abrir PR. Dejar todo commiteado y reportar archivos y rama.
```

---

## BATCH E — Notificaciones (preferencias) + pruebas de aceptación manuales

*Depende de Batch A, C y D ya mergeados a `develop`. Cierra el Slice 1 de Inventario.*

```
Repo: C:\Users\Hernan Ricardo\Documents\GitHub\Nexora\Nexora.
Crear rama feature/inventory-core-batch-e desde develop (con A/B/C/D mergeados).

Implementar el Batch E del Core de Inventario (Slice 1):

1) Editar FrontEnd/Portal/src/views/admin/screens_notification_preferences.vue:
   agregar un toggle para la categoría 'inventory', igual que el toggle existente
   de 'dental' (mismo patrón visual y de binding al store de preferencias).

2) Correr manualmente y dejar marcados en el reporte final estos casos de
   aceptación (tal como están en Plan/nexora-inventory-core-plan.md, sección
   "Casos de prueba" — NO parafrasear, ejecutarlos literal):
   - crear producto con inventario habilitado
   - crear proveedor y bodega
   - emitir orden de compra a crédito
   - emitir factura de compra con folio externo
   - recepcionar parcialmente una compra
   - completar recepción pendiente
   - bloqueo de confirmación si no hay líneas válidas
   - correlativos independientes por tipo documental y tenant
   (Los casos de traslado entre bodegas, conteo físico y consumo/reversa desde
   Taller son Slice 2/3 — NO se prueban en este batch, quedan fuera de alcance.)

3) Verificar de punta a punta la notificación de stock bajo: recepcionar stock
   hasta quedar en o por debajo del reorder_point, y confirmar que aparece una
   notificación con category='inventory' para un usuario con esa preferencia
   activada.

4) Verificar el trigger de inmutabilidad: intentar un UPDATE o DELETE directo
   sobre una fila de stock_movements (vía psql o phpPgAdmin) y confirmar que el
   trigger lanza la excepción y lo bloquea.

Al terminar: NO abrir PR. Dejar todo commiteado y reportar: archivos
modificados, resultado de cada caso de prueba (pasa/no pasa), y el nombre de la
rama.
```

---

## Después de cada batch

Antes de arrancar el siguiente batch, alguien (el usuario o Claude en una sesión posterior) debe:
1. Revisar el diff de la rama contra las convenciones de este documento y contra `sdd/inventory-core/design` en Engram.
2. Correr `npm run dev`/`npm run build` (backend y frontend) para confirmar que no rompe nada existente.
3. Mergear a `develop` (o abrir el PR correspondiente) recién ahí.
4. Recién entonces levantar Codex con el prompt del batch siguiente.

Al cerrar el Batch E, este Slice 1 de Inventario queda terminado y el plan maestro
(`~/.claude/plans/en-la-carpeta-plan-generic-sutherland.md`) pasa al core de RRHH.
