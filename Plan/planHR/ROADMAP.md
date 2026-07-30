# ROADMAP — Portal de Solicitudes (Permisos, Vacaciones, Desconexiones)

> **Stack objetivo (propuesto):** Frontend **Vue 3 + Tailwind CSS** · Backend **Node.js** (NestJS o Express/Fastify) · DB **PostgreSQL**  
> **Propósito:** reemplazar el flujo “Word → PDF → correo” por un sistema **trazable, auditable y estandarizado** con **roles, aprobaciones, firma, historial y generación de PDFs**.

---

## 1) Problema actual (AS-IS)

- Plantillas Word distintas por tipo de solicitud, llenadas manualmente por empleado.
- Se firma, se exporta a PDF y se envía por correo.
- Gerente aprueba/rechaza por correo (sin trazabilidad estructurada).
- RRHH recibe por correo lo aprobado y gestiona a mano.
- No hay:
  - auditoría (quién hizo qué y cuándo),
  - historial centralizado,
  - control de saldos/políticas,
  - estandarización de formatos,
  - reporting confiable.

---

## 2) Objetivos del producto (TO-BE)

### Objetivos funcionales
- Portal del empleado: **perfil + saldos (vacaciones/permisos) + creación de solicitudes + historial**.
- Flujo de aprobación: **bandeja del gerente/líder**, aprobar/rechazar; rechazo requiere **motivo obligatorio**.
- RRHH: ver solicitudes aprobadas, generar **comprobante**, descargar **PDF**, asegurar firma si aplica.
- Notificaciones por correo (mínimo): empleado/gerente/RRHH.
- Auditoría y trazabilidad por estados.

### Objetivos no funcionales
- Seguridad: RBAC, trazas, protección de datos personales.
- Confiabilidad: versión de documentos y log de notificaciones.
- Escalabilidad: nuevos tipos de solicitud sin romper el modelo.
- Mantenibilidad: validaciones centralizadas en backend.

---

## 3) Alcance

### In-scope (MVP)
- Tipos iniciales:
  - **Vacaciones**
  - **Permiso por horas**
  - **Desconexión** (o “salida de horario” según política)
- Roles:
  - Empleado
  - Aprobador (Gerente/Líder)
  - RRHH
  - Admin (recomendado para configuración)
- Firma digital simple (canvas) para empleado (solicitud y/o comprobante).
- PDFs:
  - PDF de solicitud
  - PDF de comprobante (RRHH)
- Historial completo por solicitud con timeline de estados.

### Out-of-scope (por ahora, fase posterior)
- Integración con nómina/ERP/SSO corporativo (si existe).
- Firma electrónica avanzada con validez legal (certificados).
- App móvil nativa (se evalúa luego).
- Reportería avanzada (BI) más allá de exportaciones básicas.

---

## 4) Roles y permisos (RBAC)

| Rol | Acciones clave |
|---|---|
| Empleado | Editar perfil permitido · Ver saldos · Crear solicitud · Adjuntar firma · Ver historial |
| Aprobador (Gerente/Líder) | Bandeja de pendientes · Aprobar · Rechazar con motivo obligatorio · Ver equipo |
| RRHH | Ver aprobadas · Generar comprobante · Descargar PDFs · Cerrar solicitudes |
| Admin | Gestionar usuarios/roles · Tipos de solicitud · Políticas · Feriados · Plantillas de PDF |

> **Nota:** definir desde el inicio qué campos del perfil son editables por el empleado y cuáles solo RRHH.

---

## 5) Flujo del proceso (alto nivel)

### 5.1 Flujo de Solicitud
1. Empleado crea solicitud (según tipo) y firma.
2. Sistema notifica por correo al Aprobador.
3. Aprobador aprueba o rechaza:
   - Si rechaza → **motivo obligatorio** + notificación al empleado + queda trazabilidad.
   - Si aprueba → notificación a RRHH + empleado ve estado “Aprobada”.

### 5.2 Flujo RRHH
4. RRHH revisa solicitud aprobada.
5. RRHH genera comprobante (PDF).
6. Empleado firma comprobante (si es requisito).
7. RRHH cierra la solicitud (Completed).

---

## 6) Estados de una solicitud (State Machine)

Estados sugeridos (mínimos):

- `SUBMITTED`
- `PENDING_APPROVAL`
- `REJECTED` (con comentario obligatorio)
- `APPROVED`
- `HR_REVIEW`
- `COMPROBANTE_GENERATED`
- `EMPLOYEE_SIGNATURE_PENDING` (si aplica)
- `COMPLETED`
- `CANCELLED` (si se habilita anulación)

> **Regla de oro:** cada cambio de estado genera registro en `request_status_history`.

---

## 7) Reglas de negocio por tipo (MVP)

### Vacaciones
- Mostrar días disponibles.
- Fecha inicio / fecha fin.
- Cálculo de días:
  - hábiles vs calendario (definir política)
  - considerar feriados (tabla `holiday_calendar`)
- Validaciones:
  - no permitir saldo negativo
  - fecha fin >= fecha inicio
  - anticipación mínima (si aplica)
  - renovacion de 15 dia por año laborado (aplicar calculo de suma de dia por mes transcurrido)

### Permiso por horas
- Fecha + hora inicio + hora fin.
- Validaciones:
  - hora fin > hora inicio
  - dentro de jornada o política definida

### Desconexión
- Fecha + rango horario.
- Validaciones según política (por ejemplo, solo fuera de jornada).

---

## 8) Arquitectura y componentes

### Frontend (Vue + Tailwind)
- Vue 3 + Vite
- Tailwind CSS
- Pinia (estado)
- Vue Router
- Módulos UI:
  - Auth + layout por rol
  - Perfil del empleado
  - Saldos/beneficios
  - Wizard/Forms por tipo de solicitud
  - Firma (canvas)
  - Historial + timeline
  - Bandeja Aprobador
  - Bandeja RRHH + generación de documentos

### Backend (Node.js)
Opciones:
- **NestJS** (recomendado: arquitectura limpia, escalable, módulos, validación)
- Express/Fastify (más simple, pero requiere disciplina)

Recomendaciones técnicas:
- ORM: Prisma (migraciones versionadas)
- Validación: Zod / class-validator
- Auth: JWT + refresh token (o SSO en fase posterior)
- Emails: SMTP corporativo o proveedor (según empresa)
- PDFs: Plantillas HTML + Puppeteer (fidelidad alta a formatos)
- Storage adjuntos/docs: S3 compatible (MinIO interno) o storage corporativo

---

## 9) Modelo de datos (PostgreSQL)

### 9.1 Tablas principales (mínimo viable)
- `users`
- `roles`, `user_roles`
- `employees`
- `request_types`
- `benefit_balances`
- `requests`
- `request_approvals`
- `request_status_history`
- `attachments`
- `signatures`
- `documents`
- `holiday_calendar`
- `notification_log`

### 9.2 Estructura sugerida (campos clave)

#### `employees`
- `id`, `user_id`
- `full_name`, `email`, `phone`
- `position`, `project`, `manager_user_id`
- `created_at`, `updated_at`

#### `benefit_balances`
- `id`, `employee_id`
- `vacation_days_available`
- `permission_hours_available` (si aplica)
- `updated_at`

#### `requests`
- `id`, `employee_id`, `request_type_id`
- `start_datetime`, `end_datetime`
- `payload_json` (campos específicos: motivo, reemplazo, etc.)
- `current_status`
- `created_at`, `updated_at`

#### `request_approvals`
- `id`, `request_id`, `approver_user_id`
- `decision` (APPROVE/REJECT)
- `comment` (obligatorio si REJECT)
- `decided_at`

#### `request_status_history`
- `id`, `request_id`
- `from_status`, `to_status`
- `changed_by_user_id`
- `comment`
- `changed_at`

#### `documents`
- `id`, `request_id`
- `doc_type` (REQUEST_PDF, COMPROBANTE_PDF)
- `version`
- `file_url`
- `generated_at`

> **Tip:** `payload_json` permite agregar campos por tipo sin alterar el esquema cada vez.

---

## 10) API (endpoints mínimos)

### Auth / Perfil
- `POST /auth/login`
- `GET /me`
- `PATCH /employees/me` (campos permitidos)

### Beneficios / Saldos
- `GET /benefits/me`

### Solicitudes
- `POST /requests` (crea y envía)
- `GET /requests/me` (historial)
- `GET /requests/:id` (detalle)
- `POST /requests/:id/signature` (firma empleado)

### Aprobaciones
- `GET /approvals/inbox`
- `POST /requests/:id/approve`
- `POST /requests/:id/reject` (**requiere `comment`**)

### RRHH / Documentos
- `GET /hr/inbox`
- `POST /requests/:id/documents/request-pdf`
- `POST /requests/:id/documents/comprobante-pdf`
- `GET /documents/:id/download`

---

## 11) Roadmap por fases (entregables + criterios)

> Las duraciones son estimadas por semanas/sprints y dependen del tamaño del equipo.

### Fase 0 — Discovery & Diseño (Semana 1–2)
**Entregables**
- Documento de reglas por tipo (políticas).
- Matriz RBAC (permisos).
- Mockups UI (baja/media fidelidad).
- Diseño base del modelo de datos y estados.

**Criterios de aceptación**
- Tipos del MVP definidos con validaciones claras.
- Plantillas iniciales de PDF definidas (estructura y campos).

### Fase 1 — Fundación técnica (Semana 3)
**Entregables**
- Repos y estructura (frontend/backend).
- Auth (JWT) + RBAC.
- PostgreSQL + migraciones (Prisma).
- Layout base en Vue por rol.

**Criterios de aceptación**
- Login funcional, sesión persistente.
- Navegación según rol (Empleado/Aprobador/RRHH).

### Fase 2 — Solicitudes MVP (Semana 4–6)
**Entregables**
- Crear solicitudes por tipo (Vacaciones, Permiso horas, Desconexión).
- Firma en envío (canvas).
- Historial y timeline.
- Notificación por correo al aprobador.
- Bandeja de aprobaciones + aprobar/rechazar con motivo obligatorio.

**Criterios de aceptación**
- Rechazo no permite guardar sin comentario.
- Empleado ve estados actualizados y motivo de rechazo.

### Fase 3 — RRHH + PDFs (Semana 7–8)
**Entregables**
- Bandeja RRHH para solicitudes aprobadas.
- Generación PDF de solicitud.
- Generación PDF de comprobante.
- Firma del empleado en comprobante (si aplica).
- Descarga de PDFs con versionado.

**Criterios de aceptación**
- RRHH puede descargar PDF y ver datos consistentes.
- Documentos quedan asociados a la solicitud y auditables.

### Fase 4 — Endurecimiento (Semana 9–10)
**Entregables**
- Auditoría completa (status history, approvals, cambios perfil).
- Logs de notificaciones (éxito/error).
- Tests unit/e2e básicos.
- Seguridad: rate limiting, sanitización, permisos finos.
- Backups DB + rotación.

**Criterios de aceptación**
- Toda acción sensible queda registrada.
- Reintentos controlados de correo (si falla proveedor).

### Fase 5 — Escalamiento (Backlog continuo)
**Ideas**
- Más tipos (licencias, horas extra, cambio turno).
- Políticas por área/contrato.
- Reportería (ausentismo, consumo, SLA aprobación).
- Integración SSO y/o nómina.

---

## 12) Backlog inicial (MVP) — épicas

### ÉPICA A: Autenticación y Roles
- A1: Login + refresh
- A2: RBAC y guards (backend)
- A3: Rutas protegidas (frontend)

### ÉPICA B: Perfil y Beneficios
- B1: Perfil empleado (lectura)
- B2: Edición de campos permitidos
- B3: Saldos visibles (vacaciones)

### ÉPICA C: Solicitudes
- C1: Form Vacaciones + validaciones + cálculo días
- C2: Form Permiso por horas
- C3: Form Desconexión
- C4: Firma canvas + guardado
- C5: Historial + detalle + timeline

### ÉPICA D: Aprobaciones
- D1: Bandeja aprobador
- D2: Aprobar
- D3: Rechazar con comentario obligatorio
- D4: Notificaciones por correo

### ÉPICA E: RRHH + Documentos
- E1: Bandeja RRHH
- E2: Generación PDF Solicitud
- E3: Generación PDF Comprobante
- E4: Firma comprobante (si aplica)
- E5: Descarga + versionado

### ÉPICA F: Auditoría y Calidad
- F1: request_status_history completo
- F2: notification_log
- F3: tests mínimos
- F4: hardening seguridad

---

## 13) Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reglas de negocio ambiguas (días hábiles, feriados, topes) | Alto | Discovery fuerte + documento de políticas + tests |
| PDFs no coinciden con lo “formal” de RRHH | Medio/Alto | Plantillas HTML versionadas + revisión RRHH temprana |
| Falta de trazabilidad y auditoría | Alto | State machine + history obligatorio desde MVP |
| Firma “simple” no es legalmente válida | Medio | Definir alcance: firma interna/aceptación; plan para firma avanzada |
| Dependencia de correo (deliverability) | Medio | notification_log + reintentos + fallback manual |
| Permisos mal configurados | Alto | RBAC + pruebas por rol + revisión seguridad |

---

## 14) Checklist de Definition of Done (DoD)

- ✅ Validaciones en backend (no solo frontend).
- ✅ Registro en historial por cada cambio de estado.
- ✅ Rechazo requiere comentario.
- ✅ Emails registrados en `notification_log`.
- ✅ PDF generado con versión y link de descarga.
- ✅ Tests mínimos en endpoints críticos.
- ✅ Documentación básica (README + variables de entorno).

---

## 15) Próximos pasos (para arrancar ya)

1. Recolectar plantillas Word actuales y definir **campos** (mapeo a datos).
2. Definir políticas exactas de cómputo (hábiles/feriados/topes).
3. Confirmar estructura jerárquica:
   - ¿quién aprueba a quién? (por proyecto, por jefe directo, por rol)
4. Elegir backend framework (NestJS recomendado).
5. Montar repos + DB + pipeline de migraciones.
6. Implementar Fase 1 y entregar demo navegable por roles.

---

**Anexo (recomendación):** si quieren migrar histórico desde PDFs/correos, se puede crear una “carga histórica” manual por RRHH (fase posterior) para que el historial comience “limpio” a partir del go-live.
