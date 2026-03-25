# Nexora

Nexora es una plataforma SaaS modular y reutilizable, concebida como base para múltiples aplicaciones empresariales.  
La primera implementación estará orientada a la gestión de talleres, pero su arquitectura está diseñada para reutilizar autenticación, multicompañía, multiperfil, configuración visual, branding, dashboards, layouts y seguridad en futuras apps.

---

## Visión del proyecto

Nexora no se plantea como una app aislada, sino como una **plataforma madre** para construir nuevas soluciones empresariales sin partir desde cero.

La base común debe resolver desde el inicio:

- autenticación
- multicompañía
- multiperfil
- configuración visual
- configuración de empresa
- usuarios, roles y perfiles
- dashboards
- layouts base
- branding por empresa
- gestión comercial SaaS
- reglas de responsive design
- base reutilizable para futuros dominios de negocio

---

## Objetivo estratégico

El objetivo principal es construir una base sólida, mantenible y escalable para que futuras aplicaciones compartan una misma estructura técnica y funcional.

Esto permitirá reutilizar:

- login
- seguridad
- empresa
- usuarios
- roles
- perfiles
- permisos
- branding
- configuración visual
- dashboard
- layout
- reglas responsive
- núcleo comercial del SaaS

---

## Stack tecnológico oficial

### Frontend
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS

### Backend
- FastAPI
- Node.js

### Base de datos
- PostgreSQL

---

## Decisión tecnológica del frontend

La decisión oficial del proyecto para el frontend de Nexora es usar Vue como framework principal.

### Stack frontend aprobado
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS

### Regla de proyecto
No se cambiará a React para Nexora salvo que exista una necesidad técnica real, demostrable y aprobada previamente.

### Justificación
Vue queda definido como la base oficial del frontend porque:

- existe mayor dominio práctico del framework
- ya hay experiencia positiva en proyectos previos con Vue
- permite avanzar con más estabilidad y menos fricción
- se adapta muy bien a dashboards, paneles administrativos, CRUDs, layouts reutilizables y formularios complejos
- se integra correctamente con Tailwind CSS
- permite construir una base SaaS reutilizable con buena mantenibilidad

### Criterio arquitectónico
Para Nexora se prioriza:

- productividad real
- estabilidad del desarrollo
- mantenibilidad
- menor fricción técnica
- cierre completo de ventanas y módulos
- reutilización de la base frontend para futuras apps

---

## Principios de desarrollo

El desarrollo de Nexora se realizará por **secciones o ventanas**.

### Regla principal
No se avanza a la siguiente ventana o módulo hasta que la actual esté:

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

### Flujo de trabajo por ventana
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

---

## Arquitectura multicompañía

Nexora funcionará con un modelo **multicompañía por schema** en PostgreSQL.

### Regla principal
Cada compañía registrada tendrá su propio schema.

### Ejemplo inicial
- `public`
- `hernancius`

### Ejemplos futuros
- `empresa_x`
- `empresa_y`

### Objetivo
Aislar completamente la información de cada empresa a nivel de base de datos.

### Consideraciones técnicas
- el sistema parte con `public` y `hernancius`
- `public` funciona como esquema global o núcleo administrativo
- `hernancius` es el esquema inicial de la empresa base
- cada nueva empresa registrada debe crear automáticamente su propio schema
- el sistema debe aprovisionar automáticamente:
  - schema
  - tablas necesarias
  - configuración inicial
  - branding base
  - usuario administrador base
  - relaciones mínimas para operar

### Requisito de diseño
Debe existir una arquitectura profesional donde:

- exista un núcleo central en `public`
- exista trazabilidad de compañías
- exista un directorio central de acceso
- exista control de estados comerciales
- exista la capacidad de administrar compañías desde la misma app

---

## Firma digital del propietario

Nexora incorpora una firma estructural de propietario en el código para permitir que la misma plataforma sea utilizada como núcleo SaaS de administración de compañías registradas.

### Objetivos
- administrar las empresas registradas
- gestionar su acceso
- controlar sus condiciones de uso
- operar Nexora como producto SaaS propio

---

## Data inicial fundamental

El sistema debe crear desde el inicio una compañía base y un usuario inicial inamovible.

### Usuario inicial e inamovible
- **Correo:** `hernan.castellanos@hrcastell.com`
- **Contraseña inicial:** `N@nreh26*`

### Reglas
Este usuario:
- no podrá ser eliminado
- debe existir siempre
- será base del control del sistema
- tendrá acceso superior
- será parte de la estructura fundamental del producto

### Datos de la empresa inicial
- **Nombre empresa:** HrCastell Systems Core
- **RUN:** 24.848.246-k
- **Dirección:** Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana
- **Teléfono:** +56973126500
- **Correo:** hernan.castellanos@hrcastell.com

### Representante legal
- **Nombre:** Hernan Ricardo Castellanos Castillo
- **RUT:** 24.848.246-k
- **Dirección:** Av Vicuña Mackeena 2585, San Joaquín, Región Metropolitana
- **Teléfono:** +56973126500
- **Correo:** hernan.castellanos@hrcastell.com

### Requisitos de seguridad
- almacenar contraseña hasheada
- no exponer credenciales en frontend
- no registrar contraseñas en logs
- marcar el usuario como protegido / no eliminable
- marcar la empresa como empresa núcleo inicial del sistema
- considerar forzar cambio de contraseña al primer ingreso o en producción

---

## Estructura inicial de la aplicación

Nexora debe partir inicialmente con:

1. Login
2. Selector de compañías para el propietario
3. Dashboard base
4. Layout general
5. Base del módulo de configuración

---

## Flujo de login inicial del propietario

### Caso del propietario principal
Cuando se ingrese:

- correo: `hernan.castellanos@hrcastell.com`
- contraseña: `N@nreh26*`

el sistema debe permitir entrar a una ventana donde se muestren todas las compañías / esquemas de base de datos registrados en la plataforma.

### Desde esa ventana el propietario podrá:
- ver todas las compañías
- identificar sus esquemas
- ingresar a cualquiera de ellas
- elegir la compañía con la que quiere trabajar

### Estado inicial del sistema
Al inicio solo existirán:
- `public`
- `hernancius`

### Donde
- `public` es el esquema global
- `hernancius` es el esquema inicial de la compañía base

### Flujo esperado
1. ingreso correo y contraseña
2. el sistema detecta que es el propietario inicial
3. muestra una ventana con las compañías registradas
4. el propietario puede entrar a cualquiera de ellas
5. inicialmente entra por defecto a `hernancius`
6. al ingresar ve el dashboard

---

## Dashboard inicial

Una vez autenticado, el usuario verá un dashboard base.

### Layout esperado
- lado izquierdo: menú lateral
- lado derecho: área de contenido principal

### Debe incluir
- layout administrativo limpio
- widgets iniciales
- navegación base
- cabecera superior
- selector de contexto si aplica
- estructura reutilizable para futuras ventanas

### Objetivo
El dashboard debe funcionar como base administrativa reutilizable para todas las apps futuras del ecosistema Nexora.

---

## Enfoque de construcción inicial

Primero se construye la base transversal reutilizable del sistema antes de desarrollar todos los módulos específicos del taller.

### Orden de construcción
- base estructural
- ventanas núcleo
- CRUD completo por sección
- nuevos módulos de negocio

---

## Ventanas exclusivas del super_admin

Las siguientes ventanas solo son visibles y accesibles para el usuario super_admin inicial:

- `hernan.castellanos@hrcastell.com`

### Regla de seguridad
- solo el super_admin puede ver estas ventanas
- solo el super_admin puede consultar, crear, editar, aprobar, bloquear o gestionar información de estos módulos
- los administradores de compañía no deben tener acceso a estas vistas
- el backend debe validar permisos aunque alguien intente acceder manualmente por URL o endpoint
- estas ventanas pertenecen al núcleo SaaS de Nexora y no al dominio operativo de cada empresa

### Módulos exclusivos
1. Gestión de Empresas
2. Ventana de Pago
3. Ventana de Solicitudes

---

## Gestión de Empresas

Ventana exclusiva del super_admin orientada a la administración comercial y operativa de todas las empresas suscritas a Nexora.

### Objetivo
Gestionar todas las compañías registradas, sus condiciones de uso, estado comercial y acuerdos de pago.

### Debe permitir
- listar todas las empresas registradas
- ver detalle de cada empresa
- ver el schema asociado
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
- ver datos de contacto
- ver representante legal
- ver última actividad o último acceso administrativo

---

## Ventana de Pago

Submódulo dentro de Gestión de Empresas.

### Debe permitir
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

### Datos sugeridos
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

---

## Ventana de Solicitudes

Ventana exclusiva del super_admin orientada a la captación y gestión de potenciales clientes que deseen usar Nexora.

### Objetivo
Visualizar y gestionar las solicitudes provenientes del sitio web de Nexora para negociar tarifas, condiciones y eventual alta en la plataforma.

### Flujo esperado
1. una empresa interesada ingresa al sitio web de Nexora
2. completa un formulario de solicitud
3. la solicitud queda registrada en el sistema
4. el super_admin la visualiza en la Ventana de Solicitudes
5. revisa los datos
6. contacta al interesado
7. si existe acuerdo comercial, inicia el proceso de alta de empresa y creación de schema

### Debe permitir
- listar solicitudes recibidas
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
- región / ciudad
- cantidad estimada de usuarios
- comentario o necesidad principal
- interés o módulo principal requerido
- fecha de solicitud

### Estados sugeridos
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

---

## Configuración base reutilizable

Estas ventanas constituyen la base común para futuras apps.

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

---

## Multiperfil y seguridad

La arquitectura debe contemplar desde el inicio:
- usuarios
- roles
- perfiles
- permisos

### Reglas
- un usuario puede tener uno o más perfiles
- cada perfil puede tener acceso a distintos módulos
- los roles ayudan a agrupar responsabilidades
- los perfiles deben ser más operativos y modulares
- la seguridad debe ser escalable

### Ejemplos futuros
- admin
- supervisor
- recepcionista
- mecánico
- ventas
- cliente
- soporte
- otros perfiles según futura app

---

## Reglas y skills de responsive design

La aplicación debe ser completamente responsiva y usable en:
- teléfono móvil
- tablet
- laptop
- desktop

### Regla general
No basta con que “se vea bien”. Cada pantalla debe adaptarse funcionalmente al dispositivo para mantener claridad, velocidad de uso y buena experiencia de usuario.

### Breakpoints funcionales obligatorios
Definir como mínimo:
- mobile
- tablet
- desktop

La lógica de comportamiento debe quedar fijada desde la base del sistema.

### Regla para listados, tablas y grillas
En tablet o desktop se podrá usar:
- tablas
- grillas
- columnas múltiples
- mayor densidad visual controlada

En mobile:
- los registros no deben mantenerse como tabla compleja
- cada registro debe transformarse en una card
- la card debe mostrar solo la información importante y resumida
- las acciones principales deben quedar visibles o fácilmente accesibles
- no se debe obligar al usuario a hacer scroll horizontal para operar

### Reglas específicas para mobile en listados
- prohibido usar tablas anchas que rompan la pantalla
- prohibido depender de scroll horizontal como solución principal
- cada ítem debe pasar a card resumida
- la card debe priorizar jerarquía visual, lectura rápida y acciones principales
- las acciones secundarias pueden ir en menú contextual si mejora la UX

### Regla para formularios
En tablet o desktop:
- se pueden mostrar campos uno al lado del otro
- se pueden usar dos o más columnas si mejora la distribución
- se puede aprovechar el ancho disponible con criterio

En mobile:
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

### Regla para dashboard
El dashboard debe adaptarse por dispositivo:
- en desktop puede usar widgets en grilla
- en tablet puede usar grilla simplificada
- en mobile debe reorganizar widgets en una sola columna o distribución muy controlada

### En mobile
- los widgets deben apilarse
- no debe haber bloques comprimidos ilegibles
- el contenido importante debe aparecer primero
- el menú lateral debe adaptarse a navegación mobile
- priorizar accesos rápidos y lectura clara

### Regla para navegación y layout
- el layout debe funcionar correctamente en desktop, tablet y mobile
- el menú lateral de desktop no debe romper la experiencia en mobile
- en mobile debe usarse navegación colapsable, drawer o patrón equivalente
- los headers, filtros, buscadores y acciones deben reorganizarse sin perder usabilidad
- no se deben dejar acciones críticas fuera de pantalla

### Regla para acciones y controles
Todos los elementos interactivos deben ser táctiles y cómodos en mobile:
- botones con tamaño adecuado
- espaciado suficiente
- selectores usables
- modales adaptados a viewport pequeño
- tabs, filtros y paginación revisados para uso táctil

### Regla para experiencia real por dispositivo
#### Desktop
- enfoque productivo
- más densidad visual
- grillas, tablas y paneles laterales

#### Tablet
- transición intermedia
- menos densidad que desktop
- grillas simplificadas
- formularios más respirados
- acciones táctiles cómodas

#### Mobile
- experiencia simplificada
- cards en vez de tablas
- una columna en formularios
- acciones claras
- navegación compacta
- foco en velocidad, legibilidad y operación táctil

### Criterio obligatorio
Cada ventana debe validarse en:
1. desktop
2. tablet
3. mobile

No se considerará terminada hasta que funcione correctamente en los tres contextos.

### Una ventana no está cerrada si
- solo funciona bien en desktop
- en mobile conserva tablas incómodas
- en mobile usa formularios de dos columnas
- obliga a zoom manual
- obliga a scroll horizontal para operar
- reduce demasiado la legibilidad o la facilidad de uso

---

## Fases iniciales

### Fase 1 — Base del sistema
1. arquitectura general
2. estructura multi-schema
3. seeds iniciales
4. usuario inamovible
5. login
6. selector de compañías del propietario
7. dashboard base
8. layout general

### Fase 2 — Núcleo SaaS del super_admin
1. Gestión de Empresas
2. Ventana de Pago
3. Ventana de Solicitudes

### Fase 3 — Configuración base
1. Usuarios
2. Roles y perfiles
3. Perfil de usuario / estilos visuales
4. Perfil de empresa / branding

### Regla
Cada ventana debe quedar cerrada antes de pasar a la siguiente.

---

## Criterios de calidad

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

No se consideran válidos los prototipos incompletos.  
La meta es construir piezas terminadas, correctas y reutilizables.

---

## Roadmap inicial esperado

El proyecto debe poder entregar, como mínimo:

1. Arquitectura general de Nexora
2. Propuesta de multi-schema en PostgreSQL
3. Diseño del esquema `public`
4. Diseño del esquema `hernancius`
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

---

## Regla final de producto

Nexora debe pensarse como una plataforma madre para futuras aplicaciones, no solo como una app puntual de taller.

### Prioridades del proyecto
- calidad de arquitectura
- reutilización
- base sólida
- separación por schemas
- orden de implementación
- cierres completos por ventana
- seguridad
- mantenibilidad
- escalabilidad
- experiencia consistente en desktop, tablet y mobile

---

## Estado actual del proyecto

Este README documenta la visión, reglas, arquitectura y decisiones base de Nexora.  
A partir de aquí, el siguiente paso natural es separar en documentos específicos:

- prompt maestro del proyecto
- skills y reglas técnicas
- arquitectura frontend
- arquitectura backend
- diseño de schemas
- roadmap por fases
- definición funcional por ventana
