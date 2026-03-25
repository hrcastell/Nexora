# Plan de Implementación del Dashboard de Configuración

## Módulo
**DASH-CONFIG-01 · Dashboard de configuración para Nexora**

## Objetivo
Definir e incorporar el dashboard de configuración de **Nexora** como punto central de administración para el perfil `super_admin`, manteniendo coherencia visual con el login aprobado y con los elementos DOM base ya definidos.

Este dashboard se enfoca exclusivamente en la **sección de configuración**, consolidando una vista ejecutiva y operativa desde la cual se podrá navegar a los módulos administrativos principales del sistema.

---

## Contexto funcional
El dashboard aprobado sigue la línea visual previamente definida para Nexora:

- Paleta principal: **azul noche, plateado, dorado y morado**.
- Superficies tipo glass.
- Bordes suaves y jerarquía visual clara.
- Estructura pensada para operación administrativa diaria.
- Vista orientada al usuario con perfil `super_admin`.

El objetivo del dashboard no es ejecutar todos los CRUD directamente desde esta pantalla, sino funcionar como **centro de control de configuración**, permitiendo visibilidad rápida, priorización y acceso a los módulos administrativos.

---

## Alcance funcional
Incluye:

- Sidebar exclusivo de configuración.
- Header ejecutivo del dashboard.
- Buscador de módulos de configuración.
- Indicador de alertas.
- Tarjetas KPI resumidas.
- Grilla de módulos de configuración.
- Panel lateral de detalle del módulo seleccionado.
- Bloque de actividad reciente.
- Persistencia visual del contexto activo:
  - usuario,
  - perfil,
  - empresa.
- Identidad visual consistente con login y DOM base.

No incluye en esta etapa:

- CRUD completos embebidos dentro del dashboard.
- Navegación real entre pantallas ya conectada a router.
- Persistencia backend de métricas en tiempo real.
- Filtros avanzados por estado, sponsor o país.
- Widgets analíticos con gráficos.
- Personalización por usuario.

---

## Módulos visibles en el dashboard
El dashboard aprobado contempla, dentro de configuración, los siguientes accesos:

1. **Gestión de empresas**
2. **Usuarios y accesos**
3. **Pagos y convenios**
4. **Solicitudes**
5. **Aprobar banner**
6. **Planes de publicidad**

Estos módulos ya reflejan la estructura administrativa definida previamente para Nexora.

---

## Componentes funcionales aprobados

### 1. Sidebar de configuración
### Propósito
Concentrar la navegación lateral de la sección de configuración y mostrar el contexto operativo activo.

### Contenido
- Marca Nexora.
- Etiqueta de sección: Configuración.
- Menú lateral con módulos administrativos.
- Resumen de contexto activo:
  - usuario,
  - perfil,
  - empresa.

### Uso previsto
- Navegación persistente para `super_admin`.
- Acceso rápido entre módulos sin perder contexto.

---

### 2. Header del dashboard
### Propósito
Presentar el enfoque de la pantalla y habilitar acciones rápidas de navegación contextual.

### Contenido
- Etiqueta visual de dashboard de configuración.
- Vista `Super Admin`.
- Título principal.
- Descripción funcional.
- Buscador de módulos.
- Indicador de alertas.

### Uso previsto
- Orientación contextual.
- Búsqueda rápida.
- Entrada a futuras acciones ejecutivas.

---

### 3. Tarjetas KPI
### Propósito
Entregar una lectura inmediata del estado administrativo general.

### Métricas mostradas
- Empresas activas.
- Solicitudes pendientes.
- Pagos en revisión.
- Banners por aprobar.

### Uso previsto
- Priorización de trabajo.
- Visibilidad ejecutiva.
- Lectura rápida del estado del sistema.

---

### 4. Centro de administración
### Propósito
Mostrar en formato visual los módulos de configuración disponibles y permitir seleccionar uno para inspección rápida.

### Contenido por tarjeta
- Ícono del módulo.
- Nombre del módulo.
- Descripción funcional.
- Estado del módulo.
- Cantidad de registros.
- Acción visual de apertura.

### Estados contemplados
- `active`
- `review`
- `draft`

### Uso previsto
- Navegación principal a configuración.
- Priorización de módulos.
- Vista resumida de alcance por módulo.

---

### 5. Panel de módulo seleccionado
### Propósito
Mostrar el detalle contextual del módulo activo sin salir del dashboard.

### Contenido
- Nombre del módulo.
- Descripción.
- Estado.
- Cantidad de registros activos.
- Responsable.
- CTA principal.
- CTA secundaria.

### Uso previsto
- Entrada al módulo.
- Validación previa antes de navegar.
- Resumen ejecutivo del área seleccionada.

---

### 6. Actividad reciente
### Propósito
Entregar visibilidad inmediata sobre eventos administrativos recientes relevantes.

### Casos representados
- Solicitudes aprobadas.
- Pagos en revisión.
- Nuevos banners recibidos.

### Uso previsto
- Seguimiento operativo.
- Señales de actividad reciente.
- Priorización de revisión manual.

---

## Fase 1 · Definición visual y estructural
### Objetivo
Formalizar la estructura del dashboard de configuración dentro del sistema de diseño de Nexora.

### Tareas
- Validar la estructura general del dashboard.
- Confirmar jerarquía de bloques.
- Formalizar ubicación de KPIs, panel lateral y actividad reciente.
- Definir lineamientos de navegación visual para configuración.
- Alinear dashboard con el login y la base DOM previamente aprobada.

### Entregable
Especificación visual base del dashboard de configuración.

### Estimación
- UX/UI: 5 h

---

## Fase 2 · Construcción frontend del dashboard
### Objetivo
Desarrollar la vista funcional del dashboard con datos mock y navegación local.

### Tareas frontend
- Construir sidebar de configuración.
- Construir header ejecutivo.
- Implementar buscador local de módulos.
- Implementar tarjetas KPI.
- Construir grilla de módulos de configuración.
- Implementar selección de módulo activo.
- Construir panel lateral de detalle.
- Construir lista de actividad reciente.
- Mantener consistencia con el sistema visual aprobado.

### Entregable
Dashboard funcional en frontend con interacción local.

### Estimación
- Frontend: 16 h

---

## Fase 3 · Integración con navegación real
### Objetivo
Preparar el dashboard para conectarse con los módulos reales del sistema.

### Tareas
- Conectar cada tarjeta de módulo con su ruta o vista correspondiente.
- Integrar acciones del CTA principal.
- Integrar acciones del CTA secundario.
- Preparar entrada desde login según perfil `super_admin`.
- Conectar contexto activo de usuario, perfil y empresa.

### Entregable
Dashboard navegable dentro del flujo real de Nexora.

### Estimación
- Frontend: 10 h
- Backend soporte/contexto: 4 h

---

## Fase 4 · Integración de datos reales
### Objetivo
Reemplazar métricas y actividad mock por información real proveniente del backend.

### Tareas
- Integrar métricas de empresas activas.
- Integrar solicitudes pendientes.
- Integrar pagos en revisión.
- Integrar banners por aprobar.
- Integrar actividad reciente desde backend.
- Manejar estados loading, vacío y error.

### Entregable
Dashboard con indicadores y actividad conectados a datos reales.

### Estimación
- Frontend: 8 h
- Backend: 8 h

---

## Fase 5 · QA visual y funcional
### Objetivo
Validar comportamiento, consistencia visual y preparación para producción.

### Casos mínimos
- Visualización del sidebar completo.
- Cambio de módulo seleccionado.
- Filtrado correcto mediante buscador.
- Lectura correcta de KPIs.
- Visualización del panel lateral según módulo activo.
- Visualización de actividad reciente.
- Correcto comportamiento en desktop.
- Correcto comportamiento en tablet.
- Conservación del lenguaje visual de Nexora.

### Tareas
- Revisión visual de layout.
- Revisión de espaciados y jerarquías.
- Validación de estados de selección.
- Validación de consistencia con login y DOM base.
- Ajustes menores de interacción y presentación.

### Estimación
- QA y ajustes: 6 h

---

## Resumen de esfuerzo estimado
### Frontend
- Fase 1: 5 h
- Fase 2: 16 h
- Fase 3: 10 h
- Fase 4: 8 h

**Total frontend: 39 h**

### Backend soporte
- Fase 3: 4 h
- Fase 4: 8 h

**Total backend soporte: 12 h**

### QA y cierre
- 6 h

**Total general estimado: 57 h**

---

## Historias sugeridas
- **HU-DASH-01** Como `super_admin`, quiero visualizar un dashboard de configuración para acceder rápidamente a los módulos administrativos.
- **HU-DASH-02** Como `super_admin`, quiero ver indicadores rápidos para priorizar solicitudes, pagos y banners pendientes.
- **HU-DASH-03** Como `super_admin`, quiero buscar módulos dentro de configuración para acceder más rápido al área que necesito.
- **HU-DASH-04** Como `super_admin`, quiero ver el detalle resumido del módulo seleccionado antes de entrar en él.
- **HU-DASH-05** Como `super_admin`, quiero ver actividad reciente para entender qué eventos administrativos ocurrieron últimamente.

---

## Criterios de aceptación
- El dashboard mantiene coherencia visual con el login y la base DOM de Nexora.
- El sidebar muestra solo la navegación de configuración.
- El buscador filtra módulos visibles correctamente.
- El módulo seleccionado actualiza el panel lateral.
- Las tarjetas KPI muestran estado resumido del sistema.
- La actividad reciente se presenta en una sección independiente.
- La vista refleja claramente el contexto de `super_admin`.
- La estructura queda preparada para integración con rutas y backend real.

---

## Recomendación técnica
Para mantener orden y escalabilidad en Nexora, se recomienda:

- separar el dashboard en componentes (`SidebarConfig`, `HeaderConfig`, `KpiCards`, `ModuleGrid`, `SelectedModulePanel`, `RecentActivityPanel`),
- centralizar el estado del contexto activo en una capa de sesión,
- desacoplar los datos mock de los contratos backend,
- dejar el dashboard preparado para consumir métricas desde servicios independientes,
- reutilizar badges, cards e inputs del sistema visual ya aprobado.

---

## Próximos pasos sugeridos
Después de este dashboard, conviene avanzar con alguno de estos módulos:

- vista de **Solicitudes**,
- vista de **Gestión de empresas**,
- vista de **Usuarios y accesos**,
- tabla administrativa base para configuración,
- filtros avanzados y acciones rápidas por módulo.

