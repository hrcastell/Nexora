# Sitemap por rol (Portal de Solicitudes)

> Convención de rutas sugerida: `/login` público · `/app/...` autenticado.  
> Layout autenticado: **Topbar + Sidebar + Content** (según rol).

---

## 1) Público

- `/login` → Login
- `/forgot-password` *(opcional MVP)* → Recuperación

---

## 2) Empleado (ROLE: EMPLOYEE)

**Menú (Sidebar)**
- **Dashboard**
  - `/app/employee/dashboard`
- **Mi Perfil**
  - `/app/employee/profile`
- **Solicitudes**
  - `/app/employee/requests` (listado + filtros)
  - `/app/employee/requests/new` (wizard)
  - `/app/employee/requests/:id` (detalle)

**Rutas auxiliares (modales/acciones)**
- Cancelar solicitud (modal dentro de listado o detalle) → `POST /requests/:id/cancel`
- Firmar comprobante (modal firma dentro de detalle) → `POST /documents/:id/signature`

**Flujo principal**
Dashboard → (CTA) Nueva solicitud → Wizard → Detalle (tracking) → Documentos/Firma → (cuando corresponda) Completada

---

## 3) Aprobador (ROLE: APPROVER)

**Menú (Sidebar)**
- **Dashboard**
  - `/app/approver/dashboard`
- **Bandeja de Aprobaciones**
  - `/app/approver/inbox` (pendientes)
  - `/app/approver/requests/:id` (detalle + aprobar/rechazar)

**Flujo principal**
Email notificación → Inbox → Detalle → Aprobar/Rechazar → (resultado) historial

---

## 4) RRHH (ROLE: HR)

**Menú (Sidebar)**
- **Dashboard**
  - `/app/hr/dashboard`
- **Bandeja RRHH**
  - `/app/hr/inbox`
  - `/app/hr/requests/:id` (gestión formal)
- **Ajustes / Ausencias** *(recomendado, fase posterior si no entra al MVP)*
  - `/app/hr/adjustments` (registro descuento por ausencias > 3h no justificadas)

**Flujo principal**
Inbox RRHH → Detalle → Iniciar revisión → Generar PDFs → Esperar firma empleado → Completar

---

## 5) Admin (ROLE: ADMIN)

**Menú (Sidebar)**
- **Usuarios y Roles**
  - `/app/admin/users`
- **Empleados (jerarquía)**
  - `/app/admin/employees`
- **Tipos de Solicitud**
  - `/app/admin/request-types`
- **Feriados**
  - `/app/admin/holidays`
- **Plantillas PDF** *(opcional; usualmente por repo)*
  - `/app/admin/templates`

---

## 6) Rutas compartidas (si el rol aplica)

- `/app/account` *(opcional)*: cuenta del usuario (preferencias, etc.)
- `/app/help` *(opcional)*: ayuda / políticas internas
