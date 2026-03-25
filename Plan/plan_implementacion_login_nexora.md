# Plan de Implementación del Login

## Épica
**AUTH-01 · Login multiempresa y multiperfil con onboarding de solicitud**

## Objetivo
Implementar el login aprobado con el siguiente flujo:

1. El usuario ingresa su correo.
2. El sistema detecta automáticamente las empresas o esquemas asociados.
3. El usuario selecciona la empresa.
4. El sistema solicita la clave según la empresa elegida.
5. El sistema muestra los perfiles disponibles.
6. El usuario ingresa con el perfil seleccionado.
7. La opción de registro abre el onboarding tipo wizard.
8. La solicitud queda pendiente para revisión del `super_admin`.

---

## Alcance funcional
Incluye:

- Detección de usuario por correo.
- Listado de empresas o esquemas asociados.
- Validación de contraseña por esquema.
- Selección de perfil posterior a autenticación.
- Redirección al dashboard según perfil.
- Acceso a registro mediante wizard.
- Almacenamiento de solicitud.
- Mensaje de confirmación al solicitante.
- Bandeja de revisión para `super_admin`.

No incluye en esta etapa:

- Recuperación de contraseña.
- MFA.
- Notificación automática por correo real.
- SSO.
- Auditoría avanzada.

---

## Fase 1 · Definición técnica y contratos
### Objetivo
Cerrar cómo se conectará frontend, backend y base de datos.

### Tareas
#### Backend
- Definir estrategia de búsqueda de usuario por correo en múltiples esquemas.
- Definir contrato de respuesta para detección de empresas.
- Definir contrato de login por empresa.
- Definir contrato de perfiles por usuario.
- Definir contrato de creación de solicitud onboarding.

#### Frontend
- Mapear flujo UI a estados reales.
- Definir estructura de pantallas y pasos.
- Definir modelo de errores y loading.

### Entregable
Documento técnico breve con endpoints, payloads y respuestas.

### Estimación
- Backend: 4 h
- Frontend: 3 h

---

## Fase 2 · Modelo de datos y seguridad base
### Objetivo
Preparar persistencia mínima para soportar login y solicitudes.

### Tareas
#### Base de datos
- Validar tabla o estructura central para detección de correo.
- Definir relación usuario ↔ empresa/schema.
- Definir relación usuario ↔ perfiles.
- Crear estructura `onboarding_requests`.
- Crear estados de solicitud: `pendiente`, `en_revision`, `aprobada`, `rechazada`.

#### Seguridad
- Definir política de sesión.
- Definir emisión de token con empresa y perfil activos.
- Validar que el perfil no pueda ser falsificado desde frontend.

### Entregable
Scripts SQL y reglas de seguridad básicas.

### Estimación
- Backend/DB: 6 h

---

## Fase 3 · Backend del login multiempresa
### Objetivo
Construir la lógica real del acceso.

### Historias
- **HU-01** Detectar empresas por correo.
- **HU-02** Validar clave según empresa elegida.
- **HU-03** Obtener perfiles disponibles.
- **HU-04** Crear sesión con perfil activo.

### Endpoints sugeridos
- `POST /auth/discover-companies`
  - Entrada: `email`
  - Salida: empresas o esquemas asociados.

- `POST /auth/validate-password`
  - Entrada: `email`, `schema`, `password`
  - Salida: login válido y perfiles disponibles.

- `POST /auth/select-profile`
  - Entrada: `userId`, `schema`, `profile`
  - Salida: token o contexto de sesión.

- `GET /auth/me`
  - Salida: usuario, empresa activa, perfil activo y permisos.

### Tareas backend
- Búsqueda segura por correo.
- Validación de clave por empresa.
- Carga de perfiles.
- Generación de token con `schema`, `companyId`, `profile`.
- Manejo de errores:
  - correo no encontrado,
  - sin empresas asociadas,
  - contraseña inválida,
  - usuario sin perfiles,
  - empresa inactiva.

### Estimación
- Backend: 14 h

---

## Fase 4 · Frontend del login por pasos
### Objetivo
Conectar el diseño aprobado con lógica real.

### Historias
- **HU-05** Ingresar correo y detectar empresas.
- **HU-06** Elegir empresa antes de escribir clave.
- **HU-07** Validar clave y mostrar perfiles.
- **HU-08** Entrar con perfil seleccionado.

### Tareas frontend
- Conectar paso 1 con `discover-companies`.
- Poblar lista de empresas dinámicamente.
- Bloquear paso 3 hasta tener empresa seleccionada.
- Conectar validación de clave.
- Mostrar perfiles reales.
- Guardar sesión.
- Redirigir al dashboard.
- Mostrar estados:
  - loading,
  - error,
  - sin resultados,
  - sesión creada.

### Estimación
- Frontend: 16 h

---

## Fase 5 · Onboarding tipo wizard y solicitudes
### Objetivo
Habilitar el botón “Registrarme” con persistencia real.

### Historias
- **HU-09** Abrir wizard de registro.
- **HU-10** Registrar solicitud.
- **HU-11** Mostrar mensaje de confirmación.
- **HU-12** Permitir revisión por `super_admin`.

### Tareas backend
- `POST /onboarding/request`
- `GET /admin/onboarding-requests`
- `PATCH /admin/onboarding-requests/:id/status`

### Tareas frontend
- Transformar el modal actual en wizard real.
- Validar campos por paso.
- Enviar solicitud.
- Mostrar mensaje: “Su solicitud será revisada y se le notificará a la brevedad.”

### Estimación
- Backend: 10 h
- Frontend: 14 h

---

## Fase 6 · Roles, permisos y navegación
### Objetivo
Asegurar que el perfil elegido gobierne la experiencia.

### Tareas
- Definir matriz perfil → módulos.
- Cargar permisos al iniciar sesión.
- Ocultar menús según perfil.
- Asegurar acceso restringido para `super_admin`.
- Soportar cambio de perfil futuro sin rehacer autenticación.

### Estimación
- Backend: 6 h
- Frontend: 8 h

---

## Fase 7 · QA, pruebas y cierre
### Objetivo
Entregar el login listo para integrarse al proyecto.

### Casos mínimos
- Correo con 1 empresa.
- Correo con varias empresas.
- Correo inexistente.
- Contraseña inválida.
- Usuario sin perfiles.
- Perfil `super_admin`.
- Solicitud onboarding enviada correctamente.
- Acceso denegado por empresa inactiva.

### Tareas
- Pruebas unitarias de helpers y validaciones.
- Pruebas de integración de endpoints.
- Pruebas manuales de flujo completo.
- Revisión visual responsive desktop y tablet.
- Validación de sesión y logout.

### Estimación
- QA y ajustes: 10 h

---

## Resumen de esfuerzo estimado
### Backend
- Fase 1: 4 h
- Fase 2: 6 h
- Fase 3: 14 h
- Fase 5: 10 h
- Fase 6: 6 h

**Total backend: 40 h**

### Frontend
- Fase 1: 3 h
- Fase 4: 16 h
- Fase 5: 14 h
- Fase 6: 8 h

**Total frontend: 41 h**

### QA y cierre
- 10 h

**Total general estimado: 91 h**

---

## Propuesta para la planificación
### Sprint 1 · Base de autenticación
- Definición técnica.
- Modelo de datos.
- Detección de empresas.
- Validación de clave.
- Selección de perfil.
- Integración frontend login.

**Meta:** login funcional sin onboarding completo.

### Sprint 2 · Registro y cierre
- Wizard de registro.
- Persistencia de solicitudes.
- Bandeja `super_admin`.
- Permisos.
- QA y hardening.

**Meta:** flujo completo de acceso y solicitud.

---

## Criterios de aceptación
- El correo detecta empresas asociadas.
- El usuario no escribe clave hasta elegir empresa.
- La clave se valida contra la empresa seleccionada.
- Tras autenticación se muestran perfiles reales.
- `super_admin` aparece por defecto cuando corresponda.
- El registro abre el wizard.
- La solicitud queda guardada para revisión.
- El usuario ve el mensaje de confirmación definido.
- El sistema redirige correctamente según perfil.

---

## Recomendación técnica
Para que este módulo crezca de forma ordenada, se recomienda implementar:

- un `AuthService` en backend,
- un `SessionContext` o `AuthStore` en frontend,
- una máquina de estados simple para el login por pasos,
- endpoints separados por responsabilidad, evitando un login monolítico.

