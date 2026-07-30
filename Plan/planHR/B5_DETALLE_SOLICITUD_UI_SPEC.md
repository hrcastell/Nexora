# B5 — Detalle de Solicitud (UI Spec para Diseño en Alta Fidelidad)

> **Pantalla prioritaria:** esta vista concentra tracking, decisión, documentos y firma del comprobante.  
> **Ruta:** `/app/employee/requests/:id`  
> **Roles que acceden:** EMPLOYEE (propietario) · APPROVER/HR (vista equivalente con permisos distintos)  
> **Objetivo:** permitir **seguimiento completo** y **acciones contextuales** sin ambigüedad.

---

## 1) Información que debe mostrar (siempre)
### 1.1 Encabezado (Header)
- **Título:** “Detalle de Solicitud”
- **Subtítulo:** `Tipo de solicitud` (Vacaciones / Permiso / Desconexión)
- **Estado (chip):** `currentStatus`
- **Meta** (texto pequeño):
  - ID solicitud (corto)
  - Fecha de creación
  - Fecha de envío (`submittedAt`, si aplica)

### 1.2 Resumen (Summary card)
Bloque compacto de 2 columnas (desktop) / 1 columna (mobile):
- **Empleado:** Nombre + cargo/área (si se muestra al empleado, puede omitirse y dejarlo para HR/Approver)
- **Aprobador asignado:** líder/gerente responsable
- **Rango:** inicio / fin (fecha y hora si aplica)
- **Días solicitados (solo vacaciones):** `payload.daysRequested` (read-only)
- **Observaciones:** `payload.notes` (si existe)

> **Regla:** toda información de pantalla debe provenir de lo persistido (BD) vía `GET /requests/:id`.

---

## 2) Acciones contextuales (CTAs) por estado
Ubicación sugerida: **barra de acciones** en header (derecha) + duplicado en mobile al final.

### 2.1 Acciones generales
- **Descargar** (dropdown)  
  - Solicitud PDF (si existe)  
  - Comprobante PDF (si existe)

### 2.2 Cancelar (solo Vacaciones)
Mostrar botón **Cancelar** solo si:
- `PENDING_APPROVAL`  → cancela sin afectar saldo
- `APPROVED` y `startDateTime` > ahora → cancela y **reintegra días** (porque se descontó al aprobar)

Ocultar y/o deshabilitar con tooltip si:
- fecha ya inició o estado no permite cancelación

### 2.3 Firmar comprobante (siempre requerido)
Mostrar botón **Firmar comprobante** si:
- existe documento `COMPROBANTE_PDF`
- y `signatureStatus` = PENDING (no firmado)

Botón deshabilitado si:
- aún no existe comprobante (mostrar hint: “RRHH debe generar el comprobante”)

---

## 3) Secciones de la pantalla (layout)
Orden recomendado (vertical):

### 3.1 Card “Resumen”
- Datos base (tipo, rango, días, observaciones)
- Aprobador asignado

### 3.2 Card “Aprobación”
- **Decisión:** Approved / Rejected / Pending
- **Aprobador:** nombre
- **Decidido el:** fecha/hora
- **Motivo de rechazo** (si `REJECTED`): alerta roja (muy visible)

**Nota de negocio (solo vacaciones):**
- Si `APPROVED` o superior: texto “**Días descontados al aprobar**” + cantidad.

### 3.3 Card “Documentos”
Listado con filas:
- **Solicitud PDF** — estado (Generado / No generado) — acción Descargar
- **Comprobante PDF** — estado (Generado / No generado) — acción Descargar
- **Firma del comprobante** — estado (Pendiente / Firmado) — acción “Firmar” si pendiente

Mostrar *chips* por cada item: `READY / MISSING / PENDING_SIGNATURE / SIGNED`.

### 3.4 Card “Historial” (Timeline)
Timeline vertical:
- Evento + actor + timestamp + comentario (si aplica)
Eventos típicos:
- Created
- Submitted
- Approved/Rejected (con comentario)
- HR Review started
- PDF(s) generated
- Comprobante signed
- Completed
- Cancelled (con motivo)

---

## 4) Modal: Firma del comprobante
### 4.1 Contenido
- Canvas firma (alto fijo)
- Controles:
  - “Limpiar”
  - “Guardar firma” (secondary)
  - (CTA) “Confirmar firma” (primary)

### 4.2 Reglas
- No se puede confirmar si el canvas está vacío.
- Guardar firma debe persistirse como `signatures` vinculada a `documentId` (comprobante).

---

## 5) Estados vacíos y de error (UX)
### 5.1 Carga
- Skeleton para header + cards (2–3 bloques)
### 5.2 Error 404
- “Solicitud no encontrada” + botón “Volver a Mis Solicitudes”
### 5.3 Error permisos (403)
- “No tienes permiso para ver esta solicitud” + volver
### 5.4 Documentos no disponibles
- Mostrar estado “No generado” + texto “RRHH generará este documento tras aprobación.”

---

## 6) Responsivo (desktop vs mobile)
### Desktop
- Header con acciones a la derecha.
- Cards con layout de 2 columnas en resumen.
### Mobile
- Acciones en menú “Más” (kebab) + CTA fijo al final para “Firmar” si aplica.
- Timeline colapsable (mostrar últimos 5 con “ver más”).

---

## 7) Datos requeridos del endpoint `GET /requests/:id`
Contrato mínimo recomendado:

```json
{
  "id": "uuid",
  "type": { "code": "VACATION", "name": "Vacaciones" },
  "currentStatus": "APPROVED",
  "createdAt": "2026-02-11T10:00:00Z",
  "submittedAt": "2026-02-11T10:10:00Z",
  "startDateTime": "2026-02-20T00:00:00Z",
  "endDateTime": "2026-02-25T23:59:59Z",
  "payload": { "daysRequested": 4, "notes": "" },
  "approver": { "id": "uuid", "name": "Líder X" },
  "approval": { "decision": "APPROVED", "comment": null, "decidedAt": "..." },
  "documents": [
    { "id": "uuid", "docType": "REQUEST_PDF", "status": "READY" },
    { "id": "uuid", "docType": "COMPROBANTE_PDF", "status": "READY" }
  ],
  "comprobanteSignature": { "status": "PENDING", "signedAt": null },
  "history": [
    { "toStatus": "SUBMITTED", "changedAt": "...", "actorName": "Empleado", "comment": null }
  ]
}
```

---

## 8) Checklist para Figma (frames a crear)
1) B5 Desktop (estado PENDING_APPROVAL)
2) B5 Desktop (estado REJECTED con motivo visible)
3) B5 Desktop (estado APPROVED + docs generados + firma pendiente)
4) B5 Mobile (estado APPROVED + CTA firmar)
5) Modal Firma (empty, drawed)
6) Dropdown Descargas (con 1 y con 2 docs)
7) Empty/Errors (404/403)

---

**Fin del UI Spec de B5.**
