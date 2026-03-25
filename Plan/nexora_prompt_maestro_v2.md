# Prompt maestro — Nexora

```text
Actúa como un arquitecto de software senior, analista funcional, diseñador de producto SaaS y líder técnico full stack experto en PostgreSQL, FastAPI, Node.js, Vue.js y Tailwind CSS.

Quiero que me ayudes a diseñar y desarrollar una aplicación SaaS modular llamada Nexora, pensada para ser la base reutilizable de múltiples apps empresariales. Aunque esta primera implementación estará enfocada en gestión de taller, la arquitectura debe quedar preparada para reutilizarse en futuros sistemas sin tener que redefinir nuevamente la base estructural.

# NOMBRE DEL PRODUCTO
Nexora

Nexora será mi framework funcional y visual para construir aplicaciones empresariales reutilizando:
- autenticación
- multicompañía
- multiperfil
- configuración visual
- configuración de empresa
- usuarios, roles y perfiles
- dashboards
- layouts base
- branding por empresa

La idea es que esta estructura sirva como base para futuras apps sin partir desde cero.

# STACK TECNOLÓGICO OBLIGATORIO
## Frontend
- Vue.js
- Tailwind CSS

## Backend
- FastAPI
- Node.js

## Base de datos
- PostgreSQL

# ENFOQUE DE DESARROLLO
Quiero que el desarrollo se haga por secciones o ventanas del programa.

## Regla principal de trabajo
No se debe avanzar a la siguiente ventana o módulo hasta que la actual esté:
- terminada
- validada
- con CRUD funcional completo
- con comportamiento óptimo
- con estructura clara
- con UI consistente
- con validaciones
- con manejo de errores
- con modelo de datos estable
- con endpoints listos
- con navegación integrada

## Esto significa que cada sección debe quedar cerrada antes de continuar.

### Orden esperado de trabajo
1. Definir ventana o sección
2. Definir objetivo funcional
3. Definir modelo de datos asociado
4. Definir endpoints
5. Definir componentes frontend
6. Definir validaciones
7. Implementar CRUD completo
8. Probar flujo
9. Optimizar UX/UI
10. Cerrar sección
11. Recién entonces pasar a la siguiente

# ARQUITECTURA MULTICOMPAÑÍA
La aplicación debe funcionar con un modelo multicompañía por esquema de base de datos.

## Regla principal
Cada compañía registrada debe tener su propio schema en PostgreSQL.

Ejemplo:
- public
- hernancius
- empresa_x
- empresa_y

## Objetivo
Aislar completamente la información de cada empresa a nivel de base de datos.

## Consideraciones técnicas
- el sistema debe partir inicialmente con:
  - schema public
  - schema hernancius
- public funcionará como esquema global o núcleo administrativo
- hernancius será el esquema de mi empresa base
- cada nueva empresa registrada en el sistema debe crear su propio schema
- el sistema debe ser capaz de aprovisionar automáticamente:
  - schema
  - tablas necesarias
  - configuración inicial
  - branding base
  - usuario administrador base
  - relaciones mínimas para operar

## Requisito de diseño
Debes proponer una arquitectura profesional donde:
- exista un núcleo central en public
- exista trazabilidad de compañías
- exista un directorio central de acceso
- exista control de estados comerciales
- exista la capacidad de administrar compañías desde la misma app

# FIRMA DIGITAL DEL PROPIETARIO / NÚCLEO DE LA APP
Como propietario de la app, esta plataforma debe llevar una especie de firma digital estructural en el código.

## Objetivo
Que la misma app me permita:
- administrar las empresas registradas
- gestionar su acceso
- controlar sus condiciones de uso
- usar la plataforma como producto SaaS propio

Esto significa que debo tener una entrada privilegiada y una estructura inicial que no dependa de procesos de onboarding.

# DATA INICIAL FUNDAMENTAL
El sistema debe crear desde el inicio una compañía base y un usuario inicial inamovible.

## Usuario inicial e inamovible
- correo: hernan.castellanos@hrcastell.com
- contraseña: N@nreh26*

### Regla importante
Este usuario:
- no podrá ser eliminado
- debe existir siempre
- será base del control del sistema
- tendrá acceso superior
- será parte de la estructura fundamental del producto

## Datos de la empresa inicial
- nombre empresa: HrCastell Systems Core
- run: 24.848.246-k
- dirección: Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana
- teléfono: +56973126500
- correo: hernan.castellanos@hrcastell.com

## Representante legal
- nombre: Hernan Ricardo Castellanos Castillo
- rut: 24.848.246-k
- dirección: Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana
- teléfono: +56973126500
- correo: hernan.castellanos@hrcastell.com

## Requisitos técnicos de seguridad
- almacenar contraseña hasheada
- forzar cambio de contraseña en producción o en primer ingreso si se define así
- no exponer credenciales en frontend
- no registrar contraseñas en logs
- marcar este usuario como protegido / no eliminable
- marcar esta empresa como empresa núcleo inicial del sistema

# ESTRUCTURA INICIAL DE LA APP
La app debe partir inicialmente con lo siguiente:
1. Login
2. Selector de compañías para el propietario
3. Dashboard base
4. Layout general
5. Inicio posterior del módulo de configuración

# FLUJO DE LOGIN INICIAL DEL PROPIETARIO
Quiero que el login funcione inicialmente así:

## Caso propietario principal
Cuando se ingrese:
- correo: hernan.castellanos@hrcastell.com
- contraseña: N@nreh26*

el sistema debe permitir entrar a una ventana donde pueda ver todas las compañías / esquemas de base de datos registrados en la plataforma.

## Desde esa ventana yo podré:
- ver todas las compañías
- identificar sus esquemas
- ingresar a cualquiera de ellas
- elegir la compañía con la que quiero trabajar

## Estado inicial del sistema
Al inicio solo existirán:
- public
- hernancius

### Donde:
- public es el esquema global
- hernancius es el esquema inicial de mi compañía

## Flujo esperado
1. ingreso correo y contraseña
2. el sistema detecta que soy el propietario inicial
3. me muestra una ventana con las compañías registradas
4. puedo entrar a cualquiera de ellas
5. inicialmente entraré por defecto a hernancius
6. al ingresar veo el dashboard

# DASHBOARD INICIAL
Una vez ingresado, veré un dashboard base.

## Layout esperado
- lado izquierdo: menú lateral
- lado derecho: área de contenido principal

## El dashboard debe incluir:
- layout administrativo limpio
- widgets iniciales
- navegación base
- cabecera superior
- selector de contexto si aplica
- estructura reutilizable para futuras ventanas

## Objetivo del dashboard
No quiero un dashboard genérico, sino una base administrativa reutilizable para todas las apps futuras que cree dentro del ecosistema Nexora.

# ENFOQUE DE CONSTRUCCIÓN INICIAL
Quiero partir de manera ordenada para evitar errores cometidos antes.

## Reglas de construcción
- primero construir base estructural
- luego construir ventanas núcleo
- luego cerrar CRUD completo por sección
- luego recién abrir nuevos módulos

## Primer enfoque
No comenzar todavía con todos los módulos del taller.
Primero consolidar la base transversal reutilizable del sistema.

# VENTANAS EXCLUSIVAS DEL SUPER_ADMIN
Las siguientes ventanas solo deben ser visibles y accesibles para el usuario super_admin inicial:
- correo: hernan.castellanos@hrcastell.com

Estas ventanas no deben mostrarse ni en menú ni en rutas para otros usuarios, aunque sean administradores de compañía.

## Regla de seguridad
- solo el super_admin puede ver estas ventanas
- solo el super_admin puede consultar, crear, editar, aprobar, bloquear o gestionar información de estos módulos
- los administradores de compañía no deben tener acceso a estas vistas
- el backend debe validar permisos incluso si alguien intenta acceder manualmente por URL o endpoint
- estas ventanas pertenecen al núcleo SaaS de Nexora y no al dominio operativo de cada empresa

## 1. Gestión de Empresas
Esta ventana será exclusiva del super_admin y estará orientada a la administración comercial y operativa de todas las empresas suscritas a Nexora.

### Objetivo
Permitir al propietario de la app gestionar todas las compañías registradas, sus condiciones de uso, estado comercial y acuerdos de pago.

### Debe permitir:
- listar todas las empresas registradas
- ver detalle de cada empresa
- ver el schema asociado a cada empresa
- ver estado de activación
- ver fecha de creación
- ver plan contratado
- ver convenio de pago
- ver tarifas vigentes
- ver historial de pagos
- validar pagos realizados
- registrar pagos manualmente
- ajustar tarifas
- modificar condiciones comerciales
- activar o desactivar acceso a la app
- suspender empresas por mora o incumplimiento
- reactivar empresas
- registrar observaciones internas
- ver datos de contacto de la empresa
- ver representante legal
- ver última actividad o último acceso administrativo

### Submódulo: Ventana de Pago
Dentro de Gestión de Empresas debe existir una subventana o sección específica de pagos.

#### Esta ventana debe permitir:
- gestionar convenios de pago por empresa
- definir tarifa o precio acordado
- registrar frecuencia de pago
- registrar método de pago
- registrar fecha de pago
- registrar estado del pago
- registrar pagos pendientes
- validar pagos abonados
- mantener historial completo de pagos
- agregar observaciones comerciales
- controlar vigencia de acceso según pago
- marcar empresas como:
  - activa
  - pendiente de pago
  - suspendida
  - en negociación
  - vencida

### Datos sugeridos para este módulo
- empresa
- schema
- administrador principal
- correo de contacto
- teléfono
- plan
- tarifa acordada
- moneda
- ciclo de cobro
- fecha inicio convenio
- próxima fecha de pago
- último pago
- monto pagado
- monto pendiente
- estado comercial
- método de pago
- comprobante si aplica
- observaciones internas

### CRUD esperado
- crear convenio de pago
- editar convenio de pago
- registrar pago
- editar registro de pago
- validar pago
- ver historial de pagos
- cambiar estado comercial
- activar o suspender empresa

## 2. Ventana de Solicitudes
Esta ventana será exclusiva del super_admin y estará orientada a la captación y gestión de potenciales clientes que deseen usar Nexora.

### Objetivo
Visualizar y gestionar todas las solicitudes provenientes del sitio web de Nexora, donde una empresa interesada complete un formulario para ser contactada y negociar tarifas, condiciones y eventual alta en la plataforma.

### Flujo esperado
1. una empresa interesada ingresa al sitio web de Nexora
2. completa un formulario de solicitud
3. la solicitud queda registrada en el sistema
4. el super_admin la visualiza en la Ventana de Solicitudes
5. el super_admin revisa los datos
6. luego contacta al interesado
7. si existe acuerdo comercial, podrá iniciar el proceso de alta de empresa y creación de schema

### Esta ventana debe permitir:
- listar todas las solicitudes recibidas
- ver detalle completo de cada solicitud
- cambiar estado de la solicitud
- registrar observaciones internas
- registrar seguimiento comercial
- marcar solicitudes como contactadas
- marcar solicitudes como aprobadas o rechazadas
- convertir una solicitud aprobada en proceso de alta de empresa
- vincular la solicitud con futura creación de compañía
- conservar historial de gestión

### Campos sugeridos del formulario público
- nombre de la empresa
- rubro o tipo de negocio
- nombre del contacto principal
- correo de contacto
- teléfono
- país
- región / ciudad si aplica
- cantidad estimada de usuarios
- comentario o necesidad principal
- interés o módulo principal requerido
- fecha de solicitud

### Estados sugeridos de la solicitud
- nueva
- en revisión
- contactada
- en negociación
- aprobada
- rechazada
- convertida en cliente

### CRUD esperado
- visualizar solicitudes
- editar datos internos de seguimiento
- actualizar estado
- registrar comentarios
- aprobar o rechazar
- convertir a proceso de alta

# MÓDULOS / VENTANAS PRIORITARIAS INICIALES
## 1. Base del sistema
- login
- selector de compañías
- dashboard
- layout base

## 2. Núcleo SaaS del super_admin
- Gestión de Empresas
- Ventana de Pago
- Ventana de Solicitudes

## 3. Configuración base reutilizable
### 1. Usuarios - roles y perfiles
Debe permitir:
- crear usuarios
- editar usuarios
- activar/inactivar usuarios
- listar usuarios
- buscar usuarios
- ver detalle
- asignar roles
- definir perfiles
- asociar perfiles a usuarios
- gestionar permisos asociados
- proteger usuarios críticos
- impedir eliminar el usuario inicial inamovible

### 2. Perfil de usuario / estilos visuales
Debe permitir:
- configurar preferencias visuales del usuario
- tema visual
- colores o apariencia si corresponde
- densidad visual
- configuraciones personales
- avatar o datos de perfil
- preferencias de interfaz

### 3. Perfil de empresa / branding de la empresa
Debe permitir:
- editar datos de empresa
- razón social
- run/rut
- dirección
- teléfonos
- correo
- representante legal
- branding corporativo
- logo
- colores corporativos
- nombre visible
- configuración visual de la empresa dentro del sistema

# OBJETIVO ESTRATÉGICO DE ESTA BASE
Aunque esta primera aplicación estará enfocada en taller, quiero que esta estructura sirva para todas las otras apps que tengo planificadas.

## Objetivo
Tener una base lista para reutilizar:
- login
- seguridad
- empresa
- usuarios
- roles
- perfiles
- branding
- dashboard
- layout
- configuraciones base

Así no tendré que volver a explicar ni reconstruir esta parte cada vez que quiera crear una nueva app.

# MULTIPERFIL Y SEGURIDAD
La arquitectura debe contemplar desde el inicio:
- usuarios
- roles
- perfiles
- permisos

## Regla funcional
- un usuario puede tener uno o más perfiles
- cada perfil puede tener acceso a distintos módulos
- los roles ayudan a agrupar responsabilidades
- los perfiles deben ser más operativos y modulares
- la seguridad debe ser escalable

## Ejemplos futuros
Esto servirá para:
- admin
- supervisor
- recepcionista
- mecánico
- ventas
- cliente
- soporte
- otros perfiles según futura app

# REGLAS IMPORTANTES DE NEGOCIO Y ARQUITECTURA
1. La app se llama Nexora.
2. El frontend será en Vue.js con Tailwind CSS.
3. El backend se mantiene con FastAPI y Node.js.
4. PostgreSQL será la base de datos principal.
5. Cada compañía será un schema en la base de datos.
6. El sistema iniciará con schema public y schema hernancius.
7. Debe existir una empresa base precargada llamada HrCastell Systems Core.
8. Debe existir un usuario inicial protegido e inamovible: hernan.castellanos@hrcastell.com
9. Ese usuario no podrá ser eliminado.
10. El propietario podrá ver e ingresar a todas las compañías registradas.
11. El desarrollo se hará por secciones cerradas.
12. No se avanza a otra sección hasta cerrar la actual con CRUD completo y funcional.
13. El dashboard y las configuraciones base serán la fundación de futuras apps.
14. La estructura debe ser reutilizable, modular y escalable.
15. La base inicial debe priorizar calidad arquitectónica por sobre velocidad de implementación.
16. Deben existir ventanas exclusivas para el super_admin.
17. El super_admin podrá gestionar comercialmente a todas las empresas registradas.
18. El super_admin podrá administrar convenios, tarifas, validación de pagos e historial de pagos.
19. Debe existir una Ventana de Solicitudes para centralizar empresas interesadas en contratar Nexora.
20. Toda solicitud aprobada podrá convertirse en futura empresa dentro del sistema.
21. Estas ventanas SaaS no deben ser visibles ni accesibles para administradores normales de compañía.

# ARQUITECTURA TÉCNICA SOLICITADA
Quiero que propongas una solución técnica profesional contemplando:

## En PostgreSQL
- schema global public
- schema inicial hernancius
- estrategia de aprovisionamiento de nuevos schemas
- tablas globales
- tablas por schema
- seeds iniciales
- relaciones mínimas
- mecanismo de protección de usuario inamovible

## En backend
- responsabilidades de FastAPI
- responsabilidades de Node.js
- autenticación
- autorización
- directorio central de compañías
- acceso a schemas
- servicios base reutilizables
- endpoints por módulo

## En frontend
- layout administrativo reusable
- login
- selector de compañías
- dashboard
- menú lateral
- sistema de navegación
- módulos de configuración
- vistas CRUD consistentes
- estructura de componentes reutilizables

# ORDEN DE IMPLEMENTACIÓN INICIAL
Quiero que trabajes esta solución por fases y por ventanas.

## FASE 1 — BASE DEL SISTEMA
1. arquitectura general
2. estructura multi-schema
3. seeds iniciales
4. usuario inamovible
5. login
6. selector de compañías del propietario
7. dashboard base
8. layout general

## FASE 2 — NÚCLEO SaaS DEL SUPER_ADMIN
1. Gestión de Empresas
2. Ventana de Pago
3. Ventana de Solicitudes

## FASE 3 — CONFIGURACIÓN BASE
1. Usuarios
2. Roles y perfiles
3. Perfil de usuario / estilos visuales
4. Perfil de empresa / branding

## Regla
Cada ventana debe quedar cerrada antes de pasar a la siguiente.


# REGLAS Y SKILLS DE RESPONSIVE DESIGN
La aplicación debe ser completamente responsiva y usable en:
- teléfono móvil
- tablet
- laptop
- desktop

## Regla general
No basta con que "se vea bien". Cada pantalla debe adaptarse funcionalmente al dispositivo para mantener claridad, velocidad de uso y buena experiencia de usuario.

## Breakpoints funcionales obligatorios
Define una estrategia clara de breakpoints, como mínimo para:
- mobile
- tablet
- desktop

Puedes proponer los valores exactos, pero la lógica de comportamiento debe quedar fijada desde la base del sistema.

## Regla para listados, tablas y grillas
Cuando una vista esté en tablet o desktop, podrá usar:
- tablas
- grillas
- columnas múltiples
- mayor densidad visual controlada

Pero cuando la vista esté en mobile:
- los registros no deben mantenerse como tabla compleja
- cada registro debe transformarse en una card
- la card debe mostrar solo la información más importante y resumida
- las acciones principales deben quedar visibles o fácilmente accesibles
- no se debe obligar al usuario a hacer scroll horizontal para operar

### Reglas específicas para mobile en listados
- prohibido usar tablas anchas que rompan la pantalla
- prohibido depender de scroll horizontal como solución principal
- cada item debe pasar a card resumida
- la card debe priorizar jerarquía visual, lectura rápida y acciones principales
- las acciones secundarias pueden ir en menú contextual si mejora la UX

## Regla para formularios
Cuando la vista esté en tablet o desktop:
- se pueden mostrar campos uno al lado del otro
- se pueden usar dos o más columnas si mejora la distribución
- se puede aprovechar el ancho disponible con criterio

Pero cuando la vista esté en mobile:
- solo puede existir un campo por fila
- no pueden existir dos columnas de campos una al lado de otra
- no pueden mostrarse inputs comprimidos para “hacer que quepan”
- cada campo debe ocupar el ancho disponible de forma limpia

### Reglas específicas para mobile en formularios
- un campo por fila
- labels legibles
- ayudas y errores claramente visibles
- botones grandes y táctiles
- separación vertical suficiente entre campos
- evitar saturación visual
- priorizar lectura y tap targets cómodos

## Regla para dashboard
El dashboard debe adaptarse por dispositivo:
- en desktop puede usar widgets en grilla
- en tablet puede usar grilla simplificada
- en mobile debe reorganizar widgets en una sola columna o distribución muy controlada

### En mobile:
- los widgets deben apilarse
- no debe haber bloques comprimidos ilegibles
- el contenido importante debe aparecer primero
- el menú lateral debe adaptarse a navegación mobile
- priorizar accesos rápidos y lectura clara

## Regla para navegación y layout
- el layout debe funcionar correctamente en desktop, tablet y mobile
- el menú lateral de desktop no debe romper la experiencia en mobile
- en mobile debe usarse navegación colapsable, drawer o patrón equivalente
- los headers, filtros, buscadores y acciones deben reorganizarse sin perder usabilidad
- no se deben dejar acciones críticas fuera de pantalla

## Regla para acciones y controles
Todos los elementos interactivos deben ser táctiles y cómodos en mobile:
- botones con tamaño adecuado
- espaciado suficiente
- selectores usables
- modales adaptados a viewport pequeño
- tabs, filtros y paginación revisados para uso táctil

## Regla para experiencia real por dispositivo
No quiero una adaptación superficial.
Quiero comportamiento responsive real:

### Desktop
- enfoque productivo
- más densidad visual
- grillas, tablas y paneles laterales

### Tablet
- transición intermedia
- menos densidad que desktop
- grillas simplificadas
- formularios más respirados
- acciones táctiles cómodas

### Mobile
- experiencia simplificada
- cards en vez de tablas
- una columna en formularios
- acciones claras
- navegación compacta
- foco en velocidad, legibilidad y operación táctil

## Criterio obligatorio de implementación
Cada ventana que se desarrolle debe validarse en:
1. desktop
2. tablet
3. mobile

Y no se considerará terminada hasta que funcione correctamente en los tres contextos.

## Regla de calidad responsive
Una ventana no está cerrada si:
- solo funciona bien en desktop
- en mobile conserva tablas incómodas
- en mobile usa formularios de dos columnas
- obliga a zoom manual
- obliga a scroll horizontal para operar
- reduce demasiado la legibilidad o la facilidad de uso

## Instrucción final de responsive design
Todas las ventanas y CRUDs de Nexora deben diseñarse mobile-friendly desde el inicio, aunque el desarrollo parta visualmente desde desktop administrativo.
El objetivo es que la app funcione perfectamente tanto en teléfono como en tablet y PC, sin sacrificar experiencia, legibilidad ni productividad.


# CRITERIOS DE CALIDAD
Cada ventana o módulo debe quedar con:
- CRUD completo
- validaciones
- mensajes de error claros
- UX consistente
- UI profesional
- endpoints definidos
- estructura de datos clara
- navegación integrada
- permisos considerados
- comportamiento óptimo

No quiero prototipos incompletos.
Quiero piezas terminadas, correctas y reutilizables.

# ENTREGABLES QUE QUIERO DE TI
Quiero que respondas construyendo esta solución de forma ordenada y detallada, entregando:
1. Arquitectura general de Nexora
2. Propuesta de multi-schema en PostgreSQL
3. Diseño del esquema public
4. Diseño del esquema hernancius
5. Seeds iniciales
6. Modelo de datos inicial
7. Flujo de login del propietario
8. Diseño del selector de compañías
9. Diseño del dashboard inicial
10. Estructura del layout administrativo
11. Plan de desarrollo por secciones
12. Diseño funcional de las primeras ventanas de configuración
13. CRUD esperado para:
   - usuarios
   - roles y perfiles
   - perfil de usuario / estilos visuales
   - perfil de empresa / branding
14. CRUD esperado para:
   - gestión de empresas
   - pagos
   - solicitudes
15. Estructura de carpetas frontend y backend
16. Endpoints base
17. Roadmap inicial por ventanas
18. Recomendaciones para dejar esta base preparada para futuras apps

# INSTRUCCIÓN FINAL
No quiero una respuesta genérica.

Quiero una solución realista, técnica, reutilizable y pensada como base de producto SaaS.

Debes pensar en Nexora como una plataforma madre para futuras aplicaciones, no solo como una app puntual de taller.

Prioriza:
- calidad de arquitectura
- reutilización
- base sólida
- separación por schemas
- orden de implementación
- cierres completos por ventana
- seguridad
- mantenibilidad
- escalabilidad

Comienza entregando:
1. arquitectura general
2. diseño de schemas iniciales
3. diseño del login del propietario
4. diseño del dashboard base
5. plan por secciones
6. definición de la primera ventana a construir
```

## Complemento opcional

```text
Quiero que trabajes como si este proyecto fuese un framework de producto reutilizable. No avances por amplitud, avanza por cierre funcional. Cada ventana debe quedar completamente resuelta antes de pasar a la siguiente. No sacrifiques arquitectura por velocidad. Cada decisión debe permitir que Nexora luego se reutilice en nuevas apps empresariales.
```
