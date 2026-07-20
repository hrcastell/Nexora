# Nexora Dental Module Overhaul v2

## Contexto

El modulo dental (`feature/dental-core`) esta funcional con 50 endpoints, 9 vistas, 13 migraciones. Esta segunda iteracion corrige bugs criticos, reestructura la terminologia clinica (servicio -> tratamiento), e incorpora 9 features nuevas solicitadas por el odontologista.

**Decisiones confirmadas:**
1. Eliminar la entidad "Tratamiento" (catalog clinico). Renombrar "Servicio" a "Tratamiento" (entidad facturable con precio). Los odontologos aplican tratamientos y procedimientos, no dan servicios.
2. Cotizacion = Presupuesto (un solo documento).
3. Adjuntos clinicos se asocian a la consulta, no al paciente.

**Flujo de negocio de referencia:** `plan/flujo_recepcion_consulta_odontologica.html`

---

## Estrategia de Branch y Seguridad

**Branch:** `feature/dental-overhaul-v2` basada en `feature/dental-core` (estado actual).
- Crear la rama ANTES de cualquier cambio.
- Si algo falla, `feature/dental-core` queda intacto como punto de restauracion.
- Al finalizar todas las fases, merge a `feature/dental-core` y luego a `main`.

**Engram por fase:** Despues de CADA fase completada:
- `mem_save` con topic_key `dental-overhaul-v2/phase-{N}` incluyendo: que se hizo, que queda pendiente, archivos cambiados.
- Permite continuar en otra sesion o con otro usuario de Claude.

**Auditoria por fase (OBLIGATORIA):**
1. `npm run build` en frontend (type-check + build)
2. `npm run dev` en backend (verificar arranque)
3. Auditoria con Codex rescue agent (second opinion)
4. Judgment Day (2 jueces ciegos + sintesis) para certificar el codigo
5. Solo despues de certificacion se hace commit de la fase.

---

## Flujo de Negocio Odontologico

Referencia completa: `plan/flujo_recepcion_consulta_odontologica.html`

### Proceso General

```
Paciente llega -> Tiene cita?
  NO: Buscar/crear paciente -> Crear consulta -> Atencion
  SI: Confirmar asistencia -> Convertir cita en consulta
      -> Multisesion activa? -> Continuar consulta existente
      -> No -> Crear nueva consulta -> Atencion
```

### Reglas Transversales

1. Creacion de paciente disponible desde Pacientes Y desde formulario de Consulta.
2. Busqueda por cedula/nombre: si no hay coincidencias, advertir y desplegar formulario de creacion en la misma ventana.
3. Consulta multisesion NO puede cerrarse hasta completar todas las sesiones o modificar formalmente el plan.
4. Pago por sesion != cuotas. Multisesion puede manejar: pago por sesion, pago unico, cuotas, o mixto.

### Maquina de Estados de Consulta (NUEVA)

```
[*] -> Borrador
Borrador -> Creada
Creada -> EnEvaluacion
EnEvaluacion -> Cotizada              (se genero cotizacion)
Cotizada -> PropuestaPendiente        (cotizacion enviada al paciente)
PropuestaPendiente -> Aceptada        (paciente acepto)
PropuestaPendiente -> Rechazada       (paciente rechazo)
Aceptada -> EnTratamiento             (tratamiento iniciado)
EnTratamiento -> SesionPendiente      (multisesion incompleta)
SesionPendiente -> EnTratamiento      (siguiente sesion)
EnTratamiento -> FinalizadaClinicamente
FinalizadaClinicamente -> PendientePago (saldo pendiente)
PendientePago -> Cerrada              (saldo resuelto/autorizado)
FinalizadaClinicamente -> Cerrada     (si saldo ya resuelto)
Rechazada -> Cerrada
```

**IMPACTO:** Estado actual tiene 8 estados. El flujo propone 11+ estados. Requiere:
- Migration para actualizar CHECK constraint
- State machine en `consultationsController.changeStatus`
- `ConsultationStatus` type en frontend
- Status labels y badges en todas las vistas
- DB values: `borrador`, `creada`, `en_evaluacion`, `cotizada`, `propuesta_pendiente`, `aceptada`, `en_tratamiento`, `sesion_pendiente`, `finalizada_clinicamente`, `pendiente_pago`, `cerrada`, `rechazada`
- Se conservan: `cancelled`, `no_show`, `voided` como terminales

### Subflujo: Buscar/Crear Paciente desde Consulta

```
Campo paciente -> Buscar cedula/nombre -> Coincidencias?
  SI: Lista -> Seleccionar -> Autocompletar
  NO: Alerta "no existe" -> Boton crear -> Formulario embebido -> Guardar -> Asociar
```

### Subflujo: Control Multisesion

```
Plan aceptado -> Crear plan sesiones -> N sesiones + objetivos + modalidad cobro
Loop: Ejecutar sesion -> Evolucion + evidencia -> Pago segun regla -> Quedan sesiones?
  SI: Agendar proxima -> Consulta abierta
  NO: Informe final -> Validar saldo -> Cerrar
```

---

## Grafo de Dependencias

```
Phase 0 (Bug Fixes + Tech Debt)
    |
Phase 1 (Rename Service -> Treatment + State Machine)
    |
    +---> Phase 2 (Print Infrastructure + Patient Photo)
    |         |
    |         +---> Phase 3 (Consultation Attachments)
    |         |
    |         +---> Phase 4 (Cotizaciones + Autorizacion)
    |         |
    |         +---> Phase 5 (Documentos Medicos)
    |
    +---> Phase 6 (Decomposicion consultation_detail + UI Gaps)
```

Phases 3, 4, 5 son independientes entre si y pueden ejecutarse en paralelo despues de Phase 2.

---

## Migraciones

| # | Nombre | Phase |
|---|--------|-------|
| 34 | fix_hardcoded_schemas | 0 |
| 35 | dental_rename_service_to_treatment | 1 |
| 35b | dental_consultation_status_expansion | 1 |
| 36 | dental_patient_photo | 2 |
| 37 | dental_consultation_attachments | 3 |
| 38 | dental_quotes | 4 |
| 39 | dental_medical_documents | 5 |

---

## Phase 0: Bug Fixes y Tech Debt

**Scope:** Corregir todos los bugs criticos y warnings conocidos ANTES de cambios estructurales.

### Bugs Criticos

**C1 - Migration 23 hardcoded a hernancius**
- `Database/04_migrations/23_dental_medical_history.sql`
- Fix: Migration 34 con tenant loop.

**C2 - `<Tag>` sin importar en services view**
- `FrontEnd/Portal/src/views/dental/screens_dental_services.vue:166`
- Fix: Agregar `Tag` a imports.

**C3 - Duracion hardcodeada a 1h en sesiones**
- `BackEnd/controllers/dental/consultationSessionsController.js:114`
- Fix: Leer `estimated_duration_minutes` del servicio. Default 60min.

### Warnings

- W1: Migration 30 hardcoded -> Migration 34 incluye fix.
- W3/W4: `registerPayment` y `payInstallment` sin transaccion -> `BEGIN/COMMIT`.
- W5: `recalcConsultationTotal` fuera de transaccion -> Ejecutar dentro del mismo client.
- W6: Post-conversion no navega -> `router.push` al detalle.

### Tech Debt

- `tenant_schema.sql` desactualizado (faltan migraciones 25-33) -> Sincronizar.
- `requireConsultation()` duplicada -> Extraer a `BackEnd/utils/dentalHelpers.js`.
- `dentalDashboardService.getFinance()` dead code -> Eliminar.

### Archivos

```
NEW:    Database/04_migrations/34_fix_hardcoded_schemas.sql
NEW:    BackEnd/utils/dentalHelpers.js
EDIT:   BackEnd/controllers/dental/consultationSessionsController.js
EDIT:   BackEnd/controllers/dental/consultationServicesController.js
EDIT:   BackEnd/controllers/dental/chargesController.js
EDIT:   FrontEnd/Portal/src/views/dental/screens_dental_services.vue
EDIT:   FrontEnd/Portal/src/views/dental/screens_dental_appointments.vue
EDIT:   BackEnd/templates/tenant_schema.sql
```

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-0")` + build + Judgment Day

---

## Phase 1: The Great Rename + State Machine

**Scope:** Renombrar Service -> Treatment, eliminar vieja entidad Treatment, y expandir maquina de estados de consulta segun flujo de negocio.

### 1.1 Database (Migration 35 — Rename)

Tenant loop:
1. DROP `dental_consultation_treatments` (vieja join)
2. DROP `dental_service_treatments` (join table)
3. DROP `dental_treatments` (vieja entidad)
4. RENAME `dental_services` -> `dental_treatments`
5. ADD columns: `category`, `procedure_code`, `requires_follow_up`, `requires_multiple_sessions`, `contraindications`, `post_treatment_instructions`
6. RENAME `service_id` -> `treatment_id` en: consultations, appointments, charges
7. RENAME `dental_consultation_services` -> `dental_consultation_treatments`
8. RENAME columnas: `service_id` -> `treatment_id`, `service_name_snapshot` -> `treatment_name_snapshot`
9. Renombrar indexes y constraints
10. UPDATE `public.module_transactions` codes

### 1.2 Database (Migration 35b — State Machine Expansion)

Tenant loop:
1. DROP CHECK constraint viejo en `dental_consultations.status`
2. ADD nuevo CHECK: `('borrador','creada','en_evaluacion','cotizada','propuesta_pendiente','aceptada','en_tratamiento','sesion_pendiente','finalizada_clinicamente','pendiente_pago','cerrada','rechazada','cancelled','no_show','voided')`
3. UPDATE existing data: `draft->borrador`, `created->creada`, `in_progress->en_evaluacion`, `in_treatment->en_tratamiento`, `completed->finalizada_clinicamente`

### 1.3 Backend

**DELETE:** `treatmentsController.js` (vieja)
**RENAME:** `servicesController.js` -> `treatmentsController.js`, `consultationServicesController.js` -> `consultationTreatmentsController.js`
**EDIT todos los controllers:** SQL references, aliases, error messages.
**EDIT `consultationsController.changeStatus`:** Nueva state machine con transiciones del flujo.
**EDIT `dentalRoutes.js`:** `/services` -> `/treatments`, `/consultations/:id/services` -> `/consultations/:id/treatments`

### 1.4 Frontend

**DELETE:** Viejos service files (service, store, view con nombre "treatments")
**RENAME:** Service files -> Treatment files
**EDIT `types/dental.ts`:** Renombrar tipos + expandir `ConsultationStatus` con nuevos estados
**EDIT todas las vistas:** Imports, stores, labels, status badges/colors para 11+ estados
**EDIT `router/index.ts`:** Routes renombradas

### Archivos (resumen)

```
NEW:    Database/04_migrations/35_dental_rename_service_to_treatment.sql
NEW:    Database/04_migrations/35b_dental_consultation_status_expansion.sql
DELETE: BackEnd/controllers/dental/treatmentsController.js (vieja)
DELETE: FrontEnd files viejos (3)
RENAME: BackEnd controllers (2), FrontEnd services/stores/views (5+)
EDIT:   ~25 archivos (controllers, routes, types, views, router, template)
```

**RIESGO ALTO:** Commit atomico. DDL no-transaccional en PG 10.

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-1")` + build + Judgment Day

---

## Phase 2: Print Infrastructure + Patient Photo

**Scope:** Sistema reutilizable de impresion + foto de paciente.

### 2.1 Print Infrastructure

**Approach:** Hidden print container + CSS `@media print` + `window.print()`. Zero deps backend.

**Nuevo: `DentalPrintDocument.vue`**
```
+-------------------------------------------+
| [Logo]     Clinica / Consultorio          |
|            Direccion, Telefono, Email     |
|            RIF/NIT: XXXXXXXXX             |
+-------------------------------------------+
| TITULO DOCUMENTO          N: XXX-XXXX     |
+-------------------------------------------+
| Paciente: Nombre | Cedula | Tel           |
+-------------------------------------------+
| Profesional: Dr. Nombre | Matricula       |
+-------------------------------------------+
|            [CONTENT SLOT]                 |
+-------------------------------------------+
| _______________    _______________        |
| Firma Profesional  Firma Paciente         |
| [Texto legal / condiciones]               |
+-------------------------------------------+
```

**Nuevo: `print.css`** — `@media print` + layout A4/Letter
**Nuevo: `usePrint.ts`** composable
**Nuevo endpoint: `GET /dental/company-config`** — datos del tenant para header

### 2.2 Patient Photo

**Migration 36:** `photo_url TEXT` en `dental_patient_profiles`
**Backend:** `POST/DELETE /dental/patients/:id/photo`
**Frontend:** Avatar con fallback iniciales en detail + lista

### 2.3 Document Upload Filter

**EDIT `upload.js`:** `documentFilter` (jpeg/png/webp/pdf/doc/docx) + `makeDentalDocumentUpload()`

### Archivos

```
NEW:    Database/04_migrations/36_dental_patient_photo.sql
NEW:    FrontEnd/Portal/src/components/dental/DentalPrintDocument.vue
NEW:    FrontEnd/Portal/src/assets/print.css
NEW:    FrontEnd/Portal/src/composables/usePrint.ts
EDIT:   BackEnd/utils/upload.js
EDIT:   BackEnd/controllers/dental/patientsController.js
EDIT:   BackEnd/routes/dental/dentalRoutes.js
EDIT:   BackEnd/controllers/dental/dashboardController.js
EDIT:   BackEnd/templates/tenant_schema.sql
EDIT:   FrontEnd types, views, services, stores, App.vue
```

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-2")` + build + Judgment Day

---

## Phase 3: Consultation Attachments

**Dep:** Phase 2 (document filter)

### Database (Migration 37)

`dental_consultation_attachments`: id, tenant_id, consultation_id FK, file_url, file_name, file_type, file_size_bytes, category CHECK ('xray','lab_result','prescription','consent','referral','general'), description, uploaded_by, created_at

### Backend

**Nuevo: `consultationAttachmentsController.js`** — list, upload, download, remove
**Routes:** GET/POST/DELETE `/consultations/:id/attachments[/:aid]`

### Frontend

**Nuevo: `ConsultationAttachmentsTab.vue`** — lista, upload con selector de categoria, preview imagenes, download PDFs.
Primer paso de decomposicion de consultation_detail.vue.

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-3")` + build + Judgment Day

---

## Phase 4: Cotizaciones + Autorizacion

**Dep:** Phase 1 (rename), Phase 2 (print)

### Database (Migration 38)

**dental_quotes:** id, tenant_id, customer_id, quote_number, quote_date, valid_until, status CHECK ('draft','sent','accepted','rejected','expired','converted'), total_amount, discount_amount, final_amount, notes, conditions_text, professional_id, accepted_at, accepted_by_name, acceptance_notes, rejected_at, rejection_reason, consultation_id, converted_at

**dental_quote_items:** id, tenant_id, quote_id FK, treatment_id FK, treatment_name_snapshot, description, tooth_reference, unit_price, quantity, subtotal, sort_order

**Sequence:** `dental_quote_number_seq` por schema. Format: `P-000001`.

### Backend

**Nuevo: `quotesController.js`**
- CRUD quotes + items
- `send` (draft->sent), `accept`, `reject`
- `convertToConsultation` (transaccional: crea consulta + consultation_treatments)
- `getPrintData`, `getForPatient`

**Estado consulta:** Al convertir quote -> consulta, el status inicial es `aceptada`.

### Frontend

**Nuevas vistas:**
- `screens_dental_quotes.vue` — lista con filtros
- `screens_dental_quote_detail.vue` — detalle con items, acciones, print

**Nuevo: `QuotePrintLayout.vue`**
```
+-------------------------------------------+
| [Company Header]                          |
+-------------------------------------------+
| PRESUPUESTO / COTIZACION    N: P-000001   |
| Fecha: DD/MM/YYYY  Valido hasta: DD/MM   |
+-------------------------------------------+
| # | Tratamiento | Diente | Cant | $ | Sub |
| 1 | Limpieza    |   -    |  1   | 50| 50  |
| 2 | Resina      | 1.4    |  2   | 80| 160 |
|                           Subtotal: 210   |
|                           Descuento: 10   |
|                           TOTAL: 200      |
+-------------------------------------------+
| Condiciones: [texto configurable]         |
+-------------------------------------------+
| [ ] Acepto las condiciones                |
| Nombre: ___________  Firma: ___________   |
| Fecha: ___________                        |
+-------------------------------------------+
```

**Integracion:** Tab "Presupuestos" en patient_detail.

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-4")` + build + Judgment Day

---

## Phase 5: Documentos Medicos

**Dep:** Phase 2 (print), Phase 1 (rename)

### Database (Migration 39)

**dental_medical_documents:** id, tenant_id, customer_id, consultation_id, document_type CHECK ('medical_report','medical_certificate','prescription'), document_number, document_date, title, content, professional_name, professional_license, professional_specialty

### Backend

**Nuevo: `medicalDocumentsController.js`** — CRUD + getPrintData

### Frontend

**Nuevo: `MedicalDocumentForm.vue`** — form segun tipo:
- Informe: diagnostico, resumen tratamiento, notas
- Constancia: texto certificacion prefilled
- Receta: lista medicamentos (nombre, dosis, frecuencia, duracion)

**Nuevo: `MedicalDocumentPrintLayout.vue`** — 3 layouts:

**Informe Medico:**
```
[Header] | INFORME MEDICO N: IM-000001
Diagnostico: [texto] | Tratamiento: [texto] | Notas: [texto]
Firma Profesional
```

**Constancia Medica:**
```
[Header] | CONSTANCIA MEDICA
"Se hace constar que [PACIENTE] fue atendido/a el dia [FECHA]..."
[contenido libre]
Firma y sello
```

**Receta:**
```
[Header] | Rx N: RX-000001
1. Medicamento - Dosis - Frecuencia - Duracion
2. Medicamento - Dosis - Frecuencia - Duracion
Indicaciones: [texto]
NO SE AUTOMEDIQUE | Firma Profesional
```

**Integracion:** Botones "Generar Informe/Constancia/Receta" en consultation detail. Tab "Documentos" en patient detail.

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-5")` + build + Judgment Day

---

## Phase 6: Decomposicion + UI Gaps

### 6.1 Decomposicion consultation_detail.vue (1769 lineas -> thin shell + 8 sub-componentes)

| Componente | Contenido |
|------------|-----------|
| `ConsultationSummaryTab.vue` | Info paciente, diagnostico, notas, resumen financiero |
| `ConsultationTreatmentsTab.vue` | Tratamientos aplicados + follow-up |
| `ConsultationSessionsTab.vue` | Gestion de sesiones |
| `ConsultationPhotosTab.vue` | Galeria fotos |
| `ConsultationHistoryTab.vue` | Historia clinica |
| `ConsultationPaymentsTab.vue` | Cargo, pagos, cuotas |
| `ConsultationAttachmentsTab.vue` | Ya creado en Phase 3 |
| `ConsultationDocumentsSection.vue` | Ya creado en Phase 5 |

### 6.2 UI Gaps Pendientes

| Feature | Fix |
|---------|-----|
| Editar/reprogramar turno | NxrSlidePanel con form (PATCH existe) |
| checked_in status | Boton cuando status=confirmed |
| Pagar cuota individual | Boton por fila (POST existe) |
| Cancelar sesion | Boton + nuevo endpoint POST cancel |
| Calendar day drill-down | Click filtra/scrollea |
| Crear paciente desde formulario consulta | Subflujo embebido (regla transversal #2) |

### Post-fase: `mem_save(topic_key: "dental-overhaul-v2/phase-6")` + build + Judgment Day

---

## Endpoints Nuevos (28 total)

| Method | Path | Phase |
|--------|------|-------|
| GET | `/dental/company-config` | 2 |
| POST | `/dental/patients/:id/photo` | 2 |
| DELETE | `/dental/patients/:id/photo` | 2 |
| GET | `/dental/consultations/:id/attachments` | 3 |
| POST | `/dental/consultations/:id/attachments` | 3 |
| GET | `/dental/consultations/:id/attachments/:aid` | 3 |
| DELETE | `/dental/consultations/:id/attachments/:aid` | 3 |
| GET | `/dental/quotes` | 4 |
| POST | `/dental/quotes` | 4 |
| GET | `/dental/quotes/:id` | 4 |
| PATCH | `/dental/quotes/:id` | 4 |
| DELETE | `/dental/quotes/:id` | 4 |
| POST | `/dental/quotes/:id/items` | 4 |
| PATCH | `/dental/quotes/:id/items/:itemId` | 4 |
| DELETE | `/dental/quotes/:id/items/:itemId` | 4 |
| POST | `/dental/quotes/:id/send` | 4 |
| POST | `/dental/quotes/:id/accept` | 4 |
| POST | `/dental/quotes/:id/reject` | 4 |
| POST | `/dental/quotes/:id/convert` | 4 |
| GET | `/dental/quotes/:id/print` | 4 |
| GET | `/dental/patients/:id/quotes` | 4 |
| GET | `/dental/medical-documents` | 5 |
| POST | `/dental/medical-documents` | 5 |
| GET | `/dental/medical-documents/:id` | 5 |
| PATCH | `/dental/medical-documents/:id` | 5 |
| DELETE | `/dental/medical-documents/:id` | 5 |
| GET | `/dental/medical-documents/:id/print` | 5 |
| POST | `/dental/consultations/:id/sessions/:sid/cancel` | 6 |

---

## Riesgos

1. **Phase 1 es la de mayor riesgo.** DDL no-transaccional en PG 10. Testear en copia.
2. **State machine expansion:** Datos existentes deben migrarse. UPDATE masivo necesario.
3. **Build breakage en Phase 1.** Commit atomico obligatorio.
4. **Sequences en PG 10.** `CREATE SEQUENCE IF NOT EXISTS` soportado.
5. **Quote numbers per-schema.** P-000001 puede repetirse entre companias (correcto).

## Verificacion por Fase

1. `npm run build` en FrontEnd/Portal
2. `npm run dev` en BackEnd (arranque sin errores)
3. Codex rescue agent (second opinion del codigo)
4. Judgment Day (2 jueces ciegos + sintesis + certificacion)
5. Migration testeable en phpPgAdmin
6. Responsive mobile (< 430px)
7. Print: `window.print()` legible en Chrome + Firefox
