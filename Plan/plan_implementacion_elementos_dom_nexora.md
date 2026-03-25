# Plan de Implementación de Elementos DOM

## Módulo
**UI-BASE-01 · Elementos DOM reutilizables para Nexora**

## Objetivo
Definir e incorporar los elementos base del DOM que acompañarán el sistema desde las primeras etapas de desarrollo, manteniendo coherencia visual con el login aprobado y con la identidad visual de **Nexora**.

Este bloque cubre principalmente:

- Modals informativos.
- Modals de confirmación.
- Modals de formulario.
- Toasts de notificación.
- Base visual reutilizable para futuras pantallas.

---

## Contexto funcional
Los elementos definidos se alinean con el lenguaje visual aprobado previamente para el acceso de Nexora:

- Paleta principal: **azul noche, plateado, dorado y morado**.
- Superficies tipo glass.
- Bordes suaves.
- Jerarquía visual orientada a panel administrativo.
- Componentes pensados para entorno multiempresa, multiperfil y uso operativo diario.

Estos elementos servirán como base para flujos críticos como:

- Cambio de empresa activa.
- Confirmación de acciones sensibles.
- Visualización de estados de solicitudes.
- Asignaciones administrativas.
- Mensajes de éxito, advertencia, error e información.

---

## Alcance funcional
Incluye:

- Componente base `ModalShell`.
- Modal informativo reutilizable.
- Modal de confirmación para acciones sensibles.
- Modal de formulario para operaciones administrativas.
- Sistema base de toasts.
- Toasts por tipo: `success`, `warning`, `error`, `info`.
- Cierre manual de toast.
- Cierre automático de toast.
- Estilo visual consistente con el login.
- Biblioteca visual demostrativa para validación de UX/UI.

No incluye en esta etapa:

- Sistema global de portales desacoplado.
- Cola centralizada por contexto o store global.
- Gestión avanzada de focus trap.
- Accesibilidad avanzada con navegación por teclado completa.
- Animaciones complejas por tipo de modal.
- Internacionalización de textos.

---

## Componentes aprobados

### 1. Modal base
**Componente:** `ModalShell`

### Propósito
Servir como contenedor base para todos los modals del sistema.

### Responsabilidades
- Mostrar overlay bloqueante.
- Centrar contenido.
- Mostrar encabezado con título y subtítulo.
- Permitir cierre manual.
- Recibir contenido interno dinámico.
- Recibir footer con acciones configurables.

### Uso previsto
- Confirmaciones.
- Formularios rápidos.
- Mensajes de detalle.
- Flujos administrativos secundarios.

---

### 2. Modal informativo
### Propósito
Mostrar mensajes de estado, detalle de procesos y contexto adicional sin ambigüedad.

### Casos de uso
- Detalle de estado de solicitud.
- Explicación de validaciones.
- Resultados de procesos administrativos.
- Información contextual para el usuario.

---

### 3. Modal de confirmación
### Propósito
Solicitar confirmación explícita antes de ejecutar acciones sensibles.

### Casos de uso
- Cambio de empresa activa.
- Rechazo de solicitud.
- Eliminación lógica o física.
- Cierre de sesión.
- Reasignación de permisos.

---

### 4. Modal de formulario
### Propósito
Resolver formularios rápidos dentro del flujo sin redirigir a una pantalla completa.

### Casos de uso
- Asignar empresa a usuario.
- Asignar perfil inicial.
- Crear relación rápida entre entidades.
- Edición administrativa simple.

---

### 5. Toasts
### Propósito
Entregar retroalimentación no bloqueante al usuario mientras mantiene el flujo actual.

### Tipos definidos
- `success`
- `warning`
- `error`
- `info`

### Casos de uso
- Guardado exitoso.
- Solicitud pendiente de revisión.
- Error de validación.
- Cambio de contexto de empresa o sesión.

### Comportamiento esperado
- Aparición visual suave.
- Acumulación limitada.
- Cierre manual.
- Cierre automático por tiempo.
- Posicionamiento fijo en esquina superior derecha.

---

## Fase 1 · Estandarización visual
### Objetivo
Formalizar los lineamientos visuales que regirán los elementos DOM de Nexora.

### Tareas
- Validar paleta base oficial de Nexora.
- Formalizar uso de colores por tipo de acción.
- Definir radios, sombras, bordes y opacidades.
- Definir comportamiento visual común para overlays, superficies y estados hover.
- Consolidar lineamientos para modals y toasts reutilizables.

### Entregable
Mini guía visual base para componentes DOM.

### Estimación
- UX/UI: 4 h

---

## Fase 2 · Construcción de componentes base
### Objetivo
Construir los componentes reutilizables iniciales del sistema.

### Tareas frontend
- Crear `ModalShell` como componente base.
- Crear `ToastCard` como componente base.
- Crear helper visual por tipo de toast.
- Parametrizar títulos, mensajes, footer y acciones.
- Asegurar consistencia con el login aprobado.
- Definir estructura reutilizable para futuras variantes.

### Entregable
Biblioteca base funcional de modals y toasts.

### Estimación
- Frontend: 10 h

---

## Fase 3 · Integración con flujos reales
### Objetivo
Conectar los elementos DOM con acciones reales del sistema.

### Tareas
- Integrar modal informativo con estados de solicitudes.
- Integrar modal de confirmación con cambio de empresa activa.
- Integrar modal de formulario con asignación de empresa y perfil.
- Integrar toasts con respuestas del backend.
- Unificar mensajes visuales en operaciones CRUD.

### Entregable
Componentes operativos conectados a acciones reales.

### Estimación
- Frontend: 12 h
- Backend de soporte para mensajes/estados: 3 h

---

## Fase 4 · Normalización para reutilización global
### Objetivo
Preparar estos elementos para ser usados en todo Nexora sin duplicaciones.

### Tareas
- Crear convención de uso para modals y toasts.
- Definir nombres estándar de variantes.
- Preparar estructura para futura integración con store global.
- Establecer criterios de uso por tipo de interacción.
- Evitar que cada vista implemente sus propios modals desde cero.

### Entregable
Convención técnica de reutilización UI.

### Estimación
- Frontend: 5 h

---

## Fase 5 · QA visual y funcional
### Objetivo
Validar consistencia, comportamiento y calidad de interacción.

### Casos mínimos
- Apertura y cierre de modal informativo.
- Apertura y cierre de modal de confirmación.
- Apertura y cierre de modal de formulario.
- Disparo manual de toast success.
- Disparo manual de toast warning.
- Disparo manual de toast error.
- Disparo manual de toast info.
- Auto cierre de toast.
- Límite de toasts simultáneos.
- Validación visual sobre fondo operativo real.

### Tareas
- Revisión visual desktop.
- Revisión visual tablet.
- Validación de espaciados y jerarquía.
- Validación de superposición y layering.
- Ajustes menores de interacción.

### Estimación
- QA y ajustes: 6 h

---

## Resumen de esfuerzo estimado
### Frontend
- Fase 1: 4 h
- Fase 2: 10 h
- Fase 3: 12 h
- Fase 4: 5 h

**Total frontend: 31 h**

### Backend soporte
- Fase 3: 3 h

**Total backend soporte: 3 h**

### QA y cierre
- 6 h

**Total general estimado: 40 h**

---

## Historias sugeridas
- **HU-UI-01** Como usuario, quiero ver modals informativos claros para entender el estado de mis acciones.
- **HU-UI-02** Como usuario, quiero confirmar acciones sensibles antes de ejecutarlas.
- **HU-UI-03** Como administrador, quiero completar formularios rápidos dentro de modals sin abandonar el contexto.
- **HU-UI-04** Como usuario, quiero recibir toasts claros cuando una acción fue exitosa, falló o quedó pendiente.
- **HU-UI-05** Como sistema, quiero reutilizar los mismos patrones visuales en todo Nexora para mantener consistencia.

---

## Criterios de aceptación
- Los modals mantienen coherencia visual con el login aprobado.
- Los toasts usan la paleta oficial definida para Nexora.
- Cada tipo de toast se distingue visualmente de forma clara.
- Los modals pueden abrirse y cerrarse sin romper el flujo principal.
- Los modals aceptan contenido y acciones configurables.
- Los toasts pueden cerrarse manualmente.
- Los toasts se cierran automáticamente después del tiempo definido.
- El sistema limita la cantidad de toasts visibles simultáneamente.
- Los componentes quedan preparados para reutilización en nuevas vistas.

---

## Recomendación técnica
Para mantener orden y escalabilidad en Nexora, se recomienda:

- centralizar estos componentes dentro de una carpeta base UI,
- mantener un `ModalShell` único como patrón principal,
- usar una convención estándar para variantes de toast,
- separar lógica visual de la lógica de negocio,
- preparar posteriormente una integración con store global para manejar modals y toasts desde cualquier módulo.

---

## Próximos componentes sugeridos
Después de este bloque, conviene construir:

- inputs,
- selects,
- textareas,
- botones primarios y secundarios,
- badges de estado,
- dropdowns,
- tablas base,
- cards de resumen,
- paneles laterales,
- empty states.

