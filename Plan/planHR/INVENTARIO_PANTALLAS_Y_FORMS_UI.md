# Inventario de Ventanas y Formularios (Fase de Diseño UI/UX)
**Producto:** Portal de Solicitudes (Permisos · Vacaciones · Desconexiones)  
**Objetivo del documento:** enumerar **todas las pantallas** y **formularios** a diseñar, indicando **qué se ve**, **qué acciones hay**, **qué datos consume**, y **qué validaciones/estados** debe soportar.

---

## 0) Decisiones cerradas (impacto directo en pantallas)
1) **Vacaciones se descuentan al APROBAR** (no al completar).  
2) **Aprobador**: es el **gerente/líder a cargo** del empleado (jerarquía).  
3) **Comprobante SIEMPRE requiere firma del empleado**.  
4) **No hay vacaciones parciales**.  
5) **Cancelación**: el empleado **puede anular** su petición de vacaciones.  
6) **Ausencia > 3 horas no justificada**: se descuenta de vacaciones (recomendado un registro RRHH con trazabilidad).

---

## 1) Navegación y layouts (base de diseño)

### 1.1 Layout global (web app)
- **Topbar**
  - Logo + nombre del sistema
  - Buscador (opcional)
  - Campana de notificaciones (opcional en MVP)
  - Menú usuario: perfil, cerrar sesión
- **Sidebar (según rol)**
  - Dashboard
  - Mi Perfil
  - Mis Solicitudes / Bandeja (según rol)
  - RRHH (solo HR)
  - Admin (solo admin)
- **Content area**
  - Encabezado de página + breadcrumbs
  - Acciones primarias a la derecha (CTA principal)
  - Cuerpo: cards, tablas, formularios

### 1.2 Componentes UI reutilizables (diseñar una vez)
- **Cards**: resumen de saldos, solicitudes pendientes, etc.
- **Tables** con:
  - filtros (status, tipo, rango fechas)
  - paginación
  - chips de estado (colores)
  - acciones por fila (ver / descargar / cancelar)
- **Timeline** de estados (status history)
- **Modales**: firma, confirmaciones (cancelar), ver motivo de rechazo
- **Form wizard**: pasos por tipo de solicitud
- **Badge**/Chip: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`, etc.
- **Empty states**: sin solicitudes, sin pendientes, etc.
- **Loading states**: skeletons para tablas/cards
- **Error states**: alertas claras + reintento

---

## 2) Inventario de pantallas por rol (con rutas sugeridas)

> Convención de rutas (sugerida): `/app/...` para área autenticada, `/admin/...` para administración.

---

# A) Pantallas globales (comunes)

## A1) Login
- **Ruta:** `/login`
- **Usuarios:** todos
- **Objetivo:** autenticación
- **UI**
  - Campo email
  - Campo password
  - Botón “Ingresar”
  - “Olvidé mi contraseña” (opcional)
- **Validaciones**
  - email válido, password requerido
- **API**
  - `POST /auth/login`

## A2) Recuperar contraseña (opcional MVP)
- **Ruta:** `/forgot-password`
- **UI**: email + enviar enlace/código
- **API**: `POST /auth/forgot-password` (si se implementa)

## A3) Layout principal (shell autenticado)
- **Ruta:** `/app`
- **UI**: topbar + sidebar + contenedor

---

# B) Empleado

## B1) Dashboard Empleado
- **Ruta:** `/app/employee/dashboard`
- **Objetivo:** vista rápida de saldo + solicitudes
- **UI (cards)**
  - Card “Vacaciones disponibles” (días)
  - Card “Permisos disponibles” (si aplica)
  - Card “Solicitudes pendientes”
  - Card “Últimas solicitudes” (lista mini)
  - CTA principal: “Nueva solicitud”
- **API**
  - `GET /benefits/me`
  - `GET /requests/me?limit=5`

## B2) Mi Perfil (Ficha del empleado)
- **Ruta:** `/app/employee/profile`
- **Objetivo:** ver/editar datos permitidos
- **UI**
  - Sección “Datos personales” (editables según política)
  - Sección “Datos laborales” (solo lectura para empleado)
  - Botón “Guardar cambios” (si hay campos editables)
- **Campos sugeridos**
  - Nombre completo, teléfono, (correo solo lectura)
  - Cargo, proyecto/área, líder/gerente, fecha ingreso (solo lectura)
- **API**
  - `GET /employees/me`
  - `PATCH /employees/me`

## B3) Mis Solicitudes (Listado)
- **Ruta:** `/app/employee/requests`
- **Objetivo:** seguimiento e historial
- **UI**
  - Tabla con columnas:
    - Fecha creación
    - Tipo
    - Desde / Hasta
    - Estado (chip)
    - Aprobador
    - Acciones: Ver detalle, Descargar (si hay docs), Cancelar (si aplica)
  - Filtros: tipo, estado, rango fechas
  - CTA: “Nueva solicitud”
- **Acciones clave**
  - **Cancelar** (solo vacaciones y bajo reglas)
- **API**
  - `GET /requests/me`

## B4) Nueva Solicitud (Wizard)
- **Ruta:** `/app/employee/requests/new`
- **Objetivo:** crear solicitud según tipo
- **UI — Paso 1: Selección tipo**
  - Cards o radio buttons: Vacaciones / Permiso horas / Desconexión
- **UI — Paso 2: Form según tipo**
  - **Vacaciones**
    - Fecha inicio (date picker)
    - Fecha fin (date picker)
    - “Días solicitados” (calculado y solo lectura)
    - Observaciones (opcional)
    - Mensaje: “No se permiten vacaciones parciales.”
  - **Permiso por horas**
    - Fecha
    - Hora inicio / hora fin
    - Motivo (según política: opcional u obligatorio)
  - **Desconexión**
    - Fecha
    - Hora inicio / hora fin
    - Observaciones (opcional)
- **UI — Paso 3: Firma**
  - Modal o panel con canvas de firma
  - Botones: “Limpiar” / “Guardar firma”
- **UI — Paso 4: Confirmación y envío**
  - Resumen de solicitud
  - Checkbox: “Confirmo que la información es correcta”
  - CTA: “Enviar solicitud”
- **Validaciones críticas**
  - Fechas/horas coherentes
  - Vacaciones: no parciales
  - Firma obligatoria **siempre**
- **API**
  - `POST /requests`
  - `POST /requests/:id/signature`
  - `POST /requests/:id/submit`

## B5) Detalle de Solicitud
- **Ruta:** `/app/employee/requests/:id`
- **Objetivo:** ver estado, motivo rechazo, docs, timeline
- **UI**
  - Encabezado: tipo + estado chip + rango fechas
  - Panel “Datos de la solicitud” (campos)
  - Panel “Aprobación”
    - decisión, aprobador, fecha decisión
    - **motivo rechazo** (si REJECTED)
  - Panel “Documentos”
    - PDF solicitud (si existe)
    - PDF comprobante (si existe)
    - Estado de firma del comprobante (pendiente/firmado)
  - Panel “Historial” (timeline)
  - CTA contextual:
    - Cancelar (si aplica y permitido)
    - Firmar comprobante (si está pendiente)
- **API**
  - `GET /requests/:id`
  - `GET /documents/:id/download`
  - `POST /documents/:id/signature` (o equivalente)

## B6) Cancelar Solicitud (Modal)
- **Invocado desde:** B3 o B5
- **Objetivo:** cancelar una solicitud de vacaciones
- **UI**
  - Texto de confirmación (impactos)
  - Campo “Motivo de cancelación” (recomendado obligatorio)
  - Botones: “No, volver” / “Sí, cancelar”
- **Reglas (propuesta consistente)**
  - Se puede cancelar si:
    - `PENDING_APPROVAL` (antes de aprobar) → no afecta saldo
    - `APPROVED` **y** la fecha de inicio aún no llega → **refund** de días (porque se descontó al aprobar)
  - Si ya inició la fecha: bloquear cancelación (mensaje de política)
- **API**
  - `POST /requests/:id/cancel`

---

# C) Aprobador (Gerente/Líder)

## C1) Dashboard Aprobador
- **Ruta:** `/app/approver/dashboard`
- **UI (cards)**
  - Pendientes de aprobación
  - Aprobadas hoy/semana
  - Rechazadas hoy/semana
  - CTA: “Ver bandeja”
- **API**
  - `GET /approvals/inbox?summary=true`

## C2) Bandeja de Aprobaciones (Inbox)
- **Ruta:** `/app/approver/inbox`
- **UI**
  - Tabla: empleado, tipo, fechas/horas, días solicitados (si vacaciones), fecha envío
  - Acciones: “Ver”
  - Filtros: tipo, rango, empleado, estado (en inbox solo pendientes)
- **API**
  - `GET /approvals/inbox`

## C3) Detalle de Aprobación
- **Ruta:** `/app/approver/requests/:id`
- **UI**
  - Datos completos (solo lectura)
  - Firma del empleado (preview)
  - Timeline
  - Botones:
    - **Aprobar**
    - **Rechazar** (abre modal con comentario obligatorio)
- **Reglas**
  - Rechazo exige comentario
  - Aprobación descuenta vacaciones **de inmediato**
- **API**
  - `POST /requests/:id/approve`
  - `POST /requests/:id/reject`

## C4) Modal Rechazo (comentario obligatorio)
- **Invocado desde:** C3
- **UI**
  - Textarea “Motivo de rechazo” (obligatorio)
  - CTA “Confirmar rechazo”
- **API**
  - `POST /requests/:id/reject`

---

# D) RRHH

## D1) Dashboard RRHH
- **Ruta:** `/app/hr/dashboard`
- **UI (cards)**
  - Aprobadas esperando RRHH
  - Comprobantes por firmar (pendientes empleado)
  - Completadas esta semana
- **API**
  - `GET /hr/inbox?summary=true`

## D2) Bandeja RRHH (Aprobadas)
- **Ruta:** `/app/hr/inbox`
- **UI**
  - Tabla: empleado, tipo, fechas, estado, aprobador, fecha aprobación
  - Acciones: “Gestionar”
  - Filtros: tipo, estado, rango
- **API**
  - `GET /hr/inbox`

## D3) Gestión de Solicitud RRHH (Detalle formal)
- **Ruta:** `/app/hr/requests/:id`
- **UI**
  - Vista formal de solicitud (campos + firma empleado)
  - Botones:
    - “Iniciar revisión” (si está solo aprobada)
    - “Generar PDF Solicitud”
    - “Generar Comprobante”
    - “Descargar documentos”
  - Panel: “Estado de firma del comprobante” (**siempre requerido**)
- **API**
  - `POST /requests/:id/hr/start-review`
  - `POST /requests/:id/documents/request-pdf`
  - `POST /requests/:id/documents/comprobante-pdf`
  - `GET /documents/:id/download`

## D4) Firma del comprobante (por empleado)
> Aunque RRHH genera el comprobante, la firma es del empleado. En UI hay 2 enfoques:
- **Enfoque A (recomendado):** el empleado firma desde su detalle (B5) cuando el comprobante está listo.
- **Enfoque B:** RRHH solicita firma en persona (misma pantalla con “modo firma empleado”).

**UI (Enfoque A)**
- En B5: botón “Firmar comprobante” + modal firma
- **API**
  - `POST /documents/:id/signature`

## D5) Completar / Cerrar solicitud
- **Ruta:** dentro de D3
- **UI**
  - CTA “Marcar como completada” (habilitado solo si comprobante firmado)
  - Observación final (opcional)
- **API**
  - `POST /requests/:id/complete`

## D6) Ajustes de saldo por ausencias no justificadas (recomendado por política)
- **Ruta:** `/app/hr/adjustments` *(fase posterior si no entra al MVP)*
- **Objetivo:** registrar ausencias > 3 horas no justificadas y aplicar descuento de vacaciones con trazabilidad
- **UI**
  - Form: empleado, fecha, horas, motivo/observación, evidencia (adjunto)
  - Tabla: historial de ajustes
- **BD/API (recomendado)**
  - Crear tabla `benefit_ledger` o `benefit_adjustments` para auditoría (no solo cambiar el saldo directamente).

---

# E) Admin (configuración)

## E1) Admin — Usuarios y Roles
- **Ruta:** `/app/admin/users`
- **UI**
  - Tabla usuarios (email, nombre, roles, activo)
  - CRUD básico + asignación de roles
  - Asignar gerente/líder a empleados (jerarquía)
- **API**
  - `/admin/users/*`
  - `/admin/roles/*`
  - `/admin/employees/*`

## E2) Admin — Tipos de solicitud
- **Ruta:** `/app/admin/request-types`
- **UI**
  - Tabla tipos
  - Activar/desactivar
  - (opcional) edición de reglas (si se hace configurable)
- **API**
  - `/admin/request-types/*`

## E3) Admin — Feriados
- **Ruta:** `/app/admin/holidays`
- **UI**
  - Tabla feriados + carga masiva (CSV opcional)
  - Agregar / eliminar
- **API**
  - `/admin/holidays/*`

## E4) Admin — Plantillas PDF (opcional)
- **Ruta:** `/app/admin/templates`
- **UI**
  - Versionado de plantillas (solo si se expone UI; si no, se maneja por repo)
- **API**
  - opcional

---

## 3) Matriz pantalla → formularios → componentes (resumen)

| Pantalla | Form principal | Componentes críticos |
|---|---|---|
| Login | LoginForm | Inputs + validación + mensajes |
| Dashboard (Empleado) | — | Cards + tabla mini |
| Perfil | EmployeeProfileForm | Secciones + campos editables |
| Mis Solicitudes | Filters + Table | Chips estado + acciones |
| Nueva Solicitud | RequestWizard | Steps + firma modal |
| Detalle Solicitud | — | Timeline + documentos + acciones |
| Cancelar Solicitud | CancelModal | motivo + confirmación |
| Inbox Aprobador | Filters + Table | tabla pendientes |
| Detalle Aprobación | Approve/Reject | modal rechazo obligatorio |
| Inbox RRHH | Filters + Table | estados y acciones |
| RRHH Detalle | Doc generation | PDF buttons + status firma |
| Admin users/roles | UserRoleForm | asignación roles |
| Admin request types | RequestTypeForm | activar/desactivar |
| Admin holidays | HolidayForm | tabla + date picker |

---

## 4) “Diseño” sugerido por pantalla (qué debe verse sí o sí)

### Estados (chips) recomendados
- Pendiente (PENDING_APPROVAL)
- Aprobada (APPROVED)
- Rechazada (REJECTED)
- En RRHH (HR_REVIEW)
- Comprobante generado (COMPROBANTE_GENERATED)
- Firma pendiente (EMPLOYEE_SIGNATURE_PENDING)
- Completada (COMPLETED)
- Cancelada (CANCELLED)

### Elementos visuales mínimos
- En **detalle** siempre mostrar:
  - Tipo + estado + fechas
  - Quién aprobó/rechazó y cuándo
  - Motivo de rechazo (si aplica)
  - Documentos disponibles + estado de firma
  - Timeline

---

## 5) Entregables para la fase de diseño (lo que conviene producir ya)
1. **Mapa de navegación por rol** (sitemap)
2. **Wireframes** de:
   - Dashboard por rol
   - Listado + detalle de solicitud
   - Wizard de nueva solicitud + modal firma
   - Bandeja aprobador + detalle + modal rechazo
   - Bandeja RRHH + detalle + generación docs
3. **Design system mini**
   - botones, inputs, tablas, chips de estado, modales, cards
4. **Estados vacíos y de error** definidos

---

## 6) Notas de coherencia (para diseño sin sorpresas)
- **Firma siempre obligatoria** → en UI siempre existe componente firma, y se muestra “Firmada / Pendiente”.
- **Vacaciones se descuentan al aprobar** → en UI del empleado debe verse reflejado el saldo actualizado apenas se apruebe.
- **Cancelación de vacaciones** → UI debe explicar si hay devolución de días y bajo qué condiciones.
- **No vacaciones parciales** → UI debe impedir seleccionar “medio día” o similares.

---

**Fin del inventario.**
