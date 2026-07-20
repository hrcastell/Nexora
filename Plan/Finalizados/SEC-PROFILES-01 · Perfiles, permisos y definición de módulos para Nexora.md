Módulo

SEC-PROFILES-01 · Perfiles, permisos y definición de módulos para Nexora

Objetivo

Definir e incorporar la ventana de perfiles y permisos de Nexora como núcleo de parametrización de visibilidad y seguridad funcional del sistema.

Este módulo permitirá:

crear y editar perfiles reutilizables,
definir módulos visibles del sistema,
establecer acciones permitidas por módulo,
usar esos perfiles en la ventana de usuarios,
y desacoplar el control de acceso de reglas rígidas en código.
Contexto funcional

La pantalla aprobada mantiene la línea visual definida para Nexora:

paleta principal: azul noche, plateado, dorado y morado,
superficies tipo glass,
jerarquía visual clara,
diseño consistente con login, dashboard, configuración visual, perfil de empresa y usuarios.

Esta ventana es estratégica porque formaliza el modelo de acceso del sistema.

A diferencia de la ventana de usuarios, donde se asigna un perfil a una persona, aquí se define la estructura base que luego será reutilizada:

qué módulos existen,
cuáles están visibles,
qué perfiles pueden operar sobre ellos,
qué acciones están permitidas por módulo.
Rol de esta ventana dentro de la arquitectura

Esta pantalla resuelve tres problemas estructurales:

1. Centralización de módulos

Los módulos del sistema se definen aquí una sola vez y luego se reutilizan en:

perfiles,
usuarios,
visibilidad del sistema,
menús,
permisos por acción.
2. Reutilización de perfiles

Los perfiles dejan de ser conceptos informales y pasan a ser configuraciones reutilizables que pueden asignarse a múltiples usuarios.

3. Limpieza del código

La visibilidad y seguridad dejan de depender de reglas rígidas como:

“esto solo lo ve el super_admin”
“esto solo lo ve el administrador”

y pasan a depender de datos parametrizados:

perfil asignado,
módulos visibles,
acciones permitidas,
estado del módulo.
Definiciones funcionales clave
Módulo

Representa un área funcional visible del sistema.

Ejemplos:

Empleados
Sueldos
Contratos
Horarios
Inventario
Órdenes
Facturación
Configuración
Solicitudes
Perfil

Representa una configuración reutilizable de acceso.

Ejemplos:

Acceso total
Gestión Humana / Supervisor
Operación / Supervisor
Finanzas
Consulta
Permiso por acción

Representa la acción específica que un perfil puede ejecutar dentro de un módulo.

Acciones contempladas:

Ver
Crear
Editar
Eliminar
Aprobar
Exportar
Gestionar
Alcance del perfil

Permite clasificar el perfil según su ámbito de uso.

Opciones contempladas:

Global
Empresa
Por módulo
Alcance funcional

Incluye:

listado de perfiles,
búsqueda de perfiles,
creación de perfiles,
edición de perfiles,
definición de alcance del perfil,
selección de módulos visibles por perfil,
definición de acciones permitidas por módulo,
listado de módulos del sistema,
búsqueda de módulos,
creación de módulos,
edición de módulos,
definición de grupo funcional,
definición de clave técnica,
definición de estado del módulo,
integración conceptual con la ventana de usuarios,
diseño responsive.

No incluye en esta etapa:

auditoría histórica de cambios,
versionado de perfiles,
herencia automática entre perfiles,
reglas condicionales avanzadas por registro,
permisos contextuales por sucursal o sede,
integración real con middleware backend,
sincronización automática con menú dinámico.
Componentes funcionales aprobados
1. Header del módulo
Propósito

Introducir el contexto del subsistema de seguridad parametrizable.

Incluye
título principal,
descripción funcional,
CTA para crear módulo,
CTA para crear perfil,
etiquetas de contexto de Nexora.
2. KPIs de parametrización
Propósito

Entregar lectura rápida del estado de la configuración de seguridad.

Métricas incluidas
perfiles creados,
módulos visibles,
módulos en borrador,
base parametrizada para usuarios.
3. Biblioteca de perfiles
Propósito

Permitir crear, listar y seleccionar perfiles reutilizables del sistema.

Incluye
nombre del perfil,
descripción,
alcance,
módulos asociados,
búsqueda,
selección del perfil activo.
4. Panel de perfil seleccionado
Propósito

Visualizar el detalle completo del perfil y sus permisos.

Incluye
nombre,
descripción,
alcance,
cantidad de módulos,
cantidad de acciones,
estado de reutilización,
lista de permisos por módulo,
CTA para editar.
5. Biblioteca de módulos
Propósito

Definir qué módulos existen dentro del sistema y cuáles serán visibles/configurables.

Incluye
nombre del módulo,
clave técnica,
grupo,
descripción,
estado del módulo,
edición del módulo.
Estados contemplados
Activo
Borrador
Oculto
6. Formulario de perfil
Propósito

Construir perfiles reutilizables basados en módulos y acciones.

Incluye
nombre,
descripción,
alcance,
selección de módulos,
configuración de acciones por módulo.
7. Formulario de módulo
Propósito

Definir módulos base del sistema para luego asignarlos a perfiles y usuarios.

Incluye
nombre del módulo,
clave técnica,
grupo,
estado,
descripción.
Relación con la ventana de usuarios

Esta ventana debe integrarse directamente con gestión de usuarios.

Flujo esperado
aquí se define el módulo,
aquí se define el perfil,
el perfil agrupa módulos y acciones,
en la ventana de usuarios se asigna ese perfil a una persona,
el sistema resuelve visibilidad y permisos desde la configuración.
Beneficio técnico

Esto evita:

hardcodear permisos,
repetir reglas en frontend,
repetir reglas en backend,
mezclar seguridad con lógica de UI.
Responsive y adaptabilidad

La ventana fue planteada como responsive, considerando:

reorganización del layout en pantallas medianas,
apilamiento de secciones en resoluciones menores,
reducción de columnas en formularios,
adaptación de grillas de acciones,
lectura clara en desktop y tablet.

Esto se alinea con la regla general del proyecto:

en pantallas reducidas, priorizar bloques verticales,
evitar columnas excesivas,
mantener usabilidad y lectura operativa.
Fase 1 · Definición del modelo de seguridad
Objetivo

Formalizar la estructura de módulos, perfiles y permisos.

Tareas
definir qué es un módulo dentro de Nexora,
definir estados válidos del módulo,
definir acciones base reutilizables,
definir tipos de alcance del perfil,
definir relación perfil ↔ módulo ↔ acción,
definir relación futura usuario ↔ perfil.
Entregable

Documento funcional del modelo de perfiles, módulos y permisos.

Estimación
funcional / análisis: 8 h
Fase 2 · Construcción frontend de la ventana
Objetivo

Desarrollar la pantalla aprobada con interacción local y diseño responsive.

Tareas frontend
construir header del módulo,
construir KPIs,
construir biblioteca de perfiles,
construir panel de detalle del perfil,
construir biblioteca de módulos,
construir formularios de alta/edición,
construir asignación de módulos,
construir asignación de acciones,
implementar responsive,
mantener coherencia visual con Nexora.
Entregable

Pantalla funcional de perfiles, permisos y módulos en frontend.

Estimación
frontend: 24 h
Fase 3 · Modelo de datos y persistencia
Objetivo

Preparar la estructura real para soportar perfiles y módulos configurables.

Tareas backend / DB
crear entidad de módulos,
crear entidad de perfiles,
crear relación perfil ↔ módulo,
crear relación perfil ↔ acción,
definir estados del módulo,
definir alcances del perfil,
preparar integración con usuarios,
preparar estructura de lectura para menú y visibilidad.
Entregable

Modelo persistente de seguridad parametrizable.

Estimación
backend / DB: 16 h
Fase 4 · Integración con la ventana de usuarios
Objetivo

Conectar esta parametrización con la gestión real de usuarios.

Tareas
reemplazar perfiles hardcodeados en usuarios,
cargar perfiles desde catálogo real,
cargar módulos desde catálogo real,
permitir que el usuario herede permisos del perfil,
preparar visibilidad del sistema a partir del perfil asignado.
Entregable

Ventana de usuarios conectada a perfiles y módulos reales.

Estimación
frontend: 10 h
backend: 8 h
Fase 5 · Integración con navegación y visibilidad
Objetivo

Preparar el sistema para mostrar u ocultar módulos según configuración.

Tareas
vincular módulos visibles al menú del sistema,
resolver visibilidad por perfil,
resolver acciones disponibles por perfil,
preparar middleware o capa de validación,
desacoplar menús y vistas de reglas duras.
Entregable

Base lista para controlar visibilidad desde configuración.

Estimación
frontend: 10 h
backend: 12 h
Fase 6 · QA visual y funcional
Objetivo

Validar que la ventana permita parametrizar correctamente el modelo de acceso.

Casos mínimos
crear módulo,
editar módulo,
cambiar estado de módulo,
crear perfil,
editar perfil,
asignar módulos a perfil,
asignar acciones a módulo dentro del perfil,
buscar perfiles,
buscar módulos,
visualizar relación con usuarios,
revisar responsive en desktop y tablet.
Estimación
QA y ajustes: 10 h
Resumen de esfuerzo estimado
Frontend
Fase 2: 24 h
Fase 4: 10 h
Fase 5: 10 h

Total frontend: 44 h

Backend / DB
Fase 3: 16 h
Fase 4: 8 h
Fase 5: 12 h

Total backend / base: 36 h

Funcional / análisis
Fase 1: 8 h
QA y cierre
10 h

Total general estimado: 98 h

Historias sugeridas
HU-SEC-PROF-01 Como administrador, quiero crear perfiles reutilizables para asignarlos a múltiples usuarios.
HU-SEC-PROF-02 Como administrador, quiero definir módulos visibles del sistema para controlar qué áreas existen y se exponen.
HU-SEC-PROF-03 Como administrador, quiero asignar acciones por módulo para controlar con precisión lo que puede hacer cada perfil.
HU-SEC-PROF-04 Como sistema, quiero que los módulos definidos aquí sean reutilizados en usuarios y navegación.
HU-SEC-PROF-05 Como sistema, quiero resolver seguridad y visibilidad desde configuración en lugar de reglas hardcodeadas.
Criterios de aceptación
La ventana permite crear y editar módulos.
La ventana permite definir estados del módulo.
La ventana permite crear y editar perfiles.
La ventana permite asignar módulos a un perfil.
La ventana permite asignar acciones por módulo.
Los módulos definidos aquí pueden ser reutilizados por la ventana de usuarios.
La pantalla mantiene coherencia visual con Nexora.
La vista responde correctamente en desktop y tablet.
La estructura queda preparada para controlar visibilidad real del sistema.
Recomendación técnica

Para mantener orden y escalabilidad en Nexora, se recomienda:

separar entidades de módulo, perfil, acción y usuario,
no mezclar perfiles con cargos ni roles laborales,
centralizar resolución de permisos en una capa reusable,
usar claves técnicas de módulo como identificadores únicos,
evitar acoplar navegación y seguridad directamente a la UI,
considerar un motor posterior de permisos por acción y contexto.