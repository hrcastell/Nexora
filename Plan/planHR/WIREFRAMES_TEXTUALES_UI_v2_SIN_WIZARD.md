# Wireframes textuales (UI/UX) — Estructura por pantalla

> Objetivo: describir **qué se ve** y **cómo se comporta** cada pantalla (secciones, campos, CTAs, estados vacíos y errores), para llevarlo directo a Figma.  
> Convención: **H1 = pantalla**, **H2 = secciones**, **(CTA)** acciones principales.

---

## 0) Design system mínimo (para unificar Figma)

### 0.1 Tipografía y jerarquía
- H1: 24–28px (título página)
- H2: 18–20px (título sección)
- Body: 14–16px
- Helper/error: 12–13px

### 0.2 Componentes base
- Button: Primary / Secondary / Danger / Ghost
- Input: text, email, phone, textarea
- Select: request type, status, employee
- DatePicker / TimePicker
- Table + filters + pagination
- Chips de estado (colors por estado)
- Modal: confirmación, firma, rechazo, cancelación
- Timeline: historial de estados
- Toasts: success/error

### 0.3 Estados (chips)
- `PENDING_APPROVAL` (Pendiente)
- `APPROVED` (Aprobada)
- `REJECTED` (Rechazada)
- `HR_REVIEW` (En RRHH)
- `COMPROBANTE_GENERATED` (Comprobante generado)
- `EMPLOYEE_SIGNATURE_PENDING` (Firma pendiente)
- `COMPLETED` (Completada)
- `CANCELLED` (Cancelada)

---

## A) Público

### A1) Login — `/login`
**Header**
- Logo + “Portal de Solicitudes”
- Subtítulo: “Accede con tu correo corporativo”

**Form**
- Email (input)
- Password (input con toggle ver/ocultar)
- (CTA) Ingresar
- Link: “Olvidé mi contraseña” (opcional MVP)

**Feedback**
- Error inline: “Credenciales inválidas” / “Usuario inactivo”
- Loading en CTA

---

## B) Empleado

### B1) Dashboard Empleado — `/app/employee/dashboard`
**Header**
- Título: “Dashboard”
- (CTA) “Nueva solicitud”

**Sección 1: Resumen (cards)**
- Card 1: “Vacaciones disponibles” → valor (días) + “Actualizado: fecha”
- Card 2: “Permisos disponibles” (si aplica) → horas
- Card 3: “Pendientes” → contador (PENDING_APPROVAL + HR_REVIEW + firma pendiente)

**Sección 2: Últimas solicitudes**
- Tabla compacta (máx 5)
  - Tipo | Fechas | Estado | Acción “Ver”

**Empty states**
- Si no hay solicitudes: ilustración + “Aún no has creado solicitudes” + CTA Nueva solicitud

---

### B2) Mi Perfil — `/app/employee/profile`
**Header**
- “Mi Perfil”
- (CTA) “Guardar cambios” (solo si hay campos editables)

**Sección 1: Datos personales (editables)**
- Nombre completo (según política: editable o read-only)
- Teléfono (editable)
- Correo (read-only)
- Dirección (si se maneja; opcional)

**Sección 2: Datos laborales (solo lectura)**
- Cargo
- Proyecto/Área
- Líder/Gerente a cargo
- Fecha de ingreso

**Sección 3: Seguridad (opcional)**
- Cambiar contraseña (si aplica)

**Feedback**
- Toast: “Cambios guardados”
- Validación: teléfono formato

---

### B3) Mis Solicitudes (Listado) — `/app/employee/requests`
**Header**
- “Mis Solicitudes”
- (CTA) “Nueva solicitud”

**Sección 1: Filtros**
- Tipo (select)
- Estado (select)
- Rango fechas (date from/to)
- Botones: “Aplicar” / “Limpiar”

**Sección 2: Tabla**
Columnas sugeridas:
- Fecha creación
- Tipo
- Desde
- Hasta
- Estado (chip)
- Aprobador
- Acciones (icon buttons):
  - Ver
  - Descargar (dropdown: solicitud/comprobante si existen)
  - Cancelar (solo si aplica)

**Regla visual para Cancelar (vacaciones)**
- Mostrar botón “Cancelar” solo si:
  - `PENDING_APPROVAL`, o
  - `APPROVED` y **aún no inicia** (mostrar tooltip: “Reintegra días al saldo”)

**Empty state**
- Sin resultados: “No hay solicitudes con esos filtros” + botón limpiar

---

### B4) Nueva Solicitud (Formulario único, sin wizard) — `/app/employee/requests/new`
**Header**
- “Nueva Solicitud”
- Breadcrumb: Solicitudes / Nueva

**Sección 1: Tipo de solicitud**
- Selector (cards o select):
  - Vacaciones
  - Permiso por horas
  - Desconexión
- Texto guía dinámico según tipo

**Sección 2: Datos (condicional por tipo)**
**Vacaciones**
- Fecha inicio (date)
- Fecha fin (date)
- Campo calculado (read-only): “Días solicitados”
- Observaciones (textarea opcional)
- Banner info: “No se permiten vacaciones parciales.”

**Permiso por horas**
- Fecha (date)
- Hora inicio / Hora fin (time)
- Motivo (textarea; obligatorio si política lo exige)

**Desconexión**
- Fecha (date)
- Hora inicio / Hora fin
- Observaciones (opcional)

**Sección 3: Firma (siempre obligatoria)**
- Card con canvas firma
- Botones: “Limpiar” (ghost) · “Guardar firma” (secondary)
- Hint: “Firma tal como aparece en tus documentos.”

**Sección 4: Confirmación**
- Checkbox: “Confirmo que la información es correcta.” (obligatorio)
- (CTA) “Enviar solicitud”

**Validación y feedback**
- Validación inline por campo + banner de errores arriba
- Loading en CTA al enviar
- Post éxito:
  - “Solicitud enviada” + botón “Ver detalle” (navega a B5)

### B5) Detalle de Solicitud — `/app/employee/requests/:id`
**Header**
- “Detalle de Solicitud”
- Chip estado + Tipo
- Acciones derecha:
  - Cancelar (si aplica)
  - Descargar (si docs)
  - Firmar comprobante (si pendiente)

**Sección 1: Resumen**
- Tipo
- Fecha/Hora inicio/fin
- Días solicitados (si vacaciones)
- Observaciones

**Sección 2: Aprobación**
- Aprobador (nombre/cargo)
- Decisión + fecha
- Motivo rechazo (si REJECTED, en alert-danger)
- Nota: “Vacaciones descontadas al aprobar” (solo si vacaciones y estado >= APPROVED)

**Sección 3: Documentos**
- Lista de documentos:
  - Solicitud PDF (download)
  - Comprobante PDF (download)
- Estado de firma comprobante:
  - “Pendiente” + (CTA) “Firmar comprobante”
  - “Firmado el: fecha” (read-only)

**Sección 4: Historial (timeline)**
- SUBMITTED → PENDING_APPROVAL → ... con timestamps y actor

**Empty/Errors**
- Si falla carga: banner “No se pudo cargar” + reintentar

---

### B6) Modal Cancelar Vacaciones (desde B3/B5)
**Título:** “Cancelar solicitud de vacaciones”
**Contenido**
- Texto:
  - Si `PENDING_APPROVAL`: “Se anulará la solicitud antes de ser aprobada.”
  - Si `APPROVED` y aún no inicia: “Se anulará y se reintegrarán los días al saldo.”
- Campo: “Motivo de cancelación” (recomendado obligatorio)
- Botones: (Danger) “Cancelar solicitud” · (Secondary) “Volver”

**Mensajes**
- Si no permitido: “No se puede cancelar una solicitud cuya fecha ya inició.”

---

### B7) Modal Firma (reutilizable)
- Canvas
- Botones: limpiar / guardar
- Preview mini (opcional)

---

## C) Aprobador (Gerente/Líder)

### C1) Dashboard Aprobador — `/app/approver/dashboard`
**Cards**
- Pendientes de aprobación (contador)
- Aprobadas semana
- Rechazadas semana
(CTA) “Ir a bandeja”

---

### C2) Bandeja de Aprobaciones — `/app/approver/inbox`
**Header**
- “Bandeja de Aprobaciones”
- Badge: “Pendientes” (count)

**Filtros**
- Tipo
- Rango fechas (envío)
- Empleado (search/select)

**Tabla**
- Empleado (nombre + área)
- Tipo
- Desde/Hasta
- Días solicitados (si vacaciones)
- Enviada el
- Acción: “Ver”

**Empty state**
- “No tienes solicitudes pendientes.”

---

### C3) Detalle Aprobación — `/app/approver/requests/:id`
**Header**
- Tipo + estado
- Botones: (Primary) Aprobar · (Danger) Rechazar

**Sección 1: Datos solicitud**
- Empleado + cargo/área
- Fechas/horas
- Días solicitados (vacaciones)
- Observaciones

**Sección 2: Firma empleado**
- Preview firma (imagen) + “Firmado al enviar”

**Sección 3: Historial**
- Timeline

**Acciones**
- Aprobar: modal confirmación
  - Texto: “Al aprobar, se descontarán los días de vacaciones.” (si vacaciones)
- Rechazar: abre modal con comentario obligatorio

---

### C4) Modal Rechazo (obligatorio)
- Textarea “Motivo de rechazo” (required)
- Helper: “Este motivo será visible para el empleado.”
- Botones: (Danger) Confirmar rechazo · Cancelar

---

## D) RRHH

### D1) Dashboard RRHH — `/app/hr/dashboard`
**Cards**
- Aprobadas esperando gestión
- Comprobantes pendientes de firma
- Completadas semana
(CTA) “Ver bandeja RRHH”

---

### D2) Bandeja RRHH — `/app/hr/inbox`
**Header**
- “Bandeja RRHH”
**Filtros**
- Tipo, estado, rango fechas (aprobación)
**Tabla**
- Empleado
- Tipo
- Estado
- Aprobada el
- Acciones: “Gestionar”

---

### D3) Gestión RRHH (Detalle formal) — `/app/hr/requests/:id`
**Header**
- “Gestión de Solicitud” + chip estado
- Acciones:
  - Iniciar revisión (si aplica)
  - Generar PDF Solicitud
  - Generar Comprobante
  - Descargar (dropdown docs)
  - (Primary) Completar (disabled si falta firma)

**Sección 1: Vista formal**
- Datos del empleado
- Datos solicitud
- Firma empleado

**Sección 2: Documentos**
- Estado “Solicitud PDF”: generado/no
- Estado “Comprobante PDF”: generado/no
- Estado firma comprobante: pendiente/firmado + fecha

**Sección 3: Historial**
- Timeline

**Regla UI**
- Botón “Completar” solo se habilita cuando comprobante está **firmado**.

---

### D4) (Fase posterior) Ajustes/Ausencias >3h — `/app/hr/adjustments`
**Header**
- “Ajustes de Vacaciones por Ausencias”
- (CTA) “Registrar ajuste”

**Tabla ajustes**
- Empleado
- Fecha
- Horas
- Días descontados
- Motivo
- Evidencia (sí/no)
- Creado por / fecha

**Modal “Registrar ajuste”**
- Empleado (select)
- Fecha (date)
- Horas ausentes (number)
- Justificada? (toggle) → si “no”, habilita descuento
- Días a descontar (calculado o manual con validación)
- Motivo/observación (required si no justificada)
- Adjuntar evidencia (file upload opcional)
- (CTA) Guardar

---

## E) Admin

### E1) Admin — Usuarios y Roles — `/app/admin/users`
**Header**
- “Usuarios”
- (CTA) “Crear usuario”

**Tabla**
- Email, nombre, roles, activo, acciones (editar)

**Drawer/Modal editar**
- Roles (multi-select)
- Activar/desactivar
- Reset password (opcional)

---

### E2) Admin — Empleados (Jerarquía) — `/app/admin/employees`
**Header**
- “Empleados”
- (CTA) “Crear empleado” (si se gestiona interno)

**Tabla**
- Nombre, email, cargo, líder/gerente asignado, acciones

**Editar**
- Asignar `manager` (select)  ← clave para aprobación
- Proyecto/Área, cargo

---

### E3) Admin — Tipos de Solicitud — `/app/admin/request-types`
**Tabla**
- Código, nombre, activo, acciones
**Editar**
- Activar/desactivar
- (opcional) marcar “requiere motivo” para ciertos tipos (si se configura)

---

### E4) Admin — Feriados — `/app/admin/holidays`
**Header**
- “Feriados”
- (CTA) “Agregar feriado”
- (Secondary) “Importar CSV” (opcional)

**Tabla**
- Fecha, descripción, región, acciones

---

## 1) Flujos UX claves (para Figma)

### 1.1 Flujo “Crear solicitud”
Mis solicitudes → Nueva solicitud (formulario único) → éxito → detalle

### 1.2 Flujo “Aprobar/Rechazar”
Email → Bandeja → detalle → aprobar/rechazar → notificación empleado

### 1.3 Flujo “RRHH genera comprobante + firma empleado”
RRHH detalle → generar comprobante → empleado detalle → firmar comprobante → RRHH completa

### 1.4 Flujo “Cancelar vacaciones”
Empleado detalle/listado → cancelar → (si aplica) reintegra días → estado CANCELLED

---

## 2) Notas de diseño por decisiones de negocio

- **Descuento al aprobar:** mostrar en UI del empleado un “evento” visible:
  - “Días descontados: X (al aprobar)”. Idealmente en el detalle y en el saldo.
- **Firma siempre:** todo documento/solicitud debe mostrar “Firma: OK/Pendiente”.
- **No parciales:** en vacaciones, el datepicker debe ser solo días completos; no ofrecer “medio día”.
- **Cancelación:** UI debe explicar devolución de días (si aplica) y bloquear si ya inició.

---

**Fin de wireframes textuales.**
