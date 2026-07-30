# Análisis de Ventanas/Forms vs BD vs API (Coherencia End-to-End)

> **Objetivo:** definir la **estructura de pantallas (ventanas)** y sus **formularios** basados en un **esquema de BD propuesto** y una **API REST** coherente con dicha BD.  
> **Stack:** Vue 3 + Tailwind (Front) · Node.js (NestJS recomendado) (Back) · PostgreSQL + Prisma (BD/ORM).  
> **Convención clave:** BD en `snake_case` · API/JSON en `camelCase` (con mapeo explícito).

---

## 0) Supuestos y reglas de coherencia

### 0.1 Convenciones de nombres
- **BD (PostgreSQL):** `snake_case`
- **API (JSON):** `camelCase`
- **Enums (BD):** `UPPER_SNAKE_CASE` o `lowercase` consistente (recomendado `UPPER_SNAKE_CASE`)
- **Timestamps:** `created_at`, `updated_at` en BD · `createdAt`, `updatedAt` en API

### 0.2 Reglas de persistencia (evitar “datos sueltos”)
- Todo dato capturado por un form que impacte el negocio debe:
  1) existir en BD (columna o `payload_json` validado)  
  2) tener contrato en API (DTO)  
  3) tener validación en backend (no solo frontend)
- **No** se guardan strings “libres” donde corresponda un catálogo (ej: tipo de solicitud) → usar FK a tablas de configuración.

### 0.3 Estrategia para campos variables por tipo de solicitud
Para evitar alterar el esquema por cada nuevo tipo:
- `requests.payload_json` guarda campos específicos (ej: motivo, reemplazo, centro de costo)
- El backend valida `payload_json` con un **schema por tipo** (Zod / class-validator + reglas)
- Los PDFs y vistas leen el mismo contrato (DTO) → **una fuente de verdad**

---

## 1) Esquema de BD propuesto (base para ventanas/forms)

> Nota: esto es el “mínimo viable” consistente con el roadmap. Se puede extender sin romper contratos.

### 1.1 Tablas principales

#### `users`
- `id` (uuid, PK)
- `email` (unique, not null)
- `password_hash` (not null) *(si no hay SSO)*
- `is_active` (bool)
- `created_at`, `updated_at`

#### `roles`
- `id` (uuid, PK)
- `code` (unique) ej: `EMPLOYEE`, `APPROVER`, `HR`, `ADMIN`
- `name`
- `created_at`

#### `user_roles`
- `user_id` (FK users)
- `role_id` (FK roles)
- PK compuesta (`user_id`, `role_id`)

#### `employees`
- `id` (uuid, PK)
- `user_id` (FK users, unique)
- `employee_code` (unique, opcional)
- `full_name` (not null)
- `phone` (nullable)
- `position` (nullable)
- `project` (nullable)
- `manager_user_id` (FK users, nullable)  ← define jerarquía de aprobación
- `hire_date` (date, nullable)
- `created_at`, `updated_at`

#### `benefit_balances`
- `id` (uuid, PK)
- `employee_id` (FK employees, unique)
- `vacation_days_available` (numeric(6,2) o integer según política)
- `permission_hours_available` (numeric(6,2), nullable)
- `updated_at`

#### `request_types`
- `id` (uuid, PK)
- `code` (unique) ej: `VACATION`, `PERMISSION_HOURS`, `DISCONNECTION`
- `name`
- `is_active` (bool)
- `schema_json` (jsonb, nullable) ← esquema para validar payload (si se decide persistir)
- `created_at`, `updated_at`

#### `requests`
- `id` (uuid, PK)
- `employee_id` (FK employees)
- `request_type_id` (FK request_types)
- `start_datetime` (timestamptz, not null)
- `end_datetime` (timestamptz, not null)
- `current_status` (enum/text, not null)
- `payload_json` (jsonb, not null default `{}`)
- `submitted_at` (timestamptz, nullable)
- `created_at`, `updated_at`

#### `request_approvals`
- `id` (uuid, PK)
- `request_id` (FK requests, unique para 1er MVP: una sola aprobación)
- `approver_user_id` (FK users)
- `decision` (enum/text: `APPROVED`, `REJECTED`)
- `comment` (text, nullable pero **obligatorio si REJECTED**)
- `decided_at` (timestamptz)

#### `request_status_history`
- `id` (uuid, PK)
- `request_id` (FK requests)
- `from_status` (text)
- `to_status` (text)
- `changed_by_user_id` (FK users)
- `comment` (text, nullable)
- `changed_at` (timestamptz)

#### `attachments`
- `id` (uuid, PK)
- `request_id` (FK requests)
- `file_url` (text)
- `file_name` (text)
- `mime_type` (text)
- `size_bytes` (bigint)
- `uploaded_by_user_id` (FK users)
- `uploaded_at` (timestamptz)

#### `signatures`
- `id` (uuid, PK)
- `request_id` (FK requests, nullable)
- `document_id` (FK documents, nullable)
- `signer_employee_id` (FK employees)
- `image_url` (text)  *(o blob; recomendado URL a storage)*
- `signed_at` (timestamptz)

> Regla: `signatures` referencia o `request_id` o `document_id` (uno u otro).

#### `documents`
- `id` (uuid, PK)
- `request_id` (FK requests)
- `doc_type` (enum/text: `REQUEST_PDF`, `COMPROBANTE_PDF`)
- `version` (int)
- `file_url` (text)
- `generated_by_user_id` (FK users)
- `generated_at` (timestamptz)

#### `holiday_calendar`
- `date` (date, PK)
- `country` (text, default)
- `region` (text, nullable)
- `description` (text)

#### `notification_log`
- `id` (uuid, PK)
- `channel` (text: `EMAIL`)
- `to_address` (text)
- `subject` (text)
- `template_code` (text)
- `status` (text: `SENT`, `FAILED`, `QUEUED`)
- `provider_message_id` (text, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamptz)

---

## 2) Catálogos y Enums (API = BD)

### 2.1 `RequestType.code`
- `VACATION`
- `PERMISSION_HOURS`
- `DISCONNECTION`

### 2.2 `RequestStatus` (BD: `requests.current_status`)
Sugeridos para MVP:
- `SUBMITTED`
- `PENDING_APPROVAL`
- `REJECTED`
- `APPROVED`
- `HR_REVIEW`
- `COMPROBANTE_GENERATED`
- `EMPLOYEE_SIGNATURE_PENDING`
- `COMPLETED`
- `CANCELLED` *(opcional MVP)*

### 2.3 `ApprovalDecision` (BD: `request_approvals.decision`)
- `APPROVED`
- `REJECTED`

### 2.4 Tipos de documento (BD: `documents.doc_type`)
- `REQUEST_PDF`
- `COMPROBANTE_PDF`

---

## 3) Ventanas / Pantallas (Front) y mapeo a BD + API

> Estructura por rol. Para cada pantalla se definen: **campos**, **BD**, **API**, **validaciones**.

---

### 3.1 (GLOBAL) Login

**UI**
- Email
- Password *(si no hay SSO)*

**BD**
- `users.email`, `users.password_hash`, `users.is_active`

**API**
- `POST /auth/login`
  - Req: `{ email, password }`
  - Res: `{ accessToken, refreshToken, user: { id, email, roles[] } }`

**Validaciones**
- Email formato
- Cuenta activa

---

### 3.2 (Empleado) Mi Perfil — “Ficha del empleado”

**UI (lectura/edición controlada)**
- fullName *(editable? depende política)*
- phone *(editable)*
- email *(normalmente no editable; si se edita afecta login)*
- position *(solo RRHH?)*
- project *(solo RRHH/ADMIN?)*
- hireDate *(solo RRHH)*
- manager *(lectura)*

**BD**
- `employees.full_name`
- `employees.phone`
- `users.email`
- `employees.position`, `employees.project`, `employees.hire_date`
- `employees.manager_user_id`

**API**
- `GET /me` → incluye perfil + roles
- `GET /employees/me`
- `PATCH /employees/me` *(solo campos permitidos)*
  - Req: `{ phone, ... }`

**Validaciones**
- Campos editables por rol
- Teléfono formato
- Auditoría (registrar cambios sensibles)

---

### 3.3 (Empleado) Beneficios / Saldos

**UI**
- vacationDaysAvailable
- permissionHoursAvailable *(si aplica)*
- otros (a futuro)

**BD**
- `benefit_balances.vacation_days_available`
- `benefit_balances.permission_hours_available`

**API**
- `GET /benefits/me`
  - Res: `{ vacationDaysAvailable, permissionHoursAvailable, updatedAt }`

**Validaciones**
- No negativas
- Si se recalculan por reglas, **backend manda el valor**

---

### 3.4 (Empleado) Nueva Solicitud — Wizard por tipo

#### 3.4.1 Paso 1: Tipo de solicitud
**UI**
- requestType (selector)

**BD**
- `request_types.id/code` (catálogo)

**API**
- `GET /request-types/active`
- `POST /requests` (creación)

---

#### 3.4.2 Form: Vacaciones (`VACATION`)

**UI**
- startDate (fecha inicio)
- endDate (fecha fin)
- (auto) calculatedDaysRequested (solo visual)
- optional: notes / motivo (si se requiere)

**BD**
- `requests.start_datetime`
- `requests.end_datetime`
- `requests.payload_json` (opcional `notes`)
- Impacta saldo en `benefit_balances` **solo al completar** (decisión de negocio)

**API**
- `POST /requests`
  - Req:
    ```json
    {
      "requestTypeCode": "VACATION",
      "startDate": "2026-02-20",
      "endDate": "2026-02-25",
      "payload": { "notes": "..." }
    }
    ```
  - Res: `{ requestId, currentStatus }`

**Validaciones (backend)**
- endDate >= startDate
- calcular días hábiles con `holiday_calendar` (si aplica)
- validar contra `benefit_balances.vacation_days_available` (si aplica)
- política de anticipación mínima (si aplica)

**Notas coherencia**
- Si el cálculo usa días hábiles, guardar también en `payload_json.days_requested` para trazabilidad del cálculo:
  - `payload_json = { "daysRequested": 4, "calculation": { ... } }`

---

#### 3.4.3 Form: Permiso por horas (`PERMISSION_HOURS`)

**UI**
- date
- startTime
- endTime
- reason (opcional u obligatorio según política)

**BD**
- `requests.start_datetime`, `requests.end_datetime`
- `requests.payload_json.reason`

**API**
- `POST /requests`
  - Req:
    ```json
    {
      "requestTypeCode": "PERMISSION_HOURS",
      "date": "2026-02-11",
      "startTime": "14:00",
      "endTime": "16:00",
      "payload": { "reason": "Trámite médico" }
    }
    ```

**Validaciones**
- endTime > startTime
- ventana permitida por política
- si hay saldo de horas, validar `benefit_balances.permission_hours_available`

---

#### 3.4.4 Form: Desconexión (`DISCONNECTION`)

**UI**
- date
- startTime
- endTime
- notes (opcional)

**BD**
- `requests.start_datetime`, `requests.end_datetime`
- `requests.payload_json.notes`

**API**
- `POST /requests` con `requestTypeCode=DISCONNECTION`

**Validaciones**
- endTime > startTime
- regla: solo fuera de jornada (si aplica)

---

#### 3.4.5 Firma del empleado

**UI**
- Canvas firma
- botón “Enviar solicitud”

**BD**
- `signatures.image_url`
- `requests.submitted_at`
- `requests.current_status` cambia a `PENDING_APPROVAL`
- `request_status_history` (registro)

**API**
- `POST /requests/:id/signature`
  - Req: `{ imageBase64 }` *(o upload directo a storage)*
- `POST /requests/:id/submit`
  - cambia estado y dispara notificación

**Validaciones**
- Firma obligatoria para enviar
- No permitir submit si faltan campos

---

### 3.5 (Empleado) Historial de Solicitudes

**UI**
- Lista: fecha, tipo, rango, estado, aprobador, decisión
- Filtros: estado/tipo/rango fechas
- Detalle: timeline de estados

**BD**
- `requests.*`
- `request_types.*`
- `request_status_history.*`
- `request_approvals.*`
- `documents.*`

**API**
- `GET /requests/me?status=&type=&from=&to=`
- `GET /requests/:id` (detalle + timeline)

**Validaciones**
- Un empleado solo ve sus solicitudes (scoping por `employee_id`)

---

### 3.6 (Aprobador) Bandeja de Aprobaciones

**UI**
- Lista pendientes
- Detalle de solicitud (solo lectura)
- Botones: Aprobar / Rechazar
- Campo “Observación” (obligatorio si rechaza)

**BD**
- `requests.current_status = PENDING_APPROVAL`
- `request_approvals` (se crea/actualiza)
- `request_status_history`

**API**
- `GET /approvals/inbox`
- `POST /requests/:id/approve`
- `POST /requests/:id/reject` con `{ comment }`

**Validaciones (backend)**
- Solo rol aprobador
- Solo solicitudes que correspondan (ej: por `employees.manager_user_id = approver.id` o regla por proyecto)
- Rechazo exige `comment` no vacío
- Registrar `decided_at`

**Notas coherencia**
- En `requests.payload_json`, guardar snapshot del aprobador y políticas aplicadas solo si se requiere auditoría adicional. Preferible no duplicar: usar `request_approvals`.

---

### 3.7 (RRHH) Bandeja RRHH (aprobadas)

**UI**
- Lista: aprobadas pendientes de RRHH
- Vista formal de solicitud
- Botón: “Generar PDF Solicitud”
- Botón: “Generar Comprobante”
- Estado de firma del comprobante (si aplica)

**BD**
- Filtra `requests.current_status = APPROVED` o `HR_REVIEW`
- `documents` crea versiones
- `signatures` para comprobante si aplica

**API**
- `GET /hr/inbox`
- `POST /requests/:id/hr/start-review` → estado `HR_REVIEW`
- `POST /requests/:id/documents/request-pdf`
- `POST /requests/:id/documents/comprobante-pdf`
- `POST /documents/:id/signature` (si el comprobante requiere firma)

**Validaciones**
- Solo rol RRHH
- No regenerar versiones sin control (incrementar `version`)

---

### 3.8 (RRHH) Emisión y Cierre

**UI**
- Marcar como completado
- Adjuntar observación final (opcional)
- Descargar documentos finales

**BD**
- `requests.current_status = COMPLETED`
- `request_status_history`
- opcional: ajuste de saldos (si saldo se descuenta al completar)

**API**
- `POST /requests/:id/complete`

**Validaciones**
- No completar si falta comprobante/firma (según política)

---

### 3.9 (Admin) Configuración (mínimo)

**Pantallas**
- Tipos de solicitud
- Feriados
- Roles/usuarios (si no hay fuente externa)

**BD**
- `request_types`
- `holiday_calendar`
- `roles`, `user_roles`

**API**
- `GET/POST/PATCH /admin/request-types`
- `GET/POST/DELETE /admin/holidays`
- `GET/POST/PATCH /admin/users` (opcional)

---

## 4) Contratos API (DTOs) coherentes con BD

### 4.1 DTO: RequestCreate (API → BD)
**API**
```json
{
  "requestTypeCode": "VACATION",
  "startDate": "2026-02-20",
  "endDate": "2026-02-25",
  "date": "2026-02-11",
  "startTime": "14:00",
  "endTime": "16:00",
  "payload": { "notes": "..." }
}
```
**Mapeo BD**
- `request_type_id` ← resolve por `request_types.code`
- `start_datetime`, `end_datetime` ← compuesto desde fecha/hora
- `payload_json` ← `payload` + extras calculados (ej: `daysRequested`)

> Nota: Para evitar ambigüedad, el backend normaliza a `start_datetime/end_datetime` siempre.

### 4.2 DTO: RequestListItem (BD → API)
- Desde `requests`, join `request_types`, `request_approvals` (si existe)
```json
{
  "id": "uuid",
  "type": { "code": "VACATION", "name": "Vacaciones" },
  "startDateTime": "2026-02-20T00:00:00Z",
  "endDateTime": "2026-02-25T23:59:59Z",
  "currentStatus": "PENDING_APPROVAL",
  "submittedAt": "2026-02-11T10:10:00Z",
  "approval": { "decision": null, "comment": null, "decidedAt": null }
}
```

### 4.3 DTO: RejectRequest (API → BD)
```json
{ "comment": "No es posible por cierre de sprint." }
```
**Regla:** `comment` not null, length >= 5 (ejemplo).

---

## 5) Aseguramiento de coherencia (BD ↔ API ↔ UI)

### 5.1 Checklist de coherencia (obligatorio)
1. **Cada campo** del UI tiene:
   - fuente en BD (columna o payload_json)
   - DTO en API
   - validación backend
2. El **status** se controla solo en backend (front no inventa estados).
3. Cualquier catálogo se obtiene de BD (`request_types`) y no hardcodeado.
4. Los cálculos (días de vacaciones) se hacen en backend y se guardan en `payload_json` para auditoría.
5. PDFs se generan desde datos persistidos (BD), no desde “lo que el front manda” en el momento.

### 5.2 Pruebas recomendadas (para evitar desalineación)
- Contract tests (snapshot de DTOs)
- Tests e2e de flujo:
  - crear → firmar → submit → aprobar/rechazar → RRHH → pdf → completar

---

## 6) Matriz Pantalla ↔ Endpoints ↔ Tablas (resumen)

| Pantalla | Endpoints | Tablas |
|---|---|---|
| Login | POST /auth/login | users, roles, user_roles |
| Mi Perfil | GET/PATCH /employees/me | employees, users |
| Beneficios | GET /benefits/me | benefit_balances |
| Nueva Solicitud | GET /request-types/active · POST /requests | request_types, requests |
| Firma + Submit | POST /requests/:id/signature · POST /requests/:id/submit | signatures, requests, history |
| Historial | GET /requests/me · GET /requests/:id | requests, types, history, approvals, documents |
| Bandeja Aprobador | GET /approvals/inbox · POST approve/reject | requests, approvals, history |
| Bandeja RRHH | GET /hr/inbox · POST docs | requests, documents, signatures |
| Admin Config | /admin/* | request_types, holiday_calendar, roles, users |

---

## 7) Observaciones y “puntos de decisión” (para cerrar antes de codificar)
- ¿Saldo de vacaciones se descuenta al **aprobar** o al **completar**?
- ¿Aprobador se define por `manager_user_id` o por “proyecto/área” (tabla adicional)?
- ¿Comprobante siempre requiere firma del empleado o solo en algunos tipos?
- ¿Se permiten solicitudes “parciales” (medios días) en vacaciones?
- ¿Se soporta anulación por parte del empleado? (estado `CANCELLED` + motivo)

---

**Fin del documento.**
