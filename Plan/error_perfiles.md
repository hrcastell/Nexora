Necesito corregir un problema en mi aplicación relacionado con el sistema de permisos, perfiles, roles, tenants y visibilidad de ventanas en el menú lateral.

Contexto general

La aplicación es multi-tenant. Cada vez que se crea un nuevo tenant, es decir, una nueva compañía, el sistema crea automáticamente un usuario por defecto para esa compañía.

Ese usuario creado por defecto tiene:

Rol: admin
Perfil: administrador de empresa

Yo, como propietario de la aplicación, tengo:

Rol: super_admin
Perfil con acceso total al sistema

El usuario super_admin debe ser el único con capacidad total para administrar la configuración global de permisos, incluyendo los permisos asignados al perfil administrador de empresa de cada tenant.

Problema actual

Actualmente, la ventana de perfiles permite configurar qué perfiles tienen acceso a qué ventanas dentro de cada módulo.

Sin embargo, el sistema no está aplicando correctamente esa configuración de permisos.

El perfil administrador de empresa debería tener únicamente los permisos que el super_admin le asigne desde la ventana de perfiles.

Por ejemplo, un perfil administrador de empresa no debería poder ver ni acceder a ventanas como:

Módulos
Reportes
Suscripciones
Solicitudes
Reportes administrativos
Cualquier otra ventana que el super_admin no le haya autorizado explícitamente

El problema es que, aunque se configure la restricción desde la ventana de perfiles, el sistema no está controlando correctamente qué puede ver, crear, editar, eliminar o administrar cada perfil.

Objetivo de la corrección

Necesito que se revise y corrija completamente la lógica de permisos para que el sistema funcione de la siguiente manera:

1. Control total del super_admin

El usuario con rol super_admin debe poder:

Ver todos los tenants
Ver todos los usuarios
Ver todos los roles
Ver todos los perfiles
Modificar los permisos de cualquier perfil
Modificar los permisos del perfil administrador de empresa
Asignar o quitar permisos de acceso a ventanas
Definir si un perfil puede ver, crear, editar, eliminar o administrar una ventana específica

Ningún usuario con rol admin debe tener más permisos que los asignados por el super_admin.

2. El perfil administrador de empresa debe obedecer su configuración de permisos

El usuario con rol admin y perfil administrador de empresa no debe tener acceso total por defecto.

Aunque sea administrador de su compañía, sus permisos deben depender estrictamente de la configuración asignada desde la ventana de perfiles.

El sistema debe validar para cada ventana y acción:

Si puede ver
Si puede crear
Si puede editar
Si puede eliminar
Si puede administrar

Por ejemplo:

Perfil: administrador de empresa
Ventana: Suscripciones
Permiso ver: false
Permiso crear: false
Permiso editar: false
Permiso eliminar: false
Permiso administrar: false

En este caso, el usuario administrador de empresa no debe:

Ver la opción Suscripciones en el menú lateral
Acceder a la ruta manualmente desde la URL
Crear registros relacionados con Suscripciones
Editar registros relacionados con Suscripciones
Eliminar registros relacionados con Suscripciones
Ejecutar acciones administrativas sobre Suscripciones
3. Ocultar ventanas no permitidas en el menú lateral

El menú lateral debe construirse dinámicamente según los permisos reales del perfil del usuario autenticado.

Si el perfil no tiene permiso ver sobre una ventana, esa ventana no debe aparecer en el menú lateral.

Ejemplo:

Si el perfil administrador de empresa no tiene permiso para ver:

Módulos
Reportes
Suscripciones
Solicitudes

Entonces esas opciones no deben aparecer en su menú lateral.

La regla debe ser:

Si permiso_ver = false, ocultar ventana del menú lateral.
Si permiso_ver = true, mostrar ventana en el menú lateral.

Esto debe aplicarse a todas las ventanas de todos los módulos.

4. Bloquear acceso directo por URL

No basta con ocultar la ventana en el menú lateral.

El sistema también debe impedir que un usuario acceda manualmente a una ruta escribiendo la URL en el navegador.

Antes de cargar cualquier ventana, el sistema debe validar:

¿El perfil del usuario tiene permiso ver sobre esta ventana?

Si no tiene permiso, debe redirigir a una página de acceso denegado o al dashboard principal.

Ejemplo:

/admin/suscripciones

Si el usuario no tiene permiso de ver la ventana Suscripciones, no debe poder entrar aunque escriba la URL directamente.

5. Validar permisos también en backend

Los permisos no deben depender únicamente del frontend.

Cada operación sensible debe validarse también en el backend.

Antes de ejecutar acciones como crear, editar, eliminar o administrar, el backend debe validar los permisos del perfil del usuario autenticado.

Reglas esperadas:

GET /suscripciones       requiere permiso ver
POST /suscripciones      requiere permiso crear
PUT /suscripciones/:id   requiere permiso editar
DELETE /suscripciones/:id requiere permiso eliminar
Acciones administrativas requieren permiso administrar

Si el perfil no tiene el permiso correspondiente, el backend debe responder con:

403 Forbidden

o una respuesta equivalente de acceso denegado.

Comportamiento esperado

El sistema debe funcionar así:

Caso 1: Usuario super_admin

El usuario super_admin debe tener acceso total a todas las ventanas y acciones, sin restricciones.

Debe poder configurar los permisos de cualquier perfil, incluyendo los perfiles de administradores de empresa de cualquier tenant.

Caso 2: Usuario admin con perfil administrador de empresa

El usuario administrador de empresa solo debe poder acceder a las ventanas y acciones que el super_admin haya autorizado desde la ventana de perfiles.

No debe tener acceso total automático por tener rol admin.

Su acceso debe depender de la combinación:

tenant + usuario + rol + perfil + permisos asignados
Caso 3: Ventana sin permiso de ver

Si una ventana tiene permiso ver = false para el perfil del usuario:

No debe aparecer en el menú lateral
No debe permitir acceso por URL
No debe permitir consultar datos de esa ventana desde el backend
Caso 4: Ventana con permiso de ver, pero sin permisos de acción

Si una ventana tiene:

ver = true
crear = false
editar = false
eliminar = false
administrar = false

Entonces el usuario puede entrar a la ventana, pero:

No debe ver botón de crear
No debe ver botón de editar
No debe ver botón de eliminar
No debe ver acciones administrativas
El backend también debe bloquear esas acciones si se intentan ejecutar manualmente
Validaciones técnicas necesarias

Revisar y corregir:

La creación automática del usuario administrador cuando se crea un tenant.
La asignación del perfil administrador de empresa.
La relación entre usuario, rol, perfil, tenant, módulo, ventana y permisos.
La consulta que obtiene los permisos del usuario autenticado.
La lógica que construye el menú lateral.
Los guards, middlewares o validadores de rutas del frontend.
Los middlewares o policies del backend.
Las validaciones para operaciones crear, editar, eliminar y administrar.
La persistencia correcta de los permisos configurados desde la ventana de perfiles.
Que el rol admin no salte por encima de los permisos del perfil.
Regla principal del sistema

La regla central debe ser esta:

El rol define el tipo general de usuario, pero el perfil define los permisos específicos sobre módulos, ventanas y acciones.

Por lo tanto:

Un usuario con rol admin NO debe tener acceso total automático.
Un usuario con rol admin solo debe acceder a lo que su perfil tenga permitido.
Un usuario con rol super_admin sí debe tener acceso total global.
Resultado esperado

Después de la corrección:

El super_admin podrá administrar todos los permisos.
El perfil administrador de empresa obedecerá exactamente los permisos configurados.
Las ventanas sin permiso de ver no aparecerán en el menú lateral.
Las rutas estarán protegidas contra acceso manual.
El backend validará cada acción sensible.
Los permisos de crear, editar, eliminar y administrar se aplicarán correctamente.
El sistema respetará la configuración realizada desde la ventana de perfiles.
Criterios de aceptación

La corrección se considera exitosa si se cumple lo siguiente:

Un super_admin puede modificar los permisos de cualquier perfil.
Un usuario admin con perfil administrador de empresa no puede ver ventanas no autorizadas.
Las ventanas no autorizadas no aparecen en el menú lateral.
El usuario no puede acceder por URL directa a ventanas sin permiso.
Los botones de crear, editar, eliminar y administrar solo aparecen si el perfil tiene esos permisos.
El backend responde con acceso denegado cuando se intenta ejecutar una acción sin permiso.
La configuración realizada desde la ventana de perfiles se aplica inmediatamente o después de refrescar sesión/permisos.
El rol admin no concede permisos automáticos por encima del perfil.
El rol super_admin conserva acceso total global.
El comportamiento funciona correctamente para tenants nuevos y existentes.

También puedes agregar esta instrucción final al prompt:

Analiza el flujo completo de permisos desde la base de datos hasta el frontend y backend. No corrijas únicamente la visibilidad del menú. La solución debe garantizar seguridad real, validando permisos tanto en frontend como en backend. El objetivo es que cada perfil vea y ejecute únicamente lo que tiene autorizado desde la ventana de perfiles.