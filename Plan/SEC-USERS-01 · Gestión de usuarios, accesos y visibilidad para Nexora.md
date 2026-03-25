Módulo

SEC-USERS-01 · Gestión de usuarios, accesos y visibilidad para Nexora

Objetivo

Definir e incorporar la ventana de gestión de usuarios de Nexora como núcleo administrativo para controlar identidad, estado, rol, cargo, perfil y alcance funcional de cada usuario dentro de su empresa.

Esta ventana será una pieza clave para parametrizar permisos y accesos de forma centralizada, evitando condicionales rígidos en código y permitiendo un modelo más limpio, escalable y mantenible.

Contexto funcional

La pantalla aprobada mantiene la línea visual definida para Nexora:

Paleta principal: azul noche, plateado, dorado y morado.
Superficies tipo glass.
Jerarquía visual clara.
Diseño consistente con login, DOM base, dashboard, configuración visual y perfil de empresa.
Enfoque operativo y administrativo.

Su propósito no es solamente listar usuarios, sino convertirse en la base del modelo de seguridad y visibilidad del sistema.

Aquí se administrará:

quién existe dentro del tenant,
cuál es su estado,
qué rol cumple dentro de la aplicación,
cuál es su cargo laboral,
qué perfil funcional posee,
qué módulos puede ver o gestionar,
qué acciones puede ejecutar.
Definiciones funcionales clave
Rol

Representa el papel que cumple el usuario dentro de la aplicación.

Ejemplos:

Administrador
Usuario
Supervisor
Auditor
Cargo

Representa su puesto laboral real dentro de la empresa.

Ejemplos:

CEO
Jefa de Recursos Humanos
Jefe de Operaciones
Recepcionista
Analista Contable
Perfil

Representa el nivel de acceso funcional dentro de la app.

Ejemplos:

Acceso total
Gestión Humana / Supervisor
Operación / Supervisor
Finanzas
Consulta
Nivel de acceso

Permite definir el alcance general del usuario.

Opciones contempladas:

Acceso total
Por módulo
Supervisión
Ejemplos de negocio contemplados
Caso 1

Hernan Castellanos

Rol: Administrador
Cargo: CEO
Perfil: Acceso total

Interpretación:

Puede gestionar todos los módulos del esquema de su empresa.
Tiene visibilidad transversal del sistema.
Puede parametrizar accesos, configuraciones y operaciones.
Caso 2

Maria Rincón

Rol: Usuario
Cargo: Jefa de Recursos Humanos
Perfil: Gestión Humana / Supervisor

Interpretación:

Puede gestionar todos los módulos asociados a RRHH.
Puede operar sobre empleados, sueldos, contratos, horarios y reportes del área.
No requiere acceso total al resto del sistema.
Alcance funcional

Incluye:

Listado de usuarios.
Búsqueda por nombre, correo, rol, cargo o perfil.
Filtro por estado.
Visualización responsive.
Visualización en formato de bloques y tarjetas adaptables.
Selección de usuario activo.
Panel de detalle del usuario.
Creación de nuevos usuarios.
Edición de usuarios existentes.
Eliminación de usuarios.
Suspensión de usuarios.
Inhabilitación de usuarios.
Asignación de rol.
Asignación de cargo.
Asignación de perfil.
Asignación de nivel de acceso.
Asignación de módulos habilitados.
Visualización del modelo de permisos.
Base visual para parametrización de seguridad.

No incluye en esta etapa:

Motor completo de permisos por acción específica.
Herencia de permisos por perfil maestro.
Auditoría detallada de cambios.
Versionado histórico de permisos.
Flujo de aprobación para cambios críticos.
Integración real con backend de permisos.
Integración con autenticación avanzada o MFA.
Componentes funcionales aprobados
1. Header ejecutivo de gestión de usuarios
Propósito

Introducir el contexto del módulo y resaltar su importancia como núcleo del modelo de seguridad.

Incluye
Título principal.
Descripción funcional.
CTA para crear usuario.
Etiquetas de contexto de Nexora.
2. KPIs de usuarios
Propósito

Entregar lectura rápida del estado del ecosistema de usuarios.

Métricas incluidas
Usuarios totales.
Usuarios activos.
Usuarios suspendidos.
Usuarios inhabilitados.
3. Directorio de usuarios
Propósito

Mostrar el universo de usuarios disponibles y permitir navegación rápida entre ellos.

Incluye
Búsqueda.
Filtro por estado.
Lista visual seleccionable.
Visualización de:
nombre,
correo,
rol,
cargo,
perfil,
estado,
nivel de acceso.
4. Panel de detalle del usuario
Propósito

Mostrar en detalle la configuración de acceso del usuario seleccionado.

Incluye
Nombre y correo.
Estado.
Rol.
Cargo.
Perfil.
Empresa.
Módulos permitidos.
Acciones rápidas:
editar,
suspender,
inhabilitar,
eliminar.
5. Formulario de alta y edición
Propósito

Permitir crear o modificar usuarios desde una ventana centralizada.

Incluye
Nombre completo.
Correo.
Rol.
Cargo.
Perfil.
Estado.
Nivel de acceso.
Selección de módulos habilitados.
Uso previsto
Alta de usuarios.
Ajuste de seguridad.
Mantenimiento de permisos.
Gestión administrativa centralizada.
6. Modelo visual de permisos
Propósito

Explicar y reforzar la lógica estructural del sistema.

Incluye
Diferencia entre rol, cargo y perfil.
Base conceptual para futura capa avanzada de permisos.
Soporte para mantener el código desacoplado de reglas fijas.
Responsive y adaptabilidad

La ventana fue planteada como responsive, considerando:

reorganización del layout en pantallas medianas,
apilamiento de bloques en pantallas más pequeñas,
adaptación de estadísticas,
ajuste del formulario a una sola columna,
mejor lectura de contenido en tablets,
visualización más tipo tarjeta en anchos reducidos.

Esto se alinea con la regla general del proyecto:

en resoluciones reducidas, la experiencia debe favorecer bloques verticales,
evitar exceso de columnas,
priorizar legibilidad y operación cómoda.
Fase 1 · Definición funcional del modelo de acceso
Objetivo

Formalizar cómo se relacionan rol, cargo, perfil y módulos dentro del sistema.

Tareas
Definir diferencia formal entre rol, cargo y perfil.
Definir niveles de acceso permitidos.
Definir estructura base de módulos asignables.
Definir estados posibles del usuario.
Establecer lineamientos para desacoplar permisos del código.
Entregable

Documento funcional del modelo de usuario y acceso.

Estimación
Funcional / análisis: 6 h
Fase 2 · Construcción frontend de la ventana
Objetivo

Desarrollar la pantalla aprobada con lógica local y responsive.

Tareas frontend
Construir header del módulo.
Construir KPIs.
Construir barra de búsqueda.
Construir filtro por estado.
Construir directorio de usuarios.
Construir panel de detalle.
Construir modal o formulario de alta/edición.
Construir acciones rápidas.
Implementar responsive.
Mantener coherencia visual con Nexora.
Entregable

Pantalla funcional de gestión de usuarios en frontend.

Estimación
Frontend: 20 h
Fase 3 · Modelo de datos y persistencia
Objetivo

Preparar la estructura real para soportar gestión de usuarios y accesos.

Tareas backend / DB
Definir tabla de usuarios por empresa.
Definir relación usuario ↔ empresa.
Definir relación usuario ↔ rol.
Definir relación usuario ↔ cargo.
Definir relación usuario ↔ perfil.
Definir relación usuario ↔ módulos habilitados.
Definir estados operativos del usuario.
Preparar estructura para futuras reglas por acción.
Entregable

Modelo de datos funcional para usuarios y acceso.

Estimación
Backend / DB: 12 h
Fase 4 · Integración real de CRUD
Objetivo

Conectar la pantalla con operaciones reales del sistema.

Tareas
Crear endpoint para listar usuarios.
Crear endpoint para alta.
Crear endpoint para edición.
Crear endpoint para suspensión.
Crear endpoint para inhabilitación.
Crear endpoint para eliminación.
Integrar búsqueda y filtro.
Integrar actualización visual del panel seleccionado.
Entregable

Gestión de usuarios conectada al backend.

Estimación
Frontend: 10 h
Backend: 12 h
Fase 5 · Preparación para permisos avanzados
Objetivo

Dejar la base lista para evolucionar a una matriz de permisos más robusta.

Tareas
Preparar estructura para permisos por módulo.
Preparar estructura para permisos por acción.
Separar perfiles reutilizables de permisos individuales.
Evaluar visibilidad por componente, vista o acción.
Diseñar transición hacia pantalla de perfiles y permisos.
Entregable

Base preparada para modelo avanzado de seguridad.

Estimación
Análisis / backend / frontend base: 10 h
Fase 6 · QA visual y funcional
Objetivo

Validar que la ventana responda correctamente a la lógica administrativa y a la experiencia responsive.

Casos mínimos
Alta de usuario.
Edición de usuario.
Eliminación de usuario.
Suspensión de usuario.
Inhabilitación de usuario.
Cambio de rol.
Cambio de cargo.
Cambio de perfil.
Cambio de módulos permitidos.
Búsqueda por nombre y correo.
Filtro por estado.
Visualización responsive en desktop y tablet.
Estimación
QA y ajustes: 8 h
Resumen de esfuerzo estimado
Frontend
Fase 2: 20 h
Fase 4: 10 h

Total frontend: 30 h

Backend / DB
Fase 3: 12 h
Fase 4: 12 h
Fase 5: 10 h

Total backend / base: 34 h

Funcional / análisis
Fase 1: 6 h
QA y cierre
8 h

Total general estimado: 78 h

Historias sugeridas
HU-SEC-01 Como administrador, quiero listar y buscar usuarios de mi empresa para gestionarlos desde un solo lugar.
HU-SEC-02 Como administrador, quiero crear usuarios asignando rol, cargo y perfil para reflejar su función real.
HU-SEC-03 Como administrador, quiero suspender o inhabilitar usuarios para controlar accesos sin borrar información útil.
HU-SEC-04 Como administrador, quiero definir acceso total o por módulo para parametrizar permisos sin reglas rígidas en código.
HU-SEC-05 Como sistema, quiero que el modelo de seguridad se base en datos parametrizados y no en condicionales hardcodeados.
Criterios de aceptación
La ventana permite listar usuarios.
La ventana permite buscar y filtrar usuarios.
La ventana permite crear, editar y eliminar usuarios.
La ventana permite suspender e inhabilitar usuarios.
La ventana permite asignar rol, cargo y perfil.
La ventana permite asignar módulos habilitados.
El diseño mantiene coherencia con Nexora.
La vista responde correctamente en desktop y tablet.
La base queda preparada para desacoplar permisos del código.
Recomendación técnica

Para mantener orden y escalabilidad en Nexora, se recomienda:

separar usuarios, perfiles y permisos en entidades distintas,
no usar el perfil como único contenedor de toda la lógica,
tratar rol, cargo y perfil como conceptos independientes,
preparar una capa posterior de permisos por módulo y acción,
centralizar resolución de acceso en servicios o middleware reutilizable,
evitar condicionales tipo “solo super_admin ve esto” directamente en vistas cuando esa regla pueda salir desde configuración.