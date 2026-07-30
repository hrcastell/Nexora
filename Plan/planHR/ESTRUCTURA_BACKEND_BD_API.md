# Estructura del Backend (Node.js) — Coordinación BD ↔ API

> **Objetivo:** definir una estructura completa del backend para asegurar coordinación entre **BD (PostgreSQL)** y **API (REST)**, con módulos claros, DTOs, validaciones y servicios transversales (PDF/Email/Storage/Auditoría).  
> **Recomendación:** **NestJS + Prisma** (mejor disciplina y escalabilidad).

---

## 1) Principios de arquitectura

- Arquitectura modular por dominio: `auth`, `employees`, `benefits`, `requests`, `approvals`, `hr`, `documents`, `notifications`, `holidays`, `admin`, `audit`.
- Separación:
  - **Controllers**: capa HTTP (DTOs, status codes)
  - **Services**: lógica de negocio (reglas, estados, validaciones)
  - **Repositories/Prisma**: persistencia
- Validación:
  - DTOs + pipes (NestJS) o Zod (por tipo de solicitud)
  - Nunca confiar en validaciones del frontend
- Coherencia BD/API:
  - Prisma schema es la fuente de verdad (migraciones versionadas)
  - Swagger/OpenAPI generado desde DTOs para congelar contratos

---

## 2) Estructura de carpetas (propuesta)

```
backend/
  package.json
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    main.ts
    app.module.ts

    common/
      config/
        env.validation.ts
        configuration.ts
      constants/
        enums.ts
      decorators/
        roles.decorator.ts
        user.decorator.ts
      guards/
        jwt-auth.guard.ts
        roles.guard.ts
      interceptors/
        audit.interceptor.ts
      pipes/
        zod-validation.pipe.ts
      utils/
        datetime.util.ts
        pagination.util.ts
      types/
        paginated.type.ts

    infra/
      prisma/
        prisma.module.ts
        prisma.service.ts
      mail/
        mail.module.ts
        mail.service.ts
        templates/
          approval_request.hbs
          request_rejected.hbs
          request_approved_to_hr.hbs
      storage/
        storage.module.ts
        storage.service.ts        # S3/MinIO adapter
      pdf/
        pdf.module.ts
        pdf.service.ts            # Puppeteer HTML->PDF
        templates/
          request_pdf.html
          comprobante_pdf.html

    modules/
      auth/
        auth.module.ts
        auth.controller.ts
        auth.service.ts
        dto/
          login.dto.ts
          refresh.dto.ts
        strategies/
          jwt.strategy.ts
        guards/
          refresh.guard.ts

      users/
        users.module.ts
        users.service.ts
        users.repository.ts

      roles/
        roles.module.ts
        roles.service.ts

      employees/
        employees.module.ts
        employees.controller.ts
        employees.service.ts
        dto/
          update-employee.dto.ts
          employee.response.ts

      benefits/
        benefits.module.ts
        benefits.controller.ts
        benefits.service.ts
        dto/
          benefits.response.ts

      request-types/
        request-types.module.ts
        request-types.controller.ts
        request-types.service.ts
        dto/
          request-type.response.ts

      requests/
        requests.module.ts
        requests.controller.ts
        requests.service.ts
        requests.state-machine.ts
        validators/
          vacation.validator.ts
          permission-hours.validator.ts
          disconnection.validator.ts
        dto/
          create-request.dto.ts
          submit-request.dto.ts
          request.detail.response.ts
          request.list.response.ts
          add-signature.dto.ts

      approvals/
        approvals.module.ts
        approvals.controller.ts
        approvals.service.ts
        dto/
          inbox.response.ts
          approve.dto.ts
          reject.dto.ts

      hr/
        hr.module.ts
        hr.controller.ts
        hr.service.ts
        dto/
          hr.inbox.response.ts
          complete.dto.ts

      documents/
        documents.module.ts
        documents.controller.ts
        documents.service.ts
        dto/
          generate-document.dto.ts
          document.response.ts

      holidays/
        holidays.module.ts
        holidays.controller.ts
        holidays.service.ts
        dto/
          holiday.dto.ts

      notifications/
        notifications.module.ts
        notifications.service.ts

      audit/
        audit.module.ts
        audit.service.ts

      admin/
        admin.module.ts
        admin.controller.ts
        admin.service.ts
  test/
    e2e/
    unit/
  Dockerfile
  docker-compose.yml
  .env.example
  README.md
```

---

## 3) Módulos y responsabilidades (cómo coordinan con BD)

### 3.1 `auth`
- Login (JWT), refresh, logout
- Resuelve roles del usuario (join `user_roles`)

**Tablas:** `users`, `roles`, `user_roles`

### 3.2 `employees`
- `GET /employees/me`
- `PATCH /employees/me` (campos permitidos por rol)
- (Admin/RRHH) endpoints opcionales para actualizar perfil laboral

**Tablas:** `employees`, `users`

### 3.3 `benefits`
- `GET /benefits/me`
- (RRHH/Admin) actualización de saldos (fase posterior)

**Tablas:** `benefit_balances`

### 3.4 `request-types`
- `GET /request-types/active`
- Admin: CRUD

**Tablas:** `request_types`

### 3.5 `requests`
- Crear solicitud, firmar, enviar, listar, detalle
- Contiene **State Machine** y **validadores por tipo**
- Normaliza todo a `start_datetime/end_datetime`
- Genera eventos internos para notificaciones y auditoría

**Tablas:** `requests`, `signatures`, `request_status_history`, `attachments`

### 3.6 `approvals`
- Bandeja del aprobador
- Aprobar/Rechazar (con comment obligatorio si rechaza)
- Cambia estado y registra historial

**Tablas:** `requests`, `request_approvals`, `request_status_history`

### 3.7 `hr`
- Bandeja RRHH
- Iniciar revisión, generar documentos, completar

**Tablas:** `requests`, `documents`, `signatures`, `request_status_history`

### 3.8 `documents`
- Generación de PDF con plantillas
- Versionado automático
- Persistencia de URL en storage

**Tablas:** `documents` (+ storage)

### 3.9 `notifications`
- Orquestación de correos (plantillas)
- Escribe `notification_log` para trazabilidad
- Reintentos controlados (si se implementa cola)

**Tablas:** `notification_log`

### 3.10 `holidays`
- CRUD feriados (Admin/RRHH)
- Usado por cálculo de días hábiles en `requests` (Vacaciones)

**Tablas:** `holiday_calendar`

### 3.11 `audit`
- Servicio transversal para guardar eventos relevantes
- Puede apoyarse en interceptors o llamados explícitos

**Tablas:** (puede reutilizar `request_status_history` + futuro `audit_log` si se crea)

---

## 4) Contratos HTTP (API) — definición “congelada”

### 4.1 Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 4.2 Empleado
- `GET /employees/me`
- `PATCH /employees/me`

### 4.3 Beneficios
- `GET /benefits/me`

### 4.4 Tipos de solicitud
- `GET /request-types/active`
- `POST /admin/request-types`
- `PATCH /admin/request-types/:id`
- `POST /admin/request-types/:id/disable`

### 4.5 Solicitudes (Empleado)
- `POST /requests` (crea en estado SUBMITTED o DRAFT según decisión)
- `POST /requests/:id/signature`
- `POST /requests/:id/submit` → `PENDING_APPROVAL` + mail aprobador
- `GET /requests/me`
- `GET /requests/:id`

### 4.6 Aprobaciones (Aprobador)
- `GET /approvals/inbox`
- `POST /requests/:id/approve`
- `POST /requests/:id/reject` *(comment obligatorio)*

### 4.7 RRHH
- `GET /hr/inbox`
- `POST /requests/:id/hr/start-review` → `HR_REVIEW`
- `POST /requests/:id/documents/request-pdf`
- `POST /requests/:id/documents/comprobante-pdf`
- `POST /requests/:id/complete`

### 4.8 Documentos
- `GET /documents/:id/download`

### 4.9 Feriados
- `GET /admin/holidays`
- `POST /admin/holidays`
- `DELETE /admin/holidays/:date`

---

## 5) Reglas de negocio implementadas en backend (fuente de verdad)

### 5.1 State Machine (Requests)
`requests.state-machine.ts` define transiciones válidas.
Ejemplos:
- `SUBMITTED` → `PENDING_APPROVAL` (submit)
- `PENDING_APPROVAL` → `REJECTED` (reject)
- `PENDING_APPROVAL` → `APPROVED` (approve)
- `APPROVED` → `HR_REVIEW`
- `HR_REVIEW` → `COMPROBANTE_GENERATED`
- `COMPROBANTE_GENERATED` → `EMPLOYEE_SIGNATURE_PENDING` (si aplica)
- `EMPLOYEE_SIGNATURE_PENDING` → `COMPLETED`
- Cualquier → `CANCELLED` (si se habilita)

### 5.2 Validadores por tipo
Carpeta `requests/validators/`:
- `vacation.validator.ts`
- `permission-hours.validator.ts`
- `disconnection.validator.ts`

Valida:
- coherencia de fechas/horas
- saldos disponibles (si aplica)
- feriados/días hábiles (vacaciones)

### 5.3 Auditoría obligatoria
Cada transición llama:
- `auditService.recordStatusChange(...)`
y persiste `request_status_history`.

### 5.4 Notificaciones obligatorias
- Submit: mail a aprobador
- Reject/Approve: mail a empleado
- Approve: mail a RRHH

Se persiste siempre en `notification_log`.

---

## 6) Prisma y migraciones (coherencia BD)

### 6.1 Prisma Schema
- `prisma/schema.prisma` es “source of truth” de modelos.
- Migrations versionadas en `prisma/migrations`.
- `seed.ts` para:
  - roles iniciales
  - tipos de solicitud
  - usuario admin (si aplica)

### 6.2 Map snake_case ↔ camelCase
Prisma puede mapear con `@map("snake_case")` si se desea exponer camelCase internamente, o mantener snake_case y mapear en DTO.

Recomendación:
- Mantener nombres Prisma en `camelCase`
- Mapear a columnas snake_case con `@map()`
Esto mantiene coherencia en código Node.

---

## 7) Servicios de infraestructura (PDF, Storage, Email)

### 7.1 Storage (S3/MinIO)
`infra/storage/storage.service.ts`
- `upload(buffer, path, mimeType) -> fileUrl`
- `getSignedUrl(fileUrl)` (opcional)

### 7.2 PDF (Puppeteer)
`infra/pdf/pdf.service.ts`
- `render(templateHtml, data) -> pdfBuffer`
- Plantillas versionadas en `infra/pdf/templates/`

### 7.3 Email (SMTP/proveedor)
`infra/mail/mail.service.ts`
- `sendTemplate(to, templateCode, data)`
- registra en `notification_log`

---

## 8) Observabilidad y seguridad (mínimo)

- `roles.guard.ts` + `jwt-auth.guard.ts`
- Rate limiting (Nest throttler)
- Sanitización de inputs
- Logs estructurados (pino/winston)
- Manejo central de errores (filters)
- `.env.example` con variables requeridas

---

## 9) Variables de entorno (ejemplo)

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:pass@localhost:5432/permits

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

MAIL_HOST=smtp...
MAIL_PORT=587
MAIL_USER=...
MAIL_PASS=...

STORAGE_PROVIDER=s3
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=permits
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE_URL=http://localhost:9000/permits
```

---

## 10) Coordinación BD ↔ API: matriz rápida

| Dominio | Tablas | Endpoints |
|---|---|---|
| Auth | users, roles, user_roles | /auth/* |
| Perfil | employees, users | /employees/me |
| Beneficios | benefit_balances | /benefits/me |
| Solicitudes | requests, request_types, signatures, history | /requests/* |
| Aprobaciones | request_approvals, history | /approvals/* + approve/reject |
| RRHH | documents, signatures, history | /hr/* + /documents/* |
| Feriados | holiday_calendar | /admin/holidays |
| Notificaciones | notification_log | interno (trigger) |

---

**Fin del documento.**
