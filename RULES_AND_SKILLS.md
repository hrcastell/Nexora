# RULES_AND_SKILLS.md — Nexora

## Propósito
Este documento define las reglas técnicas, restricciones operativas, habilidades requeridas y criterios de implementación para el proyecto Nexora, considerando el entorno real de despliegue y mantenimiento disponible.

---

## 1. Restricciones reales del entorno

Nexora debe diseñarse e implementarse considerando estas limitaciones reales de infraestructura:

### Hosting
- proveedor: Bluehost
- acceso principal al servidor mediante cPanel
- cuenta de hosting compartida
- entorno con permisos limitados

### Restricciones del servidor
- no se dispone de acceso a terminal o shell
- no se pueden instalar paquetes del sistema operativo
- no se pueden compilar dependencias nativas en servidor
- no se pueden usar procesos de administración avanzados fuera de lo que permita cPanel
- el backend debe adaptarse al mecanismo disponible en `Setup Node.js App`

### Base de datos
- motor: PostgreSQL
- versión: 10.23
- acceso a la base de datos exclusivamente mediante phpPgAdmin
- no se podrán usar herramientas externas de administración conectadas directamente a producción
- no se podrán instalar extensiones de PostgreSQL
- no se debe depender de features no compatibles con PostgreSQL 10.23
- toda migración o script debe pensarse para ejecutarse en este contexto restringido

### Consecuencias prácticas
- el proyecto debe minimizar dependencias complejas
- el proyecto debe minimizar automatizaciones que requieran CLI obligatoria en producción
- el proyecto debe poder desplegarse y mantenerse con cPanel + Node.js setup + phpPgAdmin
- la base de datos debe administrarse con scripts SQL claros, ordenados y compatibles con phpPgAdmin
- el backend no debe asumir infraestructura dedicada ni acceso root

---

## 2. Regla principal de arquitectura

La arquitectura de Nexora debe adaptarse a un entorno de producción limitado.

### Regla obligatoria
Toda decisión técnica debe responder a esta pregunta:

**¿Esto se puede desplegar, mantener y corregir en Bluehost compartido usando cPanel, Setup Node.js App y phpPgAdmin?**

Si la respuesta es no, esa decisión debe evitarse o replantearse.

---

## 3. Reglas de compatibilidad del backend

## 3.1 Node.js en hosting compartido
El backend debe diseñarse para ejecutarse correctamente bajo el esquema de Node.js disponible en cPanel.

### Reglas
- evitar arquitecturas que dependan de múltiples procesos coordinados
- evitar colas complejas que requieran servicios adicionales
- evitar dependencias nativas difíciles de compilar
- evitar herramientas que requieran supervisores externos tipo PM2 si no están disponibles
- priorizar un backend simple, modular y estable

### Recomendación
Para producción, el backend debe ser:
- predecible
- liviano
- con pocas dependencias
- fácil de reiniciar desde cPanel
- fácil de diagnosticar por logs simples

## 3.2 FastAPI + Node.js
Como el entorno está limitado, se debe evaluar con criterio la convivencia entre FastAPI y Node.js.

### Regla sugerida
Si mantener dos backends complica el despliegue en Bluehost compartido, se debe priorizar una arquitectura reducida y realista.

### Criterio
- si FastAPI y Node.js pueden convivir sin fricción real, se documenta claramente su responsabilidad
- si la operación se vuelve compleja por el entorno, se debe simplificar
- el proyecto no debe complicarse por arquitectura innecesaria

### Recomendación práctica
En entorno compartido, conviene evaluar si el backend principal debe quedar concentrado en una sola tecnología operativa cuando llegue la etapa de implementación real.

---

## 4. Reglas de compatibilidad con PostgreSQL 10.23

### Reglas obligatorias
- no usar características exclusivas de versiones modernas de PostgreSQL que no estén garantizadas en 10.23
- no depender de extensiones
- no asumir funciones avanzadas no disponibles
- no diseñar migraciones que requieran herramientas externas obligatorias
- todo SQL debe poder ejecutarse de forma controlada desde phpPgAdmin

### Reglas de diseño SQL
- scripts SQL separados por etapas
- scripts pequeños y trazables
- evitar scripts gigantes difíciles de corregir manualmente
- usar nombres claros y consistentes
- documentar orden exacto de ejecución
- incluir scripts de rollback cuando sea razonable
- evitar cambios destructivos sin respaldo previo

### Recomendación
Mantener una carpeta de SQL organizada así:
- `sql/00_core/`
- `sql/01_public_schema/`
- `sql/02_company_template/`
- `sql/03_seeds/`
- `sql/04_patches/`

---

## 5. Reglas de despliegue

### Regla general
El despliegue debe ser manualmente viable a través de cPanel.

### Arquitectura de Despliegue (cPanel)
El proyecto se dividirá en subdominios y directorios específicos dentro del hosting:

1. **Website Principal (Futuro):**
   - **URL:** `nexoragarage.hrcastell.com`
   - **Directorio:** `public_html/nexoragarage.hrcastell.com`

2. **Panel Administrativo (Frontend Vue):**
   - **URL:** `admin.nexoragarage.hrcastell.com`
   - **Directorio:** `public_html/admin.nexoragarage.hrcastell.com`
   - *Nota:* Aquí se subirán los archivos generados por `npm run build`.

3. **Backend API (Node.js):**
   - **URL Pública:** `api.nexoragarage.hrcastell.com`
   - **Directorio Raíz del Subdominio:** `public_html/api.nexoragarage.hrcastell.com`
   - **Directorio Real de la App Node.js:** `/home/hernanci/apps/nexoragarage-api`
   - *Nota:* Las variables de entorno para el backend deben configurarse directamente en la interfaz de "Setup Node.js App" en cPanel.

### Reglas
- no depender de pipelines complejos para poner la app en producción
- no depender de Docker
- no depender de servicios externos que no estén garantizados
- no depender de tareas post-deploy vía terminal
- cada release debe poder publicarse mediante carga de archivos y configuración desde cPanel si fuera necesario

### Recomendaciones
- build frontend listo para subir
- backend empaquetado de forma clara
- variables de entorno mínimas y documentadas
- pasos de despliegue escritos en un instructivo
- estructura de archivos consistente

---

## 6. Reglas de logs y diagnóstico

Como el entorno es limitado, el diagnóstico debe ser simple.

### Reglas
- registrar errores de forma clara
- evitar logs excesivamente verbosos en producción
- registrar errores críticos con contexto suficiente
- no registrar datos sensibles
- los mensajes de error deben ayudar a detectar:
  - fallo de conexión a BD
  - fallo de configuración
  - fallo de permisos
  - fallo de rutas
  - fallo de validación

### Recomendación
Mantener:
- logs simples
- mensajes claros
- códigos de error identificables
- separación entre error técnico y mensaje amigable al usuario

---

## 7. Reglas de seguridad

### Reglas obligatorias
- contraseñas siempre hasheadas
- nunca guardar credenciales en texto plano
- no exponer secretos en frontend
- no exponer datos sensibles en logs
- validar permisos en backend, no solo en frontend
- proteger el usuario inicial inamovible
- proteger acceso a módulos de super_admin
- aislar compañías por schema
- validar siempre el contexto de compañía activa

### Reglas adicionales
- usar variables de entorno para secretos
- documentar rotación de credenciales
- controlar sesiones
- manejar expiración o invalidación de tokens
- evitar endpoints abiertos innecesarios

---

## 8. Reglas de frontend

## 8.1 Stack oficial
El frontend oficial de Nexora es:
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS

## 8.2 Regla principal
El frontend debe ser:
- modular
- mantenible
- responsivo
- reutilizable
- claro de navegar
- coherente entre módulos

## 8.3 Regla de componentes
- priorizar componentes reutilizables
- separar componentes de dominio y componentes base
- evitar duplicación de formularios y tablas
- crear patrones de cards, tablas, filtros, modales, estados vacíos y formularios

---

## 9. Reglas de responsive design

La app debe funcionar correctamente en:
- mobile
- tablet
- desktop

### Reglas obligatorias
- en mobile los listados deben pasar de tabla a card cuando sea necesario
- en mobile los formularios deben usar una sola columna
- no usar scroll horizontal como solución principal
- los botones y acciones deben ser táctiles y cómodos
- cada ventana debe validarse en desktop, tablet y mobile

### Regla de cierre
Una ventana no está terminada si solo funciona bien en desktop.

---

## 10. Reglas de UX/UI

### Principios
- claridad primero
- velocidad de operación
- lectura simple
- consistencia visual
- jerarquía de información
- acciones importantes visibles

### Reglas
- mantener layouts consistentes
- no saturar pantallas administrativas
- usar estados vacíos bien definidos
- mostrar mensajes de error comprensibles
- mostrar feedback claro en guardado, edición, eliminación y validación
- priorizar legibilidad sobre densidad

---

## 11. Reglas de CRUD

Cada ventana con CRUD debe incluir como mínimo:

- listado
- búsqueda
- filtros
- creación
- edición
- cambio de estado si aplica
- validaciones
- mensajes de éxito y error
- control de permisos
- comportamiento responsivo
- navegación integrada

### Regla de cierre
No se pasa a otra ventana hasta que la actual tenga CRUD completo y usable.

---

## 12. Reglas de base de datos por schema

### Regla principal
Cada compañía es un schema.

### Reglas
- `public` contiene el núcleo global
- cada empresa operativa tiene su propio schema
- los datos nunca se mezclan entre compañías
- la creación de una nueva compañía debe seguir una estructura repetible
- los scripts para nuevos schemas deben ser claros y consistentes

### Recomendación de estructura
- tablas globales en `public`
- tablas operativas por compañía en cada schema
- naming convention estable para schemas y tablas

---

## 13. Reglas para scripts SQL y seeds

### Reglas
- un script por responsabilidad
- nombres claros
- orden fijo
- documentar dependencias entre scripts
- incluir seeds iniciales mínimos
- separar seed estructural de seed demostrativo
- no mezclar cambios de estructura con datos temporales

### Seed obligatorio
Debe existir un seed inicial para:
- empresa base
- schema `hernancius`
- usuario inicial inamovible
- datos base mínimos del sistema

---

## 14. Habilidades técnicas prioritarias para este proyecto

Estas son las habilidades más valiosas para desarrollar Nexora en este entorno:

### Backend
- diseño de APIs limpias
- validación robusta
- manejo claro de errores
- diseño modular
- SQL sólido y compatible con PostgreSQL 10.23
- comprensión de restricciones de hosting compartido
- diseño de autenticación y permisos

### Base de datos
- modelado relacional
- diseño multi-schema
- scripts SQL trazables
- administración manual segura desde phpPgAdmin
- criterio para compatibilidad con PostgreSQL 10

### Frontend
- Vue 3 con Composition API
- TypeScript
- Pinia
- formularios complejos
- layouts administrativos
- responsive real
- componentes reutilizables
- UX de panel administrativo

### Proyecto
- disciplina de desarrollo por ventanas
- criterio de priorización
- documentación clara
- control de alcance
- cierre completo antes de avanzar

---

## 15. Habilidades no técnicas pero críticas

### Muy recomendadas
- disciplina de documentación
- diseño incremental
- criterio para simplificar
- paciencia para estabilizar antes de ampliar
- control de deuda técnica
- foco en mantenibilidad
- capacidad de pensar en producto y no solo en código

---

## 16. Recomendaciones concretas para optimizar tu desarrollo

## 16.1 Simplificar el backend en producción
Dado tu entorno, evita complejidad innecesaria.
Todo lo que exija infraestructura especial debe cuestionarse.

## 16.2 Estandarizar SQL
Mantén scripts SQL manuales, ordenados y versionados.
Eso será clave porque usarás phpPgAdmin.

## 16.3 Diseñar primero `public` y `hernancius`
Antes de expandir módulos, cierra bien:
- schema global
- schema base
- seed inicial
- autenticación
- selector de compañías
- dashboard

## 16.4 Crear patrones UI desde el inicio
Define temprano:
- tabla desktop
- card mobile
- formulario estándar
- modal estándar
- page header estándar
- botón primario/secundario
- empty state
- mensajes de validación

## 16.5 Evitar dependencias frágiles
Mientras más simple sea la base, más viable será mantenerla en hosting compartido.

## 16.6 Documentar todo como si mañana tuvieras que reinstalar desde cero
Esto es clave en un entorno limitado.

Debes tener:
- README
- prompt maestro
- reglas y skills
- scripts SQL ordenados
- instructivo de despliegue
- instructivo de creación de schema
- instructivo de seeds iniciales

---

## 17. Reglas de decisión técnica

Cuando exista una duda técnica, priorizar en este orden:

1. compatibilidad con Bluehost compartido
2. compatibilidad con cPanel
3. compatibilidad con Setup Node.js App
4. compatibilidad con PostgreSQL 10.23 y phpPgAdmin
5. mantenibilidad real
6. simplicidad operativa
7. calidad arquitectónica
8. velocidad de desarrollo

### Regla
No elegir una tecnología o enfoque solo porque es más moderno si complica el entorno real.

---

## 18. Regla final del proyecto

Nexora debe construirse con criterio de producto real, pero aterrizado a un entorno técnico limitado.

### Esto significa:
- arquitectura buena, pero viable
- diseño limpio, pero mantenible
- modularidad, pero sin sobreingeniería
- escalabilidad, pero sin depender de infraestructura que hoy no existe
- calidad alta, pero compatible con tu forma real de operar

La mejor arquitectura para Nexora no es la más compleja.
Es la que puedes desarrollar, desplegar, mantener y evolucionar correctamente con los recursos y restricciones actuales.
